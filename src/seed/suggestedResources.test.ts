import { describe, expect, it } from 'vitest';
import { SUGGESTIONS, subjectTags, suggestionsFor, suggestionToResource } from './suggestedResources';

describe('suggested resources', () => {
  it('recognises the subject in English or Russian', () => {
    expect(subjectTags('English')).toEqual(['english']);
    expect(subjectTags('Английский язык')).toEqual(['english']);
    expect(subjectTags('Немецкий язык')).toEqual(['languages']);
    expect(subjectTags('Математика')).toEqual(['maths']);
    expect(subjectTags('Окружающий мир')).toEqual(['science']);
    expect(subjectTags('Русский язык и литература')).toEqual(['russian']);
    expect(subjectTags('Chess')).toEqual(['any']);
  });

  it('suggests English resources (including the owner’s own) but no Spotlight materials', () => {
    const names = suggestionsFor('english').map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Super Simple Songs', 'Wordwall', 'Breaking News English', 'LearnEnglish Kids (British Council)']));
    expect(SUGGESTIONS.some((s) => /spotlight/i.test(s.name + s.en))).toBe(false);
  });

  it('are all online and have unique ids', () => {
    expect(SUGGESTIONS.every((s) => /^https:\/\//.test(s.url))).toBe(true);
    expect(new Set(SUGGESTIONS.map((s) => s.id)).size).toBe(SUGGESTIONS.length);
  });

  it('puts the subject’s own resources first, then tools for any subject, filtered by level', () => {
    const maths = suggestionsFor('maths');
    expect(maths[0].subjects).toContain('maths');
    expect(maths.some((s) => s.name === 'Flippity')).toBe(true);
    expect(suggestionsFor('english', 'KG').every((s) => s.levels.startsWith('KG'))).toBe(true);
  });

  it('becomes an editable library resource in the teacher’s language', () => {
    const r = suggestionToResource(SUGGESTIONS.find((s) => s.id === 'geogebra')!, 'ru');
    expect(r).toMatchObject({ id: 'sugg-geogebra', link: 'https://www.geogebra.org', custom: true, levelTags: ['5', '6', '7', '8', '9', '10', '11'] });
    expect(r.useFor).toMatch(/геометрия/);
  });
});
