// Activity ideas for a lesson, generated on the device (no internet, no AI service).
//
// 1. Read the lesson's key language and focus (content.ts).
// 2. Pick activity patterns that fit that language, the age group and the subject.
// 3. Prefer the teacher's own games: games already linked to the lesson first, then
//    library games matching a pattern. Games played with this group recently go last.
// 4. Fill each idea with the lesson's own words, questions and sentence frames.

import type { Game } from '../../domain/types';
import { extractContent, type LessonContent } from './content';
import { PATTERNS, type Band, type Pattern, type StageHint } from './patterns';

export interface IdeaInput {
  lessonId: string;
  keyLanguage: string;
  focus: string;
  /** The module's title, used as the topic when the focus is a sentence. */
  moduleTitle?: string;
  band: Band;
  /** Level tag used by the library ("KG", "2" … "11"). */
  levelTag?: string;
  languageSubject: boolean;
  library: Pick<Game, 'id' | 'name' | 'howItWorks' | 'levelTags' | 'energy'>[];
  lessonGameIds: string[];
  /** Games used with this group in its recent lessons. */
  recentGameIds: string[];
  lang: 'en' | 'ru';
  /** 0 for the first set; 1, 2… for "More ideas". */
  variant?: number;
  count?: number;
}

export interface Idea {
  id: string;
  title: string;
  text: string;
  stage: StageHint;
  energy: 'calm' | 'medium' | 'lively' | '';
  gameId?: string;
  source: 'lesson' | 'library' | 'pattern';
  recentlyUsed: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-zа-яё0-9' ]+/gi, ' ').replace(/\s+/g, ' ').trim();

/** Names a library game can be known by ("Kim's game / What's missing?" → both). */
const aliases = (name: string) =>
  name
    .split(' / ')
    .map((p) => norm(p.replace(/\(.*?\)/g, '')))
    .filter((p) => p.length >= 3);

function libraryMatch(p: Pattern, library: IdeaInput['library']) {
  const target = norm(p.game);
  return library.find((g) => aliases(g.name).some((a) => a === target || a.includes(target) || target.includes(a)));
}

/** Small deterministic shuffle so "More ideas" gives a different, repeatable set. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function fill(template: string, c: LessonContent, pick: number): string {
  const at = <T,>(xs: T[], fallback: T) => (xs.length ? xs[pick % xs.length] : fallback);
  const words = c.words.length ? c.words.slice(0, 6).join(', ') : c.topic;
  return template
    .replace(/\{words\}/g, words)
    .replace(/\{word\}/g, at(c.words, c.topic))
    .replace(/\{question\}/g, at(c.questions, "What's this?"))
    .replace(/\{frame\}/g, at(c.frames, c.questions[0] ?? c.topic))
    .replace(/\{topic\}/g, c.topic || at(c.words, ''))
    .replace(/([!?…])([.»”]?)\./g, '$1$2');
}

const suits = (p: Pattern, c: LessonContent, input: IdeaInput) => {
  if (!p.bands.includes(input.band)) return false;
  if (p.subject === 'language' && !input.languageSubject) return false;
  if (p.needs === 'words') return c.words.length >= 2;
  if (p.needs === 'questions') return c.questions.length >= 1;
  if (p.needs === 'frames') return c.frames.length >= 1;
  return !!c.topic;
};

export function generateIdeas(input: IdeaInput): Idea[] {
  const { lang, variant = 0, count = 6 } = input;
  const c = extractContent(input.keyLanguage, input.focus);
  // A focus like "Can you swim? Yes, I can." isn't a topic; use the module title ("My animals!") instead.
  // The module is the best topic ("Hello! and My family", "School days"); drop labels like "Module 3:" or "Starter:".
  const moduleTopic = (input.moduleTitle ?? '').replace(/^([^:]{0,40}\b(module|starter|unit|review|модуль|раздел|тема)\b[^:]*):\s*/i, '').trim();
  if (moduleTopic) c.topic = moduleTopic;
  // Complete questions and frames ("Can you swim?") before templates ("Can you…?").
  const templated = (s: string) => (/…|\.\.\./.test(s) ? 1 : 0);
  c.questions.sort((a, b) => templated(a) - templated(b));
  c.frames.sort((a, b) => templated(a) - templated(b));
  const recent = new Set(input.recentGameIds);
  const rand = seeded(`${input.lessonId}|${variant}`);
  const ideas: (Idea & { score: number; need?: string })[] = [];
  const usedGames = new Set<string>();

  // 1. Games already linked to this lesson in the curriculum.
  for (const id of input.lessonGameIds) {
    const g = input.library.find((x) => x.id === id);
    if (!g) continue;
    usedGames.add(g.id);
    const words = c.words.length ? (lang === 'ru' ? ` Слова: ${c.words.slice(0, 6).join(', ')}.` : ` Use: ${c.words.slice(0, 6).join(', ')}.`) : '';
    ideas.push({ id: `game-${g.id}`, title: g.name, text: `${g.howItWorks}${words}`, stage: 'practice', energy: g.energy, gameId: g.id, source: 'lesson', recentlyUsed: recent.has(g.id), score: 100 - (recent.has(g.id) ? 50 : 0) });
  }

  // 2. Patterns that fit the lesson, linked to the teacher's own game when there is one.
  const specificity = { questions: 3, frames: 3, words: 2, topic: 1 } as const;
  PATTERNS.filter((p) => suits(p, c, input)).forEach((p, i) => {
    const game = libraryMatch(p, input.library);
    if (game && usedGames.has(game.id)) return;
    if (game) usedGames.add(game.id);
    const text = lang === 'ru' ? p.ru : p.en;
    const isRecent = !!game && recent.has(game.id);
    ideas.push({
      id: p.id,
      title: game ? game.name : text.title,
      text: fill(text.text, c, variant + i),
      stage: p.stage,
      energy: p.energy,
      gameId: game?.id,
      source: game ? 'library' : 'pattern',
      recentlyUsed: isRecent,
      score: specificity[p.needs] * 10 + (game ? 8 : 0) - (isRecent ? 25 : 0) + rand() * 12,
      need: p.needs,
    });
  });

  // 3. Other games from the teacher's library suitable for this level.
  for (const g of input.library) {
    if (usedGames.has(g.id) || recent.has(g.id)) continue;
    if (input.levelTag && g.levelTags.length && !g.levelTags.includes(input.levelTag)) continue;
    const words = c.words.length ? (lang === 'ru' ? ` Слова урока: ${c.words.slice(0, 6).join(', ')}.` : ` Today’s words: ${c.words.slice(0, 6).join(', ')}.`) : '';
    ideas.push({ id: `lib-${g.id}`, title: g.name, text: `${g.howItWorks}${words}`, stage: 'practice', energy: g.energy, gameId: g.id, source: 'library', recentlyUsed: false, score: 12 + rand() * 12 });
  }

  // Pick the best, keeping a mix of lesson stages and energy levels.
  const sorted = ideas.sort((a, b) => b.score - a.score);
  const chosen: typeof sorted = [];
  const skip = variant * Math.max(1, Math.floor(count / 2));
  const pool = variant ? [...sorted.slice(skip), ...sorted.slice(0, skip)] : sorted;
  for (const idea of pool) {
    if (chosen.length >= count) break;
    const sameStage = chosen.filter((x) => x.stage === idea.stage).length;
    const sameEnergy = chosen.filter((x) => x.energy && x.energy === idea.energy).length;
    const sameNeed = idea.need ? chosen.filter((x) => x.need === idea.need).length : 0;
    const cap = Math.ceil(count / 3);
    if (idea.source !== 'lesson' && (sameNeed >= cap || sameStage >= Math.ceil(count / 2) || sameEnergy >= Math.ceil(count / 2))) continue;
    chosen.push(idea);
  }
  for (const idea of pool) if (chosen.length < count && !chosen.includes(idea)) chosen.push(idea);
  return chosen.map(({ score: _s, need: _n, ...rest }) => rest);
}
