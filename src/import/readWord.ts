// Reads a curriculum Word document on this device (nothing is uploaded).
// The Word reader is loaded only when you import, so it doesn't slow down the app.

import { parseCurriculumHtml, type ParseResult } from './parseCurriculum';

export async function readCurriculumWordFile(file: File): Promise<ParseResult> {
  const mod = await import('mammoth');
  const mammoth = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const { value, messages } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const result = parseCurriculumHtml(value);
  for (const m of messages) if (m.type === 'error') result.warnings.push(m.message);
  return result;
}
