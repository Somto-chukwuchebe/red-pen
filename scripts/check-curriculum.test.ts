// @vitest-environment node
// Runs only on a computer that has your (private, untracked) docs/curriculum.docx.
import { existsSync } from 'node:fs';
import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { parseCurriculumHtml } from '../src/import/parseCurriculum';

describe.runIf(existsSync('docs/curriculum.docx'))('the real curriculum document', () => {
  it('imports cleanly with the expected counts', async () => {
    const { value } = await mammoth.convertToHtml({ path: 'docs/curriculum.docx' });
    const r = parseCurriculumHtml(value);
    expect(r.warnings).toEqual([]);
    expect(r.curricula).toHaveLength(10);
    expect(r.frameworks).toHaveLength(4);
    expect(r.games.length).toBeGreaterThanOrEqual(40);
    expect(r.resources.length).toBeGreaterThanOrEqual(10);
    // Every framework adds up to the lesson length.
    for (const f of r.frameworks) {
      const lengths = Object.keys(f.stages[0].minutesByLength).map(Number);
      for (const len of lengths) expect(f.stages.reduce((s, st) => s + (st.minutesByLength[len] ?? 0), 0)).toBe(len);
    }
  });
});
