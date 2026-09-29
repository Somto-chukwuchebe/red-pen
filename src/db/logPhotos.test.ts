// @vitest-environment node
// (Node has real Blobs; jsdom's can't be stored in the test database.)
import { beforeEach, describe, expect, it } from 'vitest';
import type { StoredFile } from '../domain/types';
import { _useDatabase, db } from './db';
import { deleteGroup, deleteLog, saveLog, type LogDraft } from './logs';
import { ensureSeeded } from './seed';

let n = 0;
beforeEach(async () => {
  _useDatabase(`test-log-photos-${++n}`);
  await ensureSeeded();
});

const photo = (id: string): StoredFile => ({ id, name: `${id}.jpg`, type: 'image/jpeg', size: 3, blob: new Blob(['jpg'], { type: 'image/jpeg' }), updatedAt: 0 });
const draft = (extra: Partial<LogDraft> = {}): LogDraft => ({
  groupId: 'g-2a',
  date: '2026-09-28',
  plannedLessonId: null,
  status: 'taught',
  whatWorked: [],
  whatToChange: '',
  energy: null,
  absentStudentIds: [],
  ratings: {},
  gameIds: [],
  notes: '',
  ...extra,
});

describe('photos on a lesson log', () => {
  it('saves new photos with the log, and only those still attached', async () => {
    const log = await saveLog(draft({ photoIds: ['p1', 'p2'], newPhotos: [photo('p1'), photo('p2'), photo('p3')] }));
    expect(log.photoIds).toEqual(['p1', 'p2']);
    expect((await db.files.toArray()).map((f) => f.id).sort()).toEqual(['p1', 'p2']);
    expect(await (await db.files.get('p1'))!.blob.text()).toBe('jpg');
  });

  it('removing a photo when editing deletes it (and remembers the deletion for sync)', async () => {
    const log = await saveLog(draft({ photoIds: ['p1', 'p2'], newPhotos: [photo('p1'), photo('p2')] }));
    await saveLog(draft({ id: log.id, photoIds: ['p2'] }));
    expect(await db.files.get('p1')).toBeUndefined();
    expect(await db.files.get('p2')).toBeDefined();
    expect(await db.tombstones.get('files:p1')).toBeDefined();
  });

  it('deleting the log or its group deletes its photos', async () => {
    const a = await saveLog(draft({ photoIds: ['p1'], newPhotos: [photo('p1')] }));
    await saveLog(draft({ date: '2026-09-29', photoIds: ['p2'], newPhotos: [photo('p2')] }));
    await deleteLog(a.id);
    expect(await db.files.get('p1')).toBeUndefined();
    await deleteGroup('g-2a');
    expect(await db.files.count()).toBe(0);
  });

  it('a log without photos stays as before', async () => {
    const log = await saveLog(draft());
    expect('photoIds' in log).toBe(false);
  });
});
