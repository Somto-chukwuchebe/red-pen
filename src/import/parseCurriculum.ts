// Turns the curriculum Word document (already converted to HTML by mammoth)
// into Red Pen seed data. Pure function: HTML in, data + warnings out.
//
// Anything that doesn't match the expected shape is reported as a warning
// rather than guessed at.

import { parse, type HTMLElement } from 'node-html-parser';

export interface SeedCurriculum {
  key: string;
  title: string;
  type: 'kindergarten' | 'primary' | 'secondary';
  grade: number | null;
  intro: string;
  order: number;
}

export interface SeedModule {
  id: string;
  curriculumKey: string;
  order: number;
  title: string;
  months: string;
  monthNums: number[];
  keyLanguage: string;
  songs: string;
  resources: string;
  notes: string;
}

export interface SeedLesson {
  id: string;
  moduleId: string;
  order: number;
  label: string;
  focus: string;
  activities: string;
  gameIds: string[];
  resourceIds: string[];
}

export interface SeedFramework {
  id: string;
  name: string;
  appliesTo: 'kindergarten' | 'primary' | 'secondary';
  variant: string;
  stages: { name: string; minutesByLength: Record<number, number>; description: string }[];
}

export interface SeedGame {
  id: string;
  name: string;
  levels: string;
  levelTags: string[];
  howItWorks: string;
  prep: string;
}

export interface SeedResource {
  id: string;
  name: string;
  useFor: string;
  levels: string;
  levelTags: string[];
  link: string;
}

export interface ParseResult {
  curricula: SeedCurriculum[];
  modules: SeedModule[];
  lessons: SeedLesson[];
  frameworks: SeedFramework[];
  games: SeedGame[];
  resources: SeedResource[];
  warnings: string[];
  notes: string[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DASH = /\s*[–—-]\s*/;

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const clean = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
const text = (el: HTMLElement) => clean(el.text);
const isEmptyCell = (s: string) => s === '' || /^[–—-]$/.test(s);

/** "Sep–Oct" → [9, 10]; "Nov–Dec" → [11, 12]; "Mar–Apr" → [3, 4]. School-year order. */
export function parseMonths(s: string): number[] {
  const parts = s.split(DASH).map((p) => MONTHS.indexOf(p.trim().slice(0, 3)) + 1);
  if (parts.some((n) => n === 0)) return [];
  if (parts.length === 1) return parts;
  const [a, b] = parts;
  const out: number[] = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b || out.length > 12) break;
  }
  return out;
}

/** "KG–4" → ["KG","2","3","4"]; "5–8" → ["5","6","7","8"]; "KG" → ["KG"]. */
export function parseLevels(s: string): string[] {
  const parts = s.split(DASH).map((p) => p.trim());
  const toNum = (p: string) => (/^KG$/i.test(p) ? 1 : Number(p));
  if (parts.length === 1) return [/^KG$/i.test(parts[0]) ? 'KG' : parts[0]];
  const [a, b] = parts.map(toNum);
  if (Number.isNaN(a) || Number.isNaN(b)) return parts;
  const out: string[] = [];
  for (let n = a; n <= b; n++) {
    if (n === 1) out.push('KG');
    else out.push(String(n));
  }
  return out;
}

function rows(table: HTMLElement): string[][] {
  return table.querySelectorAll('tr').map((tr) => tr.querySelectorAll('td,th').map(text));
}

/** Word tables converted by mammoth have no <th>; the first row is the header. */
function tableBody(table: HTMLElement) {
  const all = rows(table);
  return { header: all[0] ?? [], body: all.slice(1).filter((r) => r.some((c) => c !== '')) };
}

function curriculumFromH3(h2: string, h3: string): Omit<SeedCurriculum, 'intro' | 'order'> | null {
  if (h2 === 'Kindergarten') {
    if (/^Little/i.test(h3)) return { key: 'kg-little', title: 'Kindergarten · Little group', type: 'kindergarten', grade: null };
    if (/^Middle/i.test(h3)) return { key: 'kg-middle', title: 'Kindergarten · Middle group', type: 'kindergarten', grade: null };
    if (/^Older/i.test(h3)) return { key: 'kg-older', title: 'Kindergarten · Older groups', type: 'kindergarten', grade: null };
    return null;
  }
  const m = /^Grade (\d)\b/.exec(h3);
  if (!m) return null;
  const grade = Number(m[1]);
  const type = grade <= 4 ? 'primary' : 'secondary';
  const book = /Spotlight \d/.exec(h3)?.[0] ?? `Spotlight ${grade}`;
  return { key: `grade-${grade}`, title: `Grade ${grade} · ${book}`, type, grade };
}

export function parseCurriculumHtml(html: string): ParseResult {
  const root = parse(html);
  const out: ParseResult = {
    curricula: [],
    modules: [],
    lessons: [],
    frameworks: [],
    games: [],
    resources: [],
    warnings: [],
    notes: [],
  };

  let h2 = '';
  let h3 = '';
  let current: SeedCurriculum | null = null;
  let pendingModule: SeedModule | null = null; // grades 2–4: bold paragraph waiting for its table
  const moduleCount = new Map<string, number>();

  const newModule = (key: string, m: Omit<SeedModule, 'id' | 'curriculumKey' | 'order'>): SeedModule => {
    const order = (moduleCount.get(key) ?? 0) + 1;
    moduleCount.set(key, order);
    const mod: SeedModule = { id: `${key}-m${String(order).padStart(2, '0')}`, curriculumKey: key, order, ...m };
    out.modules.push(mod);
    return mod;
  };
  const addLesson = (mod: SeedModule, label: string, focus: string, activities: string) => {
    const order = out.lessons.filter((l) => l.moduleId === mod.id).length + 1;
    out.lessons.push({
      id: `${mod.id}-l${String(order).padStart(2, '0')}`,
      moduleId: mod.id,
      order,
      label,
      focus,
      activities,
      gameIds: [],
      resourceIds: [],
    });
  };
  const closePending = () => {
    if (pendingModule && !out.lessons.some((l) => l.moduleId === pendingModule!.id) && /^Review and show/i.test(pendingModule.title)) {
      // The end-of-year module is described in prose: two weeks of review games,
      // then two weeks of rehearsal ending in a show. Build its 8 lessons from that.
      const mod = pendingModule;
      const review = 'Mega-review games across all modules';
      const reviewGames = 'Baamboozle, Board race, Hot seat';
      addLesson(mod, 'Week 1 · Lesson A', review, reviewGames);
      addLesson(mod, 'Week 1 · Lesson B', review, reviewGames);
      addLesson(mod, 'Week 2 · Lesson A', review, reviewGames);
      addLesson(mod, 'Week 2 · Lesson B', review, reviewGames);
      addLesson(mod, 'Week 3 · Lesson A', 'Rehearse for the show', mod.notes);
      addLesson(mod, 'Week 3 · Lesson B', 'Rehearse for the show', mod.notes);
      addLesson(mod, 'Week 4 · Lesson A', 'Dress rehearsal', mod.notes);
      addLesson(mod, 'Week 4 · Lesson B', 'The show', mod.notes);
      out.notes.push(`${current?.title}: built 8 lessons for "${mod.title}" from its description`);
    }
    if (pendingModule && !out.lessons.some((l) => l.moduleId === pendingModule!.id)) {
      out.warnings.push(
        `${current?.title}: "${pendingModule.title} (${pendingModule.months})" has no lesson table, so it has no lessons yet. Its description was kept as notes.`,
      );
    }
    pendingModule = null;
  };

  for (const node of root.childNodes as HTMLElement[]) {
    const tag = node.tagName;
    if (!tag) continue;

    if (tag === 'H1') continue;
    if (tag === 'H2') {
      closePending();
      h2 = text(node);
      h3 = '';
      current = null;
      if (!['How this curriculum works', 'Lesson frameworks', 'Kindergarten', 'Grades 2–4', 'Grades 5–8', 'Games bank', 'Resources'].includes(h2)) {
        out.warnings.push(`Unknown section "## ${h2}" was skipped.`);
      }
      continue;
    }
    if (tag === 'H3') {
      closePending();
      h3 = text(node);
      current = null;
      if (['Kindergarten', 'Grades 2–4', 'Grades 5–8'].includes(h2)) {
        const c = curriculumFromH3(h2, h3);
        if (!c) {
          out.warnings.push(`Unrecognised group heading "### ${h3}" under ${h2} was skipped.`);
        } else {
          current = { ...c, intro: '', order: out.curricula.length + 1 };
          out.curricula.push(current);
        }
      }
      continue;
    }

    // ── Front matter and frameworks ────────────────────────────────
    if (h2 === 'How this curriculum works') {
      if (tag === 'TABLE') out.notes.push(h3 ? `"${h3}" table not imported (reference only)` : 'Overview table of groups not imported (reference only)');
      continue;
    }

    if (h2 === 'Lesson frameworks') {
      if (tag !== 'TABLE') continue;
      const fw = parseFramework(h3, node);
      if (fw) out.frameworks.push(fw);
      else out.warnings.push(`Lesson framework table under "${h3}" wasn't recognised.`);
      continue;
    }

    // ── Kindergarten ──────────────────────────────────────────────
    if (h2 === 'Kindergarten' && current) {
      if (tag === 'P') {
        current.intro = [current.intro, text(node)].filter(Boolean).join('\n\n');
        continue;
      }
      if (tag !== 'TABLE') continue;
      const { header, body } = tableBody(node);
      const kgKey = current.key;
      if (/Weeks 1–2/i.test(header[1] ?? '')) {
        // Little group: Month | Weeks 1–2 theme | Weeks 3–4 theme | Songs and rhymes | Play
        for (const [month, t1, t2, songs, play] of body) {
          const mod = newModule(kgKey, {
            title: `${t1} · ${t2}`,
            months: month,
            monthNums: parseMonths(month),
            keyLanguage: `Weeks 1–2: ${t1} · Weeks 3–4: ${t2}`,
            songs: songs ?? '',
            resources: '',
            notes: play ? `Play: ${play}` : '',
          });
          for (let w = 1; w <= 4; w++)
            for (const ab of ['A', 'B'])
              addLesson(mod, `Week ${w} · Lesson ${ab}`, w <= 2 ? t1 : t2, play ?? '');
        }
      } else if (/Theme/i.test(header[1] ?? '') && header.length >= 6) {
        // Middle / Older: Month | Theme | Core words | Phrases | Songs | Games
        for (const [month, theme, words, phrases, songs, games] of body) {
          const mod = newModule(kgKey, {
            title: theme,
            months: month,
            monthNums: parseMonths(month),
            keyLanguage: [words, phrases].filter(Boolean).join(' · '),
            songs: songs ?? '',
            resources: '',
            notes: games ? `Games: ${games}` : '',
          });
          const plan = [
            `Words: ${words}`,
            `Phrases: ${phrases}`,
            `Phrases: ${phrases}`,
            `Game or mini show`,
          ];
          for (let w = 1; w <= 4; w++)
            for (const ab of ['A', 'B']) addLesson(mod, `Week ${w} · Lesson ${ab}`, plan[w - 1], games ?? '');
        }
      } else {
        out.warnings.push(`${current.title}: a table with columns "${header.join(' | ')}" wasn't recognised.`);
      }
      continue;
    }

    // ── Grades 2–4 ───────────────────────────────────────────────
    if (h2 === 'Grades 2–4' && current) {
      if (tag === 'P') {
        const strong = node.querySelector('strong');
        const lead = strong ? text(strong) : '';
        const m = /^(.*?)\s*\(([^)]+)\)\.?$/.exec(lead);
        if (strong && m && node.innerHTML.trim().startsWith('<strong>')) {
          closePending();
          const rest = clean(text(node).slice(lead.length));
          const kl = /^Key language:\s*(.*)$/i.exec(rest);
          pendingModule = newModule(current.key, {
            title: m[1],
            months: m[2],
            monthNums: parseMonths(m[2]),
            keyLanguage: kl ? kl[1] : '',
            songs: '',
            resources: '',
            notes: kl ? '' : rest,
          });
          if (!parseMonths(m[2]).length) out.warnings.push(`${current.title}: couldn't read the months in "${lead}".`);
        } else {
          current.intro = [current.intro, text(node)].filter(Boolean).join('\n\n');
        }
        continue;
      }
      if (tag === 'TABLE') {
        const { header, body } = tableBody(node);
        if (!pendingModule) {
          out.warnings.push(`${current.title}: a lesson table has no bold module line above it, so it was skipped.`);
          continue;
        }
        if (!/Week/i.test(header[0] ?? '') || header.length < 3) {
          out.warnings.push(`${current.title} · ${pendingModule.title}: table columns "${header.join(' | ')}" weren't recognised.`);
          continue;
        }
        for (const [week, a, b] of body) {
          if (!isEmptyCell(a)) addLesson(pendingModule, `Week ${week} · Lesson A`, a, '');
          if (!isEmptyCell(b)) addLesson(pendingModule, `Week ${week} · Lesson B`, b, '');
        }
        if (body.length !== 4)
          out.warnings.push(`${current.title} · ${pendingModule.title}: expected 4 weeks, found ${body.length}.`);
        pendingModule = null;
      }
      continue;
    }

    // ── Grades 5–8 ───────────────────────────────────────────────
    if (h2 === 'Grades 5–8' && current) {
      if (tag === 'P') {
        current.intro = [current.intro, text(node)].filter(Boolean).join('\n\n');
        continue;
      }
      if (tag !== 'TABLE') continue;
      const { header, body } = tableBody(node);
      if (!/Module/i.test(header[0] ?? '')) {
        out.warnings.push(`${current.title}: table columns "${header.join(' | ')}" weren't recognised.`);
        continue;
      }
      for (const [first, ...lessonCells] of body) {
        const m = /^(?:M(\d+)\s+)?(.*?)\s*\(([^)]+)\)$/.exec(first);
        if (!m) {
          out.warnings.push(`${current.title}: couldn't read the module cell "${first}".`);
          continue;
        }
        const title = m[1] ? `Module ${m[1]}: ${m[2]}` : m[2];
        const mod = newModule(current.key, {
          title,
          months: m[3],
          monthNums: parseMonths(m[3]),
          keyLanguage: '',
          songs: '',
          resources: '',
          notes: '',
        });
        lessonCells.forEach((cell, i) => {
          if (!isEmptyCell(cell)) addLesson(mod, `Lesson ${i + 1}`, cell, '');
        });
      }
      continue;
    }

    // ── Library ──────────────────────────────────────────────────
    if (h2 === 'Games bank' && tag === 'TABLE') {
      const { header, body } = tableBody(node);
      if (!/Game/i.test(header[0] ?? '')) {
        out.warnings.push(`Games bank: table columns "${header.join(' | ')}" weren't recognised.`);
        continue;
      }
      for (const [name, levels, how, prep] of body) {
        out.games.push({
          id: `game-${slug(name)}`,
          name,
          levels,
          levelTags: parseLevels(levels),
          howItWorks: how ?? '',
          prep: prep ?? '',
        });
      }
      continue;
    }

    if (h2 === 'Resources' && tag === 'TABLE') {
      const trs = node.querySelectorAll('tr');
      const header = trs[0]?.querySelectorAll('td,th').map(text) ?? [];
      if (!/Resource/i.test(header[0] ?? '')) {
        out.warnings.push(`Resources: table columns "${header.join(' | ')}" weren't recognised.`);
        continue;
      }
      for (const tr of trs.slice(1)) {
        const cells = tr.querySelectorAll('td,th');
        const [name, useFor, levels] = cells.map(text);
        if (!name) continue;
        const link = cells[0].querySelector('a')?.getAttribute('href') ?? '';
        out.resources.push({
          id: `res-${slug(name).slice(0, 40)}`,
          name,
          useFor: useFor ?? '',
          levels: levels ?? '',
          levelTags: levels ? parseLevels(levels) : [],
          link,
        });
      }
      continue;
    }
  }
  closePending();

  linkLibrary(out);

  for (const c of out.curricula) {
    if (!out.modules.some((m) => m.curriculumKey === c.key)) out.warnings.push(`${c.title} has no modules.`);
  }
  if (!out.games.length) out.warnings.push('No games were found in "## Games bank".');
  if (!out.resources.length) out.warnings.push('No resources were found in "## Resources".');
  return out;
}

function parseFramework(h3: string, table: HTMLElement): SeedFramework | null {
  const { header, body } = tableBody(table);
  const toMin = (s: string) => (isEmptyCell(s) ? 0 : Number(s.replace(/[^\d]/g, '')) || 0);

  if (/^Kindergarten/i.test(h3)) {
    // Stage | Little (15) | Middle (20) | Older (30) | What happens
    const lengths = header.slice(1, -1).map((h) => Number(/\((\d+)\)/.exec(h)?.[1]));
    if (lengths.some((n) => !n)) return null;
    return {
      id: 'fw-kg',
      name: 'Kindergarten',
      appliesTo: 'kindergarten',
      variant: '',
      stages: body.map((r) => ({
        name: r[0],
        minutesByLength: Object.fromEntries(lengths.map((len, i) => [len, toMin(r[i + 1])])),
        description: r[r.length - 1],
      })),
    };
  }
  const len = Number(/(\d+)\s*min/.exec(h3)?.[1] ?? 40);
  const simple = (id: string, name: string, appliesTo: SeedFramework['appliesTo'], variant: string): SeedFramework => ({
    id,
    name,
    appliesTo,
    variant,
    stages: body.map((r) => ({ name: r[0], minutesByLength: { [len]: toMin(r[1]) }, description: r[2] ?? '' })),
  });
  if (!/Min/i.test(header[1] ?? '')) return null;
  if (/Grades 2–4, Lesson A/i.test(h3)) return simple('fw-primary-a', 'Primary · Lesson A', 'primary', 'A');
  if (/Grades 2–4, Lesson B/i.test(h3)) return simple('fw-primary-b', 'Primary · Lesson B', 'primary', 'B');
  if (/Grades 5–8/i.test(h3)) return simple('fw-secondary', 'Secondary speaking club', 'secondary', '');
  return null;
}

/** Names a game can be recognised by inside lesson text. */
export function gameAliases(name: string): string[] {
  return name
    .split(' / ')
    .map((p) =>
      p
        .replace(/\(.*?\)/g, '')
        .replace(/[…?]/g, '')
        .trim(),
    )
    .filter((p) => p.length >= 4);
}

function mentions(haystack: string, needle: string): boolean {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]");
  return new RegExp(`(^|[^A-Za-z])${esc}`, 'i').test(haystack);
}

/** Connect lessons to the games and resources their text mentions. */
function linkLibrary(out: ParseResult) {
  for (const l of out.lessons) {
    const hay = `${l.focus} ${l.activities}`;
    l.gameIds = out.games.filter((g) => gameAliases(g.name).some((a) => mentions(hay, a))).map((g) => g.id);
    l.resourceIds = out.resources
      .filter((r) => r.name.split(' ').length <= 3 && mentions(hay, r.name))
      .map((r) => r.id);
  }
}
