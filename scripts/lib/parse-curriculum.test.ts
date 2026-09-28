import { existsSync } from 'node:fs';
import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { gameAliases, parseCurriculumHtml, parseLevels, parseMonths } from './parse-curriculum';

const sample = `
<h1>Curriculum</h1>
<h2>Lesson frameworks</h2>
<h3>Kindergarten (15 / 20 / 30 min)</h3>
<table><tr><td>Stage</td><td>Little (15)</td><td>Middle (20)</td><td>Older (30)</td><td>What happens</td></tr>
<tr><td>Hello circle</td><td>3</td><td>3</td><td>3</td><td>Hello song</td></tr>
<tr><td>Make or colour</td><td>–</td><td>2</td><td>5</td><td>Colouring</td></tr></table>
<h3>Grades 2–4, Lesson A (build and practise, 40 min)</h3>
<table><tr><td>Stage</td><td>Min</td><td>What happens</td></tr><tr><td>Warm-up</td><td>5</td><td>Song</td></tr></table>
<h2>Kindergarten</h2>
<h3>Little group (1–2 y.o., 15 min, 2× week)</h3>
<p>Joyful exposure.</p>
<table><tr><td>Month</td><td>Weeks 1–2 theme</td><td>Weeks 3–4 theme</td><td>Songs and rhymes</td><td>Play</td></tr>
<tr><td>Sep</td><td>Hello</td><td>Clap</td><td>Hello song</td><td>Peekaboo</td></tr></table>
<h3>Middle group (4–5 y.o., 20 min, 2× week)</h3>
<table><tr><td>Month</td><td>Theme</td><td>Core words</td><td>Phrases</td><td>Songs</td><td>Games</td></tr>
<tr><td>Oct</td><td>Colours</td><td>red, blue</td><td>It's red.</td><td>Colour song</td><td>Simon says</td></tr></table>
<h2>Grades 2–4</h2>
<h3>Grade 2 (Spotlight 2)</h3>
<p>Intro text.</p>
<p><strong>Module 1: My home! (Nov).</strong> Key language: red, yellow · house</p>
<table><tr><td>Week</td><td>Lesson A</td><td>Lesson B</td></tr>
<tr><td>1</td><td>Colours</td><td>Colour hunt</td></tr><tr><td>2</td><td>Rooms</td><td>Hot seat</td></tr>
<tr><td>3</td><td>Furniture</td><td>Hide and seek</td></tr><tr><td>4</td><td>Recall with Flash and guess</td><td>House tour</td></tr></table>
<h3>Grade 3 (Spotlight 3)</h3>
<p><strong>Review and show (May).</strong> Weeks 1–2: review games. Weeks 3–4: rehearse.</p>
<h2>Grades 5–8</h2>
<h3>Grade 5 (5a, 5b · Spotlight 5)</h3>
<table><tr><td>Module (month)</td><td>Lesson 1</td><td>Lesson 2</td><td>Lesson 3</td></tr>
<tr><td>Starter (Sep)</td><td>Spelling race</td><td>–</td><td>–</td></tr>
<tr><td>M1 School days (Sep–Oct)</td><td>Timetable gap</td><td>Find someone who</td><td>Dream school</td></tr></table>
<h2>Games bank</h2>
<table><tr><td>Game</td><td>Levels</td><td>How it works</td><td>Prep</td></tr>
<tr><td>Hot seat</td><td>3–8</td><td>Interview a character</td><td>None</td></tr>
<tr><td>Flash and guess</td><td>KG–4</td><td>Flash a card</td><td>Flashcards</td></tr>
<tr><td>Simon says</td><td>KG–4</td><td>Commands</td><td>None</td></tr>
<tr><td>Find someone who</td><td>2–8</td><td>Mingle</td><td>Grids</td></tr></table>
<h2>Resources</h2>
<table><tr><td>Resource</td><td>Use it for</td><td>Levels</td></tr>
<tr><td><a href="https://wordwall.net">Wordwall</a></td><td>Quizzes</td><td>2–8</td></tr></table>
`;

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
