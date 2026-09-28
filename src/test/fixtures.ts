// A small made-up curriculum in the same shape as a real Word document, for tests.

import { importCurriculum } from '../db/curriculumImport';
import { parseCurriculumHtml } from '../import/parseCurriculum';

export const SAMPLE_CURRICULUM_HTML = `
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

/** Import the sample curriculum and link example groups 2a/2b to grade 2. */
export async function importSampleCurriculum() {
  const { db } = await import('../db/db');
  await db.groups.where('id').anyOf(['g-2a', 'g-2b']).modify({ curriculumKey: 'grade-2' });
  return importCurriculum(parseCurriculumHtml(SAMPLE_CURRICULUM_HTML));
}
