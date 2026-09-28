import { beforeEach, describe, expect, it } from 'vitest';
import { importSampleCurriculum } from '../test/fixtures';
import { createCurriculum, deleteCurriculum, deleteLesson, deleteModule, moveItem, saveLesson, saveModule } from './curriculumEdit';
import { importCurriculum } from './curriculumImport';
import { _useDatabase, db } from './db';
import { ensureSeeded } from './seed';
import { parseCurriculumHtml } from '../import/parseCurriculum';
import { SAMPLE_CURRICULUM_HTML } from '../test/fixtures';

let n = 0;
beforeEach(async () => {
  _useDatabase(`test-edit-${++n}`);
  await ensureSeeded();
});

const lessonsOf = async (moduleId: string) => (await db.lessons.where('moduleId').equals(moduleId).sortBy('order')).map((l) => l.label);

describe('building a curriculum by hand', () => {
  it('creates a curriculum, modules and lessons, and starts linked groups at the first lesson', async () => {
    const c = await createCurriculum('Maths 6', 'secondary', 6);
    await db.groups.update('g-6a', { curriculumKey: c.key });
    const m = await saveModule({ curriculumKey: c.key, title: 'Fractions', months: 'Сен–Окт', keyLanguage: 'half, quarter', songs: '', resources: '', notes: '' });
    expect(m.monthNums).toEqual([9, 10]);
    const l = await saveLesson({ moduleId: m.id, label: 'Lesson 1', focus: 'What is a half?', activities: '' });
    await saveLesson({ moduleId: m.id, label: 'Lesson 2', focus: 'Adding halves', activities: '' });
    expect(await lessonsOf(m.id)).toEqual(['Lesson 1', 'Lesson 2']);
    expect((await db.groups.get('g-6a'))!.currentPlannedLessonId).toBe(l.id);
  });

  it('reorders lessons and modules', async () => {
    const c = await createCurriculum('Test', 'primary', 2);
    const m = await saveModule({ curriculumKey: c.key, title: 'A', months: '', keyLanguage: '', songs: '', resources: '', notes: '' });
    const l1 = await saveLesson({ moduleId: m.id, label: 'One', focus: '', activities: '' });
    await saveLesson({ moduleId: m.id, label: 'Two', focus: '', activities: '' });
    await moveItem('lessons', l1.id, 1);
    expect(await lessonsOf(m.id)).toEqual(['Two', 'One']);
    await moveItem('lessons', l1.id, 1); // already last: nothing happens
    expect(await lessonsOf(m.id)).toEqual(['Two', 'One']);
  });

  it('moves groups on when their next lesson or module is deleted', async () => {
    await importSampleCurriculum();
    const lessons = await db.lessons.where('moduleId').equals('grade-2-m01').sortBy('order');
    await db.groups.update('g-2a', { currentPlannedLessonId: lessons[2].id });
    await deleteLesson(lessons[2].id);
    expect((await db.groups.get('g-2a'))!.currentPlannedLessonId).toBe(lessons[3].id);
    await deleteModule('grade-2-m01');
    expect((await db.groups.get('g-2a'))!.currentPlannedLessonId).toBeNull();
    expect(await db.lessons.where('moduleId').equals('grade-2-m01').count()).toBe(0);
  });

  it('keeps hand-made lessons when the document is re-imported', async () => {
    await importSampleCurriculum();
    const extra = await saveLesson({ moduleId: 'grade-2-m01', label: 'Bonus', focus: 'Show and tell', activities: '' });
    await importCurriculum(parseCurriculumHtml(SAMPLE_CURRICULUM_HTML));
    expect(await db.lessons.get(extra.id)).toBeTruthy();
  });

  it('deleting a curriculum unlinks its groups', async () => {
    await importSampleCurriculum();
    await deleteCurriculum('grade-2');
    expect(await db.groups.get('g-2a')).toMatchObject({ curriculumKey: '', currentPlannedLessonId: null });
    expect(await db.modules.where('curriculumKey').equals('grade-2').count()).toBe(0);
  });
});
