import { beforeEach, describe, expect, it } from 'vitest';
import { _useDatabase, db } from './db';
import { deleteGroup, deleteLog, saveLog, type LogDraft } from './logs';
import { importSampleCurriculum } from '../test/fixtures';
import { ensureSeeded } from './seed';

let n = 0;
beforeEach(async () => {
  _useDatabase(`test-logs-${++n}`);
  await ensureSeeded();
  await importSampleCurriculum();
  await db.students.bulkPut([
    { id: 's1', groupId: 'g-2a', name: 'Masha', notes: '', active: true, updatedAt: 1 },
    { id: 's2', groupId: 'g-2a', name: 'Petya', notes: '', active: true, updatedAt: 1 },
  ]);
});

async function draft(extra: Partial<LogDraft> = {}): Promise<LogDraft> {
  const g = (await db.groups.get('g-2a'))!;
  return {
    groupId: 'g-2a',
    date: '2026-09-28',
    plannedLessonId: g.currentPlannedLessonId,
    status: 'taught',
    whatWorked: ['Game'],
    whatToChange: '',
    energy: 4,
    absentStudentIds: [],
    ratings: {},
    gameIds: [],
    notes: '',
    ...extra,
  };
}

const pointerLabel = async () => (await db.lessons.get((await db.groups.get('g-2a'))!.currentPlannedLessonId!))!.label;

describe('saving a lesson log', () => {
  it('moves the group on to the next lesson', async () => {
    expect(await pointerLabel()).toBe('Week 1 · Lesson A');
    await saveLog(await draft());
    expect(await pointerLabel()).toBe('Week 1 · Lesson B');
  });

  it("doesn't move on for a cancelled lesson or a test-week review", async () => {
    await saveLog(await draft({ status: 'cancelled' }));
    await saveLog(await draft({ status: 'review' }));
    expect(await pointerLabel()).toBe('Week 1 · Lesson A');
  });

  it('respects a manual override, and editing an old log does not move it again', async () => {
    const week4 = (await db.lessons.where('moduleId').equals('grade-2-m01').toArray()).find((l) => l.label === 'Week 4 · Lesson A')!;
    const log = await saveLog(await draft({ nextPointer: week4.id }));
    expect(await pointerLabel()).toBe('Week 4 · Lesson A');
    await saveLog({ ...(await draft()), id: log.id, notes: 'edited' });
    expect(await pointerLabel()).toBe('Week 4 · Lesson A');
    expect((await db.logs.get(log.id))!.notes).toBe('edited');
  });

  it('records participation ratings, ignoring absent students, and cleans up on edit and delete', async () => {
    const log = await saveLog(await draft({ ratings: { s1: 4, s2: 2 }, absentStudentIds: ['s2'] }));
    expect(await db.participation.where('lessonLogId').equals(log.id).toArray()).toMatchObject([{ studentId: 's1', rating: 4 }]);
    await saveLog({ ...(await draft()), id: log.id, ratings: {} });
    expect(await db.participation.count()).toBe(0);
    await deleteLog(log.id);
    expect(await db.logs.count()).toBe(0);
  });

  it('keeps speaking counts from older logs when a log is edited', async () => {
    const log = await saveLog(await draft());
    await db.participation.put({ id: `${log.id}:s1`, studentId: 's1', lessonLogId: log.id, rating: null, spoke: 3, volunteered: false, helpedOthers: false, note: '', updatedAt: 1 });
    await saveLog({ ...(await draft()), id: log.id, ratings: { s1: 5 } });
    expect(await db.participation.get(`${log.id}:s1`)).toMatchObject({ rating: 5, spoke: 3 });
  });

  it('deleting a group removes its students and logs too', async () => {
    await saveLog(await draft({ ratings: { s1: 3 } }));
    await deleteGroup('g-2a');
    expect(await db.groups.get('g-2a')).toBeUndefined();
    expect(await db.students.count()).toBe(0);
    expect(await db.logs.count()).toBe(0);
    expect(await db.participation.count()).toBe(0);
  });
});
