import { describe, expect, it } from 'vitest';
import { SAMPLE_CURRICULUM_HTML as sample } from '../test/fixtures';
import { gameAliases, parseCurriculumHtml, parseLevels, parseMonths } from './parseCurriculum';


describe('curriculum import', () => {
  const r = parseCurriculumHtml(sample);

  it('reads months and level ranges', () => {
    expect(parseMonths('Sep–Oct')).toEqual([9, 10]);
    expect(parseMonths('Nov–Jan')).toEqual([11, 12, 1]);
    expect(parseMonths('May')).toEqual([5]);
    expect(parseLevels('KG–4')).toEqual(['KG', '2', '3', '4']);
    expect(parseLevels('5–8')).toEqual(['5', '6', '7', '8']);
    expect(parseLevels('KG')).toEqual(['KG']);
  });

  it('finds every curriculum', () => {
    expect(r.curricula.map((c) => c.key)).toEqual(['kg-little', 'kg-middle', 'grade-2', 'grade-3', 'grade-5']);
    expect(r.curricula.find((c) => c.key === 'grade-2')?.intro).toBe('Intro text.');
  });

  it('parses a primary module and its 8 lessons', () => {
    const mod = r.modules.find((m) => m.curriculumKey === 'grade-2')!;
    expect(mod).toMatchObject({ title: 'Module 1: My home!', months: 'Nov', monthNums: [11], keyLanguage: 'red, yellow · house' });
    const lessons = r.lessons.filter((l) => l.moduleId === mod.id);
    expect(lessons).toHaveLength(8);
    expect(lessons[3]).toMatchObject({ label: 'Week 2 · Lesson B', focus: 'Hot seat', order: 4 });
  });

  it('builds 8 lessons for a prose-only "Review and show" module', () => {
    const mod = r.modules.find((m) => m.curriculumKey === 'grade-3')!;
    expect(r.lessons.filter((l) => l.moduleId === mod.id)).toHaveLength(8);
    expect(mod.notes).toContain('Weeks 1–2');
    expect(r.warnings).toEqual([]);
  });

  it('parses secondary tables and skips empty cells', () => {
    const mods = r.modules.filter((m) => m.curriculumKey === 'grade-5');
    expect(mods.map((m) => m.title)).toEqual(['Starter', 'Module 1: School days']);
    expect(r.lessons.filter((l) => l.moduleId === mods[0].id)).toHaveLength(1);
    expect(r.lessons.filter((l) => l.moduleId === mods[1].id).map((l) => l.label)).toEqual(['Lesson 1', 'Lesson 2', 'Lesson 3']);
  });

  it('makes 8 kindergarten lessons per month with the right themes', () => {
    const little = r.lessons.filter((l) => l.moduleId.startsWith('kg-little'));
    expect(little).toHaveLength(8);
    expect(little[0]).toMatchObject({ label: 'Week 1 · Lesson A', focus: 'Hello' });
    expect(little[7]).toMatchObject({ label: 'Week 4 · Lesson B', focus: 'Clap' });
    const middle = r.modules.find((m) => m.curriculumKey === 'kg-middle')!;
    expect(middle).toMatchObject({ title: 'Colours', keyLanguage: "red, blue · It's red.", songs: 'Colour song' });
  });

  it('reads frameworks with minutes per lesson length', () => {
    const kg = r.frameworks.find((f) => f.id === 'fw-kg')!;
    expect(kg.stages[1].minutesByLength).toEqual({ 15: 0, 20: 2, 30: 5 });
    expect(r.frameworks.find((f) => f.id === 'fw-primary-a')?.stages[0].minutesByLength).toEqual({ 40: 5 });
  });

  it('reads the games bank and resources, and links lessons to games', () => {
    expect(r.games.map((g) => g.id)).toContain('game-hot-seat');
    expect(r.resources[0]).toMatchObject({ name: 'Wordwall', link: 'https://wordwall.net', levelTags: ['2', '3', '4', '5', '6', '7', '8'] });
    expect(r.lessons.find((l) => l.focus === 'Hot seat')?.gameIds).toEqual(['game-hot-seat']);
    expect(r.lessons.find((l) => l.focus.startsWith('Recall with Flash'))?.gameIds).toEqual(['game-flash-and-guess']);
    expect(gameAliases("Kim's game / What's missing?")).toEqual(["Kim's game", "What's missing"]);
  });

  it('reports what it could not read instead of guessing', () => {
    const bad = parseCurriculumHtml(`
      <h2>Grades 2–4</h2><h3>Grade 2 (Spotlight 2)</h3>
      <p><strong>Module 9: Mystery (Someday).</strong> Key language: x</p>
      <p><strong>Module 10: Empty (May).</strong> Key language: y</p>
      <h2>Homework</h2>`);
    expect(bad.warnings.join('\n')).toMatch(/couldn't read the months/);
    expect(bad.warnings.join('\n')).toMatch(/Empty.*no lesson table/);
    expect(bad.warnings.join('\n')).toMatch(/Unknown section "## Homework"/);
  });
});

