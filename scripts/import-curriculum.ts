// One-off curriculum import.
//
//   npm run import-curriculum            → reads docs/curriculum.docx and prints a summary (writes nothing)
//   npm run import-curriculum -- --write → also writes src/seed/curriculum.json, games.json, resources.json
//
// An optional path argument reads a different .docx file.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import { parseCurriculumHtml } from './lib/parse-curriculum';
import { SEED_GROUPS } from '../src/seed/groups';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const docPath = resolve(root, args.find((a) => !a.startsWith('--')) ?? 'docs/curriculum.docx');

if (!existsSync(docPath)) {
  console.error(`\nCan't find ${docPath}.\nExport your curriculum from Word/Docs as .docx and save it there, then run this again.\n`);
  process.exit(1);
}

const { value: html, messages } = await mammoth.convertToHtml({ path: docPath });
const result = parseCurriculumHtml(html);

// ── Summary ────────────────────────────────────────────────────────
const pad = (s: string | number, n: number) => String(s).padEnd(n);
console.log(`\nRed Pen curriculum import — ${docPath.replace(root + '/', '')}\n`);
console.log(pad('Curriculum', 34) + pad('Modules', 9) + pad('Lessons', 9) + 'Groups');
console.log('─'.repeat(72));
for (const c of result.curricula) {
  const mods = result.modules.filter((m) => m.curriculumKey === c.key);
  const lessons = result.lessons.filter((l) => mods.some((m) => m.id === l.moduleId));
  const groups = SEED_GROUPS.filter((g) => g.curriculumKey === c.key).map((g) => g.name);
  console.log(pad(c.title, 34) + pad(mods.length, 9) + pad(lessons.length, 9) + (groups.join(', ') || '—'));
}
console.log('─'.repeat(72));
console.log(pad('Total', 34) + pad(result.modules.length, 9) + pad(result.lessons.length, 9));
const linked = result.lessons.filter((l) => l.gameIds.length).length;
console.log(`\nLesson frameworks: ${result.frameworks.map((f) => `${f.name} (${f.stages.length} stages)`).join(', ')}`);
console.log(`Games bank: ${result.games.length} games · Resources: ${result.resources.length}`);
console.log(`${linked} of ${result.lessons.length} lessons mention a game from the bank and are linked to it.`);

const orphans = SEED_GROUPS.filter((g) => !result.curricula.some((c) => c.key === g.curriculumKey));
if (orphans.length) result.warnings.push(`No curriculum found for: ${orphans.map((g) => g.name).join(', ')}`);

if (result.notes.length) console.log(`\nNotes:\n${result.notes.map((s) => '  · ' + s).join('\n')}`);
for (const m of messages) result.warnings.push(`Word conversion: ${m.message}`);

if (result.warnings.length) {
  console.log(`\n⚠ ${result.warnings.length} thing(s) need a look:`);
  result.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
} else {
  console.log('\n✓ Everything parsed cleanly.');
}

if (write) {
  const out = resolve(root, 'src/seed');
  mkdirSync(out, { recursive: true });
  const { games, resources, warnings: _w, notes: _n, ...curriculum } = result;
  const meta = { source: 'docs/curriculum.docx', importedAt: new Date().toISOString() };
  writeFileSync(resolve(out, 'curriculum.json'), JSON.stringify({ ...meta, ...curriculum }, null, 2) + '\n');
  writeFileSync(resolve(out, 'games.json'), JSON.stringify(games, null, 2) + '\n');
  writeFileSync(resolve(out, 'resources.json'), JSON.stringify(resources, null, 2) + '\n');
  console.log('\nWrote src/seed/curriculum.json, games.json and resources.json.');
  console.log('Open Red Pen → Settings → Curriculum → "Load the new curriculum" to use it on a device that already has data.\n');
} else {
  console.log('\nNothing written yet. Run again with --write to save it for the app.\n');
}
