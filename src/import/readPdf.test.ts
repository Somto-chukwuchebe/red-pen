// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SAMPLE_CURRICULUM_HTML } from '../test/fixtures';
import { parseCurriculumHtml } from './parseCurriculum';
import { joinLines, pdfLayoutToHtml, type PdfPage } from './pdfLayout';
import { extractPdfPages } from './readPdf';

const pdfjs = () => import('pdfjs-dist/legacy/build/pdf.mjs') as never;
const summary = (r: ReturnType<typeof parseCurriculumHtml>) => ({
  curricula: r.curricula.map((c) => c.key),
  modules: r.modules.map((m) => [m.id, m.title, m.months, m.keyLanguage]),
  lessons: r.lessons.map((l) => [l.id, l.label, l.focus]),
  frameworks: r.frameworks.map((f) => [f.id, f.stages.length]),
  games: r.games.map((g) => g.id),
  resources: r.resources.map((x) => [x.id, x.link]),
});

describe('PDF curriculum import', () => {
  it('reads a PDF exactly like the same document in Word', async () => {
    const pages = await extractPdfPages(await pdfjs(), readFileSync('src/test/sample-curriculum.pdf'));
    const fromPdf = parseCurriculumHtml(pdfLayoutToHtml(pages));
    const fromHtml = parseCurriculumHtml(SAMPLE_CURRICULUM_HTML);
    expect(fromPdf.warnings).toEqual([]);
    expect(summary(fromPdf)).toEqual({ ...summary(fromHtml), resources: [['res-wordwall', '']] });
  });

  it('rejoins words broken across lines', () => {
    expect(joinLines(['Hello, bye-', 'bye (wave)'])).toBe('Hello, bye-bye (wave)');
    expect(joinLines(['numbers 1–', '10'])).toBe('numbers 1–10');
    expect(joinLines(['a pause –', 'then more'])).toBe('a pause – then more');
  });

  it('builds headings, bold lead-ins and tables from a page layout', () => {
    const it = (str: string, x: number, y: number, size = 10, bold = false) => ({ str, x, y, width: str.length * size * 0.5, size, bold });
    const page: PdfPage = {
      width: 600,
      height: 800,
      items: [
        it('Grades 2–4', 50, 750, 18, true),
        it('Grade 2', 50, 720, 14, true),
        it('Module 1: Home (Nov).', 50, 690, 10, true),
        it('Key language: red, blue', 160, 690),
        it('Week', 55, 660, 10, true),
        it('Lesson A', 150, 660, 10, true),
        it('Lesson B', 300, 660, 10, true),
        it('1', 55, 640),
        it('Colours', 150, 640),
        it('Colour hunt', 300, 640),
      ],
      rules: [
        { x1: 50, y1: 675, x2: 450, y2: 675 },
        { x1: 50, y1: 652, x2: 450, y2: 652 },
        { x1: 50, y1: 630, x2: 450, y2: 630 },
        { x1: 50, y1: 630, x2: 50, y2: 675 },
        { x1: 145, y1: 630, x2: 145, y2: 675 },
        { x1: 295, y1: 630, x2: 295, y2: 675 },
        { x1: 450, y1: 630, x2: 450, y2: 675 },
      ],
    };
    expect(pdfLayoutToHtml([page])).toBe(
      [
        '<h2>Grades 2–4</h2>',
        '<h3>Grade 2</h3>',
        '<p><strong>Module 1: Home (Nov).</strong> Key language: red, blue</p>',
        '<table><tr><td>Week</td><td>Lesson A</td><td>Lesson B</td></tr><tr><td>1</td><td>Colours</td><td>Colour hunt</td></tr></table>',
      ].join('\n'),
    );
  });
});

describe.runIf(existsSync('docs/curriculum.pdf') && existsSync('docs/curriculum.docx'))('your own curriculum PDF (only on your computer)', () => {
  it('matches the Word version', async () => {
    const mammoth = (await import('mammoth')).default;
    const pages = await extractPdfPages(await pdfjs(), readFileSync('docs/curriculum.pdf'));
    const fromPdf = parseCurriculumHtml(pdfLayoutToHtml(pages));
    const fromWord = parseCurriculumHtml((await mammoth.convertToHtml({ path: 'docs/curriculum.docx' })).value);
    expect(summary(fromPdf).lessons).toEqual(summary(fromWord).lessons);
    expect(fromPdf.games.length).toBe(fromWord.games.length);
  });
});
