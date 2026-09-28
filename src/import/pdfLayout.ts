// Rebuilds a document's structure from a PDF page layout, so a curriculum
// exported as PDF can go through the same reader as a Word document.
//
// A PDF only stores words and where they sit on the page. We recover:
//   • headings        — from font size (the size used by "Kindergarten" /
//                       "Grades 2–4"… is level 2; bigger is 1; smaller is 3)
//   • bold lead-ins   — e.g. "Module 3: Food (Nov)." at the start of a paragraph
//   • paragraphs      — lines of body text close together
//   • tables          — from the cell borders drawn on the page; a table that
//                       continues onto the next page is joined back together
// Tables without visible borders can't be recovered reliably; they come out as text.

export interface PdfTextItem {
  str: string;
  /** Left edge, baseline (PDF units, y grows upwards). */
  x: number;
  y: number;
  width: number;
  size: number;
  bold: boolean;
}

/** A thin line or rectangle edge drawn on the page. */
export interface PdfRule {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PdfPage {
  width: number;
  height: number;
  items: PdfTextItem[];
  rules: PdfRule[];
}

const TOL = 2.5;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Section names the curriculum reader looks for at heading level 2. */
const LEVEL2_NAMES = /^(how this curriculum works|lesson frameworks|kindergarten|grades \d\s*[–-]\s*\d|games bank|resources)$/i;

interface Line {
  y: number;
  x: number;
  size: number;
  items: PdfTextItem[];
}

interface Cell {
  lines: Line[];
}

interface Table {
  top: number;
  bottom: number;
  left: number;
  cols: number;
  rows: Cell[][];
}

type Block = { kind: 'line'; line: Line } | { kind: 'table'; table: Table };

// ─── Lines ──────────────────────────────────────────────────────────────

function toLines(items: PdfTextItem[]): Line[] {
  const sorted = [...items].filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(1.5, it.size * 0.3));
    if (line) line.items.push(it);
    else lines.push({ y: it.y, x: it.x, size: it.size, items: [it] });
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    l.x = l.items[0].x;
    l.size = Math.max(...l.items.map((i) => i.size));
  }
  return lines.sort((a, b) => b.y - a.y || a.x - b.x);
}

/** Join a line's words, adding spaces where the gap between items is wide enough. */
function lineText(line: Line, bold?: boolean): string {
  let out = '';
  let prevEnd: number | null = null;
  for (const it of line.items) {
    if (bold !== undefined && it.bold !== bold) continue;
    if (prevEnd !== null && it.x - prevEnd > it.size * 0.15 && !out.endsWith(' ') && !it.str.startsWith(' ')) out += ' ';
    out += it.str;
    prevEnd = it.x + it.width;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// ─── Tables from borders ─────────────────────────────────────────────────

interface Seg {
  horizontal: boolean;
  pos: number; // y for horizontal, x for vertical
  from: number;
  to: number;
}

function segments(rules: PdfRule[]): Seg[] {
  const out: Seg[] = [];
  for (const r of rules) {
    const w = Math.abs(r.x2 - r.x1);
    const h = Math.abs(r.y2 - r.y1);
    if (h <= 3 && w >= 6) out.push({ horizontal: true, pos: (r.y1 + r.y2) / 2, from: Math.min(r.x1, r.x2), to: Math.max(r.x1, r.x2) });
    else if (w <= 3 && h >= 6) out.push({ horizontal: false, pos: (r.x1 + r.x2) / 2, from: Math.min(r.y1, r.y2), to: Math.max(r.y1, r.y2) });
  }
  return out;
}

function touches(a: Seg, b: Seg): boolean {
  if (a.horizontal === b.horizontal) {
    return Math.abs(a.pos - b.pos) <= TOL && a.from <= b.to + TOL && b.from <= a.to + TOL;
  }
  const [h, v] = a.horizontal ? [a, b] : [b, a];
  return v.pos >= h.from - TOL && v.pos <= h.to + TOL && h.pos >= v.from - TOL && h.pos <= v.to + TOL;
}

/** Distinct positions, merging values closer than the tolerance. */
function distinct(values: number[]): number[] {
  const out: number[] = [];
  for (const v of [...values].sort((a, b) => a - b)) if (!out.length || v - out[out.length - 1] > TOL) out.push(v);
  return out;
}

function findTables(rules: PdfRule[]): { top: number; bottom: number; left: number; right: number; ys: number[]; xs: number[] }[] {
  const segs = segments(rules);
  // Group segments that touch into connected grids (union–find).
  const parent = segs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) if (touches(segs[i], segs[j])) parent[find(i)] = find(j);
  const groups = new Map<number, Seg[]>();
  segs.forEach((s, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), s]));

  const tables = [];
  for (const g of groups.values()) {
    const ys = distinct(g.filter((s) => s.horizontal).map((s) => s.pos));
    const xs = distinct(g.filter((s) => !s.horizontal).map((s) => s.pos));
    if (ys.length < 2 || xs.length < 2) continue; // a lone underline, not a table
    // A row cut by a page break has side borders but no bottom (or top) border:
    // the vertical lines reach past the last horizontal one, so close the row there.
    const verticals = g.filter((s) => !s.horizontal);
    const lowest = Math.min(...verticals.map((s) => s.from));
    const highest = Math.max(...verticals.map((s) => s.to));
    if (lowest < ys[0] - 4) ys.unshift(lowest);
    if (highest > ys[ys.length - 1] + 4) ys.push(highest);
    tables.push({ top: ys[ys.length - 1], bottom: ys[0], left: xs[0], right: xs[xs.length - 1], ys, xs });
  }
  return tables;
}

function buildTable(grid: ReturnType<typeof findTables>[number], lines: Line[]): Table {
  const ysDown = [...grid.ys].sort((a, b) => b - a); // top → bottom
  const rows: Cell[][] = [];
  for (let r = 0; r < ysDown.length - 1; r++) {
    const hi = ysDown[r];
    const lo = ysDown[r + 1];
    const row: Cell[] = grid.xs.slice(0, -1).map(() => ({ lines: [] }));
    for (const line of lines) {
      if (line.y > hi || line.y < lo) continue;
      // Split the line into cells by x position.
      for (const it of line.items) {
        const c = grid.xs.findIndex((x, i) => i < grid.xs.length - 1 && it.x >= x - TOL && it.x < grid.xs[i + 1] - TOL);
        if (c === -1) continue;
        const cell = row[c];
        let l = cell.lines.find((x) => Math.abs(x.y - line.y) <= 1.5);
        if (!l) cell.lines.push((l = { y: line.y, x: it.x, size: it.size, items: [] }));
        l.items.push(it);
      }
    }
    if (row.some((c) => c.lines.length)) rows.push(row);
  }
  return { top: grid.top, bottom: grid.bottom, left: grid.left, cols: grid.xs.length - 1, rows };
}

/** Join wrapped lines; a word broken at a hyphen or dash ("bye-" + "bye") is rejoined without a space. */
export function joinLines(parts: string[]): string {
  let out = '';
  for (const p of parts.map((x) => x.trim()).filter(Boolean)) {
    out = !out ? p : /[\p{L}\p{N}][-–]$/u.test(out) ? out + p : `${out} ${p}`;
  }
  return out.replace(/\s+/g, ' ').trim();
}

const cellText = (c: Cell) => joinLines(c.lines.sort((a, b) => b.y - a.y).map((l) => lineText(l)));

// ─── The whole document ─────────────────────────────────────────────────

/** Page furniture: page numbers in the top or bottom margin. */
const isFurniture = (line: Line, page: PdfPage) => {
  const inMargin = line.y < page.height * 0.07 || line.y > page.height * 0.95;
  return inMargin && /^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(lineText(line));
};

export function pdfLayoutToHtml(pages: PdfPage[]): string {
  // 1. Blocks in reading order: tables and lines outside tables.
  const blocks: Block[] = [];
  for (const page of pages) {
    const lines = toLines(page.items).filter((l) => !isFurniture(l, page));
    const grids = findTables(page.rules);
    const inside = (l: Line, g: (typeof grids)[number]) => l.y <= g.top + TOL && l.y >= g.bottom - TOL && l.x >= g.left - TOL && l.x <= g.right + TOL;
    const pageBlocks: (Block & { top: number })[] = [];
    const claimed = new Set<Line>();
    for (const g of grids) {
      const table = buildTable(g, lines.filter((l) => inside(l, g)));
      // Some PDFs draw no border around the header row: take the lines just above the
      // table whose words fall into two or more of its columns.
      const above = lines
        .filter((l) => l.y > g.top && l.y - g.top < l.size * 3.5 && l.x >= g.left - TOL && l.x <= g.right)
        .sort((a, b) => a.y - b.y);
      // Take the block of closely spaced lines just above the table (cells may be vertically
      // centred, so one header row can span several text lines); it's a header if its words
      // fall into two or more of the table's columns.
      const header: Line[] = [];
      for (const l of above) {
        const prevY = header.length ? header[header.length - 1].y : g.top;
        if (l.y - prevY > l.size * 1.9) break;
        header.push(l);
      }
      const colOf = (it: PdfTextItem) => g.xs.findIndex((x, i) => i < g.xs.length - 1 && it.x >= x - TOL && it.x < g.xs[i + 1] - TOL);
      const headerCols = new Set(header.flatMap((l) => l.items.filter((it) => it.str.trim()).map(colOf)).filter((c) => c >= 0));
      // A bold lead-in followed by normal text ("Module 1: Home (Nov). Key language: …") is a paragraph, not a header.
      const leadIn = header.some((l) => {
        const words = l.items.filter((it) => it.str.trim());
        return words[0]?.bold && words.some((it) => !it.bold);
      });
      if (headerCols.size < 2 || leadIn) header.length = 0;
      const firstRowBold = table.rows[0]?.every((c) => c.lines.every((l) => l.items.every((i) => i.bold || !i.str.trim())));
      if (header.length && table.rows.length && !firstRowBold) {
        const headRow = buildTable({ ...g, ys: [g.top, g.top + 1000] }, header).rows[0];
        if (headRow) {
          table.rows.unshift(headRow);
          header.forEach((l) => claimed.add(l));
        }
      }
      pageBlocks.push({ kind: 'table', table, top: header.length && claimed.has(header[0]) ? Math.max(...header.map((l) => l.y + l.size)) : g.top });
    }
    for (const l of lines) if (!claimed.has(l) && !grids.some((g) => inside(l, g))) pageBlocks.push({ kind: 'line', line: l, top: l.y + l.size });
    pageBlocks.sort((a, b) => b.top - a.top);
    // A table continuing from the previous page: same columns, nothing in between.
    for (const b of pageBlocks) {
      const prev = blocks[blocks.length - 1];
      if (b.kind === 'table' && prev?.kind === 'table' && prev.table.cols === b.table.cols && b === pageBlocks[0]) {
        const repeatedHeader = b.table.rows.length && prev.table.rows.length && b.table.rows[0].map(cellText).join('|') === prev.table.rows[0].map(cellText).join('|');
        prev.table.rows.push(...(repeatedHeader ? b.table.rows.slice(1) : b.table.rows));
        continue;
      }
      blocks.push(b);
    }
  }

  // 2. Font sizes: body text is the most common size; headings are bigger.
  const sizeChars = new Map<number, number>();
  // Count every word, table cells included: they're body text too.
  for (const page of pages) for (const it of page.items) sizeChars.set(Math.round(it.size), (sizeChars.get(Math.round(it.size)) ?? 0) + it.str.trim().length);
  const body = [...sizeChars.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
  const headingSizes = [...sizeChars.keys()].filter((s) => s >= body * 1.15).sort((a, b) => b - a);
  const level2Size = blocks.find((b) => b.kind === 'line' && LEVEL2_NAMES.test(lineText(b.line)) && Math.round(b.line.size) >= body * 1.15);
  const l2 = level2Size?.kind === 'line' ? Math.round(level2Size.line.size) : (headingSizes[1] ?? headingSizes[0]);
  const levelOf = (size: number) => {
    const s = Math.round(size);
    if (s < body * 1.15) return 0;
    if (s > l2 + 0.5) return 1;
    if (Math.abs(s - l2) <= 0.5) return 2;
    return 3;
  };

  // 3. Emit HTML: merge wrapped heading lines and paragraph lines.
  const out: string[] = [];
  let para: { lead: string; rest: string[]; lastY: number; size: number } | null = null;
  let heading: { level: number; text: string; lastY: number } | null = null;
  const flushPara = () => {
    if (para) out.push(`<p>${para.lead ? `<strong>${esc(para.lead)}</strong> ` : ''}${esc(joinLines(para.rest))}</p>`);
    para = null;
  };
  const flushHeading = () => {
    if (heading) out.push(`<h${heading.level}>${esc(heading.text)}</h${heading.level}>`);
    heading = null;
  };

  for (const b of blocks) {
    if (b.kind === 'table') {
      flushPara();
      flushHeading();
      out.push(
        '<table>' +
          b.table.rows.map((r) => '<tr>' + r.map((c) => `<td>${esc(cellText(c))}</td>`).join('') + '</tr>').join('') +
          '</table>',
      );
      continue;
    }
    const line = b.line;
    const level = levelOf(line.size);
    const text = lineText(line);
    if (level > 0) {
      flushPara();
      if (heading && heading.level === level && heading.lastY - line.y < line.size * 1.8) {
        heading.text = joinLines([heading.text, text]);
        heading.lastY = line.y;
      } else {
        flushHeading();
        heading = { level, text, lastY: line.y };
      }
      continue;
    }
    flushHeading();
    const leadsBold = !!line.items[0]?.bold;
    const firstNormal = line.items.findIndex((i) => !i.bold);
    const boldPart = () => lineText({ ...line, items: firstNormal === -1 ? line.items : line.items.slice(0, firstNormal) });
    const normalPart = () => (firstNormal === -1 ? '' : lineText({ ...line, items: line.items.slice(firstNormal) }));
    const current = para as { lead: string; rest: string[]; lastY: number; size: number } | null;
    const continuing = !!current && current.lastY - line.y <= line.size * 1.9;

    if (continuing && current!.lead && !current!.rest.length && leadsBold) {
      // The bold lead-in wraps onto this line.
      current!.lead = joinLines([current!.lead, boldPart()]);
      if (normalPart()) current!.rest.push(normalPart());
    } else if (!continuing || leadsBold) {
      // A new paragraph (after a gap, or starting with a bold lead-in like "Module 3: Food (Nov).").
      flushPara();
      para = { lead: leadsBold ? boldPart() : '', rest: leadsBold ? (normalPart() ? [normalPart()] : []) : [text], lastY: line.y, size: line.size };
    } else {
      current!.rest.push(text);
    }
    if (para) (para as { lastY: number }).lastY = line.y;
  }
  flushPara();
  flushHeading();
  return out.join('\n');
}
