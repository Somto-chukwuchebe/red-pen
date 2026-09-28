// @vitest-environment node
// (Node has real Blobs; jsdom's can't be stored in the test database.)
import { beforeEach, describe, expect, it } from 'vitest';
import type { Stamped, StoredFile, Student, Tombstone } from '../domain/types';
import { _useDatabase, db, SYNCED_TABLES } from './db';
import { applyImport, BackupError, buildBackup, parseBackup, planMerge, previewImport, recordSent, syncFrom, syncState } from './backup';
import { getLocal, remove, save, setLocal } from './repo';
import { ensureSeeded } from './seed';

let n = 0;
beforeEach(async () => {
  _useDatabase(`test-backup-${++n}`);
  await ensureSeeded();
  await setLocal('deviceName', 'MacBook');
});

async function snapshot() {
  const out: Record<string, unknown[]> = {};
  for (const t of SYNCED_TABLES) {
    const rows = await db.table(t).toArray();
    out[t] = t === 'files'
      ? await Promise.all(rows.map(async (r: { blob: Blob }) => ({ ...r, blob: await r.blob.text() })))
      : rows;
  }
  return out;
}

describe('export and import', () => {
  it('round-trips everything, including attached files, without loss', async () => {
    await save<Student>('students', { id: 'st1', groupId: 'g-2a', name: 'Маша', notes: 'Shy but keen', active: true });
    await save<StoredFile>('files', { id: 'f1', name: 'song.txt', type: 'text/plain', size: 5, blob: new Blob(['hello'], { type: 'text/plain' }) });
    await remove('students', 'st-gone');
    const before = await snapshot();

    const json = JSON.stringify(await buildBackup());
    const file = parseBackup(json);
    expect(file.deviceName).toBe('MacBook');

    // Import into a completely empty device.
    _useDatabase(`test-backup-empty-${n}`);
    await applyImport(file, 'replace');
    expect(await snapshot()).toEqual(before);
    expect((await db.tombstones.toArray()).map((t) => t.id)).toEqual(['students:st-gone']);
  });

  it('rejects files that are not Red Pen backups', () => {
    expect(() => parseBackup('not json')).toThrow('not-json');
    expect(() => parseBackup('{"hello":1}')).toThrow('not-red-pen');
  });

  it('previews a merge from another device', async () => {
    const file = await buildBackup();
    const g = file.tables.groups!.find((x) => x.id === 'g-2a')!;
    Object.assign(g, { name: '2A (new)', updatedAt: Date.now() + 1000 });
    file.tables.students = [{ id: 'st9', groupId: 'g-2a', name: 'Petya', notes: '', active: true, updatedAt: Date.now() } as Stamped];
    const p = await previewImport(file, 'merge');
    const groups = p.tables.find((t) => t.table === 'groups')!;
    expect(groups).toMatchObject({ updated: 1, added: 0 });
    expect(p.tables.find((t) => t.table === 'students')).toMatchObject({ added: 1 });
    await applyImport(file, 'merge');
    expect((await db.groups.get('g-2a'))?.name).toBe('2A (new)');
    expect(await db.students.get('st9')).toBeTruthy();
  });
});

describe('merge rules', () => {
  const r = (id: string, updatedAt: number, name = id) => ({ id, updatedAt, name }) as Stamped;
  const tomb = (recordId: string, deletedAt: number): Tombstone => ({ id: `students:${recordId}`, table: 'students', recordId, deletedAt });

  it('keeps the newer copy of each record', () => {
    const plan = planMerge('students', [r('a', 10), r('b', 30)], [r('a', 20, 'A2'), r('b', 5), r('c', 1)], [], []);
    expect(plan.put.map((x) => x.id)).toEqual(['a', 'c']);
    expect(plan.preview).toMatchObject({ updated: 1, added: 1, keptLocal: 1 });
  });

  it("doesn't bring back something deleted here after the other device's last edit", () => {
    expect(planMerge('students', [], [r('a', 10)], [tomb('a', 20)], []).put).toEqual([]);
    // …but does if the other device edited it after the delete.
    expect(planMerge('students', [], [r('a', 30)], [tomb('a', 20)], []).put).toHaveLength(1);
  });

  it('applies deletions from the other device unless edited here since', () => {
    expect(planMerge('students', [r('a', 10)], [], [], [tomb('a', 20)]).delete).toEqual(['a']);
    expect(planMerge('students', [r('a', 30)], [], [], [tomb('a', 20)]).delete).toEqual([]);
  });
});

describe('sync between your own devices', () => {
  const state = async () => syncState(await getLocal<number>('lastChangeAt'), await getLocal<number>('lastSentAt'), (await getLocal<{ at: number }>('lastImport'))?.at);

  it('brings changes across, and knows when both devices match', async () => {
    // The MacBook (set up in beforeEach) adds a student and sends its data.
    await save<Student>('students', { id: 'st1', groupId: 'g-2a', name: 'Маша', notes: '', active: true });
    const fromMac = await buildBackup();
    await recordSent(fromMac);
    expect(await state()).toBe('synced');

    // A brand-new iPhone brings it in: everything arrives, and there's nothing to send back.
    _useDatabase(`test-sync-iphone-${n}`);
    await setLocal('deviceName', 'iPhone');
    expect(await state()).toBe('never');
    const first = await syncFrom(parseBackup(JSON.stringify(fromMac)));
    expect(first.from).toBe('MacBook');
    expect(first.changes).toBeGreaterThan(0);
    expect(first.sendBack).toBe(0);
    expect((await db.students.get('st1'))?.name).toBe('Маша');
    expect(await state()).toBe('synced');

    // Bringing the same file in again changes nothing.
    expect((await syncFrom(parseBackup(JSON.stringify(fromMac)))).changes).toBe(0);

    // The iPhone logs something new (a moment later): now it has changes the MacBook needs.
    await new Promise((r) => setTimeout(r, 5));
    await save<Student>('students', { id: 'st2', groupId: 'g-2a', name: 'Lev', notes: '', active: true });
    expect(await state()).toBe('unsent');
    const again = await syncFrom(parseBackup(JSON.stringify(fromMac)));
    expect(again).toMatchObject({ changes: 0, sendBack: 1 });
    expect(await state()).toBe('unsent');
  });

  it('counts a deletion made here as something to send back', async () => {
    await save<Student>('students', { id: 'st1', groupId: 'g-2a', name: 'Маша', notes: '', active: true });
    const file = await buildBackup();
    _useDatabase(`test-sync-del-${n}`);
    await syncFrom(parseBackup(JSON.stringify(file)));
    await remove('students', 'st1');
    expect((await syncFrom(parseBackup(JSON.stringify(file)))).sendBack).toBe(1);
    expect(await db.students.get('st1')).toBeUndefined();
  });

  it('shows "not sent yet" when the other device is missing something from here', async () => {
    await save<Student>('students', { id: 'st1', groupId: 'g-2a', name: 'Маша', notes: '', active: true });
    await recordSent(await buildBackup());
    await new Promise((r) => setTimeout(r, 5));
    const file = await buildBackup();
    file.deviceId = 'other';
    file.tables.students = file.tables.students!.filter((x) => x.id !== 'st1');
    expect((await syncFrom(file)).sendBack).toBe(1);
    expect(await state()).toBe('unsent');
  });

  it("won't merge a file made on this same device", async () => {
    const own = await buildBackup();
    await expect(syncFrom(own)).rejects.toThrow(BackupError);
  });
});
