import { beforeEach, describe, expect, it } from 'vitest';
import { parseCurriculumHtml } from '../import/parseCurriculum';
import { SEED_GROUPS } from '../seed/groups';
import { importSampleCurriculum, SAMPLE_CURRICULUM_HTML } from '../test/fixtures';
import { importCurriculum } from './curriculumImport';
import { _useDatabase, db } from './db';
import { ensureSeeded, exampleSetup, setupNewDevice } from './seed';

let n = 0;
beforeEach(() => {
  _useDatabase(`test-seed-${++n}`);
});

describe('setting up a new device', () => {
  it('creates the example groups and calendar once, with no built-in curriculum or games', async () => {
    expect(await ensureSeeded()).toBe(true);
    expect(await ensureSeeded()).toBe(false);
    expect(await db.groups.count()).toBe(16);
    expect((await db.settings.get('settings'))?.quarters).toHaveLength(4);
    expect(await db.curricula.count()).toBe(0);
    expect(await db.games.count()).toBe(0);
    expect(await db.resources.count()).toBe(0);
    expect((await db.groups.toArray()).every((g) => g.curriculumKey === '' && g.textbook === '')).toBe(true);
  });

  it("creates only another teacher's own groups", async () => {
    await setupNewDevice({
      ...exampleSetup(),
      subject: 'Математика',
      language: 'ru',
      teacherName: 'Анна',
      groups: [{ ...SEED_GROUPS[0], id: 'g-x', name: '6В' }],
    });
    expect((await db.groups.toArray()).map((g) => [g.name, g.currentPlannedLessonId])).toEqual([['6В', null]]);
    expect(await db.settings.get('settings')).toMatchObject({ subject: 'Математика', language: 'ru', teacherName: 'Анна' });
  });
});

describe('importing a curriculum from a document', () => {
  beforeEach(async () => {
    await ensureSeeded();
  });

  it('adds curricula, lessons, frameworks and the library, and starts linked groups at lesson 1', async () => {
    const out = await importSampleCurriculum();
    expect(out).toMatchObject({ curricula: 5, games: 4, resources: 1, groupsStarted: 2 });
    const g = (await db.groups.get('g-2a'))!;
    expect((await db.lessons.get(g.currentPlannedLessonId!))!.label).toBe('Week 1 · Lesson A');
    expect(await db.frameworks.count()).toBe(2);
  });

  it('re-importing keeps group positions, lesson plans, hand-made modules and library edits', async () => {
    await importSampleCurriculum();
    const lessons = await db.lessons.where('moduleId').equals('grade-2-m01').sortBy('order');
    await db.groups.update('g-2a', { currentPlannedLessonId: lessons[3].id });
    await db.lessons.update(lessons[3].id, { stages: [{ name: 'Warm-up', minutes: 5, notes: '' }] });
    await db.modules.put({ id: 'my-own', curriculumKey: 'grade-2', order: 99, title: 'Extra', months: '', monthNums: [], keyLanguage: '', songs: '', resources: '', notes: '', updatedAt: 1 });
    await db.games.update('game-hot-seat', { energy: 'lively' });

    await importCurriculum(parseCurriculumHtml(SAMPLE_CURRICULUM_HTML));
    expect((await db.groups.get('g-2a'))!.currentPlannedLessonId).toBe(lessons[3].id);
    expect((await db.lessons.get(lessons[3].id))!.stages).toHaveLength(1);
    expect(await db.modules.get('my-own')).toBeTruthy();
    expect((await db.games.get('game-hot-seat'))!.energy).toBe('lively');
  });

  it('removes imported lessons that were taken out of the document', async () => {
    await importSampleCurriculum();
    const shorter = SAMPLE_CURRICULUM_HTML.replace(/<tr><td>4<\/td><td>Recall with Flash and guess<\/td><td>House tour<\/td><\/tr>/, '');
    await importCurriculum(parseCurriculumHtml(shorter));
    expect(await db.lessons.where('moduleId').equals('grade-2-m01').count()).toBe(6);
  });
});
