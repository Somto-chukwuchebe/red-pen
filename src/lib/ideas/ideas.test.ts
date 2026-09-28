import { describe, expect, it } from 'vitest';
import { extractContent } from './content';
import { generateIdeas, type IdeaInput } from './generate';

const base: IdeaInput = {
  lessonId: 'l1',
  keyLanguage: 'frog, horse, chimp, bird, fish · jump, run, swim, fly · I can… / I can’t… · Can you…? Yes, I can. / No, I can’t.',
  focus: 'Can you swim? Yes, I can.',
  moduleTitle: 'Module 3: My animals!',
  band: 'primary',
  levelTag: '2',
  languageSubject: true,
  library: [],
  lessonGameIds: [],
  recentGameIds: [],
  lang: 'en',
};

describe('reading a lesson’s language', () => {
  it('finds words, questions and sentence frames', () => {
    const c = extractContent(base.keyLanguage, base.focus);
    expect(c.words).toEqual(expect.arrayContaining(['frog', 'horse', 'chimp', 'jump', 'swim']));
    expect(c.questions).toEqual(expect.arrayContaining(['Can you…?', 'Can you swim?']));
    expect(c.frames).toEqual(expect.arrayContaining(['I can… / I can’t…']));
  });

  it('handles kindergarten themes and secondary focus lines', () => {
    expect(extractContent('Weeks 1–2: Hello, bye-bye (wave) · Weeks 3–4: Clap, jump, stamp', 'Hello, bye-bye (wave)').words).toEqual([
      'Hello', 'bye-bye (wave)', 'Clap', 'jump', 'stamp',
    ]);
    const c = extractContent('', 'Celebrity passports mingle: Where are you from?');
    expect(c.questions).toEqual(['Where are you from?']);
    expect(c.topic).toBe('Celebrity passports mingle');
  });
});

describe('activity ideas', () => {
  it('fills ideas with the lesson’s own language', () => {
    const ideas = generateIdeas(base);
    expect(ideas).toHaveLength(6);
    expect(ideas.some((i) => /frog, horse, chimp/.test(i.text))).toBe(true);
    expect(ideas.some((i) => /Can you/.test(i.text))).toBe(true);
    expect(ideas.every((i) => !/\{\w+\}/.test(i.text))).toBe(true);
    // The module title is the topic, without its "Module 3:" label.
    const all = generateIdeas({ ...base, count: 40 });
    expect(all.some((i) => /My animals!/.test(i.text))).toBe(true);
    expect(all.some((i) => /Module 3|about Can you swim/.test(i.text))).toBe(false);
  });

  it('puts the lesson’s own games first and links patterns to library games', () => {
    const library = [
      { id: 'g-hs', name: 'Hot seat', howItWorks: 'Interview a character.', levelTags: ['3', '4'], energy: '' as const },
      { id: 'g-bingo', name: 'Picture bingo / Bingo', howItWorks: 'Grid of pictures.', levelTags: ['2'], energy: 'calm' as const },
    ];
    const ideas = generateIdeas({ ...base, library, lessonGameIds: ['g-hs'], count: 20 });
    expect(ideas[0]).toMatchObject({ gameId: 'g-hs', source: 'lesson' });
    const bingo = ideas.find((i) => i.gameId === 'g-bingo');
    expect(bingo).toMatchObject({ source: 'library', title: 'Picture bingo / Bingo' });
    expect(bingo!.text).toMatch(/frog/);
  });

  it('marks and demotes games used with this group recently', () => {
    const library = [{ id: 'g-bingo', name: 'Bingo', howItWorks: '…', levelTags: [], energy: 'calm' as const }];
    const fresh = generateIdeas({ ...base, library, count: 30 });
    const stale = generateIdeas({ ...base, library, recentGameIds: ['g-bingo'], count: 30 });
    expect(stale.find((i) => i.gameId === 'g-bingo')?.recentlyUsed).toBe(true);
    expect(stale.findIndex((i) => i.gameId === 'g-bingo')).toBeGreaterThan(fresh.findIndex((i) => i.gameId === 'g-bingo'));
  });

  it('suits the age group and subject', () => {
    const kg = generateIdeas({ ...base, band: 'kg', count: 30 });
    expect(kg.some((i) => i.id === 'two-truths' || i.id === 'four-corners')).toBe(false);
    const maths = generateIdeas({ ...base, languageSubject: false, keyLanguage: 'fractions, halves, quarters', focus: 'Adding fractions', count: 30 });
    expect(maths.some((i) => i.id === 'find-someone' || i.id === 'mystery-bag')).toBe(false);
    expect(maths.some((i) => /fractions/.test(i.text))).toBe(true);
  });

  it('gives a different set for “More ideas”, in Russian when asked', () => {
    const a = generateIdeas(base).map((i) => i.id);
    const b = generateIdeas({ ...base, variant: 1 }).map((i) => i.id);
    expect(b).not.toEqual(a);
    expect(generateIdeas({ ...base, lang: 'ru' }).some((i) => /[а-я]/i.test(i.text))).toBe(true);
  });
});
