import { beforeEach, describe, expect, it } from 'vitest';
import { _useDatabase, db } from './db';
import { SEED_GROUPS } from '../seed/groups';
import { ensureSeeded, exampleSetup, reloadCurriculum, setupNewDevice } from './seed';

let n = 0;
beforeEach(() => {
  _useDatabase(`test-seed-${++n}`);
});

describe('first-run seeding', () => {
  it('creates 16 groups, the calendar and the curriculum once', async () => {
    expect(await ensureSeeded()).toBe(true);
    expect(await ensureSeeded()).toBe(false);
    expect(await db.groups.count()).toBe(16);
    expect(await db.curricula.count()).toBe(10);
    expect((await db.settings.get('settings'))?.quarters).toHaveLength(4);
  });

  it('starts primary and kindergarten at Week 2 · Lesson A and secondary at Module 1', async () => {
    await ensureSeeded();
    const pointer = async (id: string) => {
      const g = await db.groups.get(id);
      const l = await db.lessons.get(g!.currentPlannedLessonId!);
      const m = await db.modules.get(l!.moduleId);
      return `${m!.title} / ${l!.label}`;
    };
    expect(await pointer('g-2a')).toMatch(/^Starter.* \/ Week 2 · Lesson A$/);
    expect(await pointer('g-kg-middle')).toMatch(/ \/ Week 2 · Lesson A$/);
    expect(await pointer('g-6a')).toMatch(/^Module 1: Who's who\? \/ Lesson 1$/);
    expect(await pointer('g-5b')).toMatch(/^Module 1: School days \/ Lesson 1$/);
  });

  it('reloading the curriculum keeps pointers and hand-added modules', async () => {
    await ensureSeeded();
    await db.modules.put({ id: 'my-own', curriculumKey: 'grade-2', order: 99, title: 'Extra', months: '', monthNums: [], keyLanguage: '', songs: '', resources: '', notes: '', updatedAt: 1 });
    const before = (await db.groups.get('g-3a'))!.currentPlannedLessonId;
    await reloadCurriculum();
    expect((await db.groups.get('g-3a'))!.currentPlannedLessonId).toBe(before);
    expect(await db.modules.get('my-own')).toBeTruthy();
  });
});

describe('the setup wizard for another teacher', () => {
  it('creates only their own groups, without the English curriculum', async () => {
    const ex = exampleSetup();
    await setupNewDevice({
      ...ex,
      subject: 'Математика',
      language: 'ru',
      teacherName: 'Анна',
      includeBuiltInCurriculum: false,
      groups: [{ ...SEED_GROUPS[0], id: 'g-x', name: '6В', curriculumKey: '', startAt: undefined }],
    });
    expect((await db.groups.toArray()).map((g) => [g.name, g.currentPlannedLessonId])).toEqual([['6В', null]]);
    expect(await db.curricula.count()).toBe(0);
    expect(await db.games.count()).toBe(0);
    expect(await db.settings.get('settings')).toMatchObject({ subject: 'Математика', language: 'ru', teacherName: 'Анна' });
  });

  it('keeps chosen example groups on the built-in curriculum', async () => {
    const ex = exampleSetup();
    await setupNewDevice({ ...ex, groups: ex.groups.filter((g) => g.name === '3b' || g.name === 'KG Little') });
    const groups = await db.groups.toArray();
    expect(groups.map((g) => g.name)).toEqual(['3b', 'KG Little']);
    expect(groups.every((g) => g.currentPlannedLessonId)).toBe(true);
  });
});
