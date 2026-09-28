// Reads a curriculum PDF on this device (nothing is uploaded), using pdf.js.
// pdf.js is loaded only when you import a PDF.

import { parseCurriculumHtml, type ParseResult } from './parseCurriculum';
import { pdfLayoutToHtml, type PdfPage, type PdfRule, type PdfTextItem } from './pdfLayout';

// The parts of pdf.js we use (the browser build and the Node build in tests share them).
interface PdfJs {
  getDocument: (src: { data: Uint8Array; isEvalSupported?: boolean }) => { promise: Promise<PdfDoc>; destroy: () => Promise<void> };
  OPS: Record<string, number>;
}
interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfPageProxy>;
}
interface PdfPageProxy {
  view: number[];
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  getTextContent: () => Promise<{ items: ({ str: string; transform: number[]; width: number; height: number; fontName: string } | { type: string })[] }>;
  commonObjs: { get: (id: string) => { name?: string } | undefined };
}

type Matrix = [number, number, number, number, number, number];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Words (with position, size and boldness) and drawn lines for every page. */
export async function extractPdfPages(pdfjs: PdfJs, data: ArrayBuffer | Uint8Array): Promise<PdfPage[]> {
  const task = pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false });
  const doc = await task.promise;
  const pages: PdfPage[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const [x0, y0, x1, y1] = page.view;
      const width = x1 - x0;
      const height = y1 - y0;

      // Drawn lines: follow the transformation matrix and keep each path's bounding box.
      const ops = await page.getOperatorList();
      const rules: PdfRule[] = [];
      let ctm: Matrix = [1, 0, 0, 1, 0, 0];
      const stack: Matrix[] = [];
      ops.fnArray.forEach((fn, i) => {
        const args = ops.argsArray[i];
        if (fn === pdfjs.OPS.save) stack.push(ctm);
        else if (fn === pdfjs.OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (fn === pdfjs.OPS.transform) ctm = multiply(ctm, args as unknown as Matrix);
        else if (fn === pdfjs.OPS.constructPath) {
          const box = args[2] as Record<number, number> | number[] | undefined;
          if (!box) return;
          const [ax, ay] = apply(ctm, box[0], box[1]);
          const [bx, by] = apply(ctm, box[2], box[3]);
          const r = { x1: Math.min(ax, bx), y1: Math.min(ay, by), x2: Math.max(ax, bx), y2: Math.max(ay, by) };
          const w = r.x2 - r.x1;
          const h = r.y2 - r.y1;
          if (w > width * 0.9 && h > height * 0.9) return; // the page background
          if (h <= 3 || w <= 3) rules.push(r);
          else {
            // A filled or outlined rectangle (e.g. a cell): use its four edges.
            rules.push({ ...r, y2: r.y1 }, { ...r, y1: r.y2 }, { ...r, x2: r.x1 }, { ...r, x1: r.x2 });
          }
        }
      });

      // Words. Font names are known once the page's operators have loaded.
      const text = await page.getTextContent();
      const boldFont = new Map<string, boolean>();
      const isBold = (fontName: string) => {
        if (!boldFont.has(fontName)) {
          let name = '';
          try {
            name = page.commonObjs.get(fontName)?.name ?? '';
          } catch {
            /* font not loaded */
          }
          boldFont.set(fontName, /bold|black|heavy|semibold|demi/i.test(name));
        }
        return boldFont.get(fontName)!;
      };
      const items: PdfTextItem[] = [];
      for (const it of text.items) {
        if (!('str' in it) || !it.str) continue;
        const [a, b, , , x, y] = it.transform;
        items.push({ str: it.str, x, y, width: it.width, size: Math.hypot(a, b) || it.height, bold: isBold(it.fontName) });
      }
      pages.push({ width, height, items, rules });
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

export async function readCurriculumPdfFile(file: File): Promise<ParseResult> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pages = await extractPdfPages(pdfjs as unknown as PdfJs, await file.arrayBuffer());
  const result = parseCurriculumHtml(pdfLayoutToHtml(pages));
  result.notes.unshift('Read from a PDF: check the lesson counts before importing.');
  return result;
}
