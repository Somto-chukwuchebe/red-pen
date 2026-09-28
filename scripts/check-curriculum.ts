// Checks a curriculum document on your computer and prints what Red Pen would import.
// Nothing is written: to use a curriculum, import it in the app (Settings → Curriculum),
// which reads the file on that device only.
//
//   npm run check-curriculum                    → checks docs/curriculum.docx
//   npm run check-curriculum -- path/to/file.docx

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import { parseCurriculumHtml } from '../src/import/parseCurriculum';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const docPath = resolve(root, arg ?? 'docs/curriculum.docx');

if (!existsSync(docPath)) {
  console.error(`\nCan't find ${docPath}.\n`);
  process.exit(1);
}

const { value: html, messages } = await mammoth.convertToHtml({ path: docPath });
const result = parseCurriculumHtml(html);
const pad = (s: string | number, n: number) => String(s).padEnd(n);

console.log(`\nRed Pen curriculum check — ${docPath.replace(root + '/', '')}\n`);
console.log(pad('Curriculum', 36) + pad('Modules', 9) + 'Lessons');
console.log('─'.repeat(56));
for (const c of result.curricula) {
  const mods = result.modules.filter((m) => m.curriculumKey === c.key);
  const lessons = result.lessons.filter((l) => mods.some((m) => m.id === l.moduleId));
  console.log(pad(c.title, 36) + pad(mods.length, 9) + lessons.length);
}
console.log('─'.repeat(56));
console.log(pad('Total', 36) + pad(result.modules.length, 9) + result.lessons.length);
console.log(`\nLesson frameworks: ${result.frameworks.map((f) => `${f.name} (${f.stages.length} stages)`).join(', ') || 'none'}`);
console.log(`Games: ${result.games.length} · Resources: ${result.resources.length}`);
if (result.notes.length) console.log(`\nNotes:\n${result.notes.map((s) => '  · ' + s).join('\n')}`);
for (const m of messages) result.warnings.push(`Word conversion: ${m.message}`);
if (result.warnings.length) {
  console.log(`\n⚠ ${result.warnings.length} thing(s) need a look:`);
  result.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
} else {
  console.log('\n✓ Everything parsed cleanly. Import it in the app: Settings → Curriculum → Import from Word.\n');
}
