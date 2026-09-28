// @vitest-environment node
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { applyImport, type BackupFile } from './backup';
import { _useDatabase, db } from './db';

const game = (id: string, levels: string, custom = false) => ({
  id, name: id, levels, levelTags: [], howItWorks: '', prep: '', skills: [], energy: '', prepMinutes: null,
  needsProjector: false, link: '', fileId: null, custom, updatedAt: 1,
});

describe('database v2: library covers kindergarten to grade 11', () => {
  it('widens imported games and resources on devices set up before the update', async () => {
    // A device still on version 1, with games imported for grades 2–8.
    const old = new Dexie('test-migrate-v1');
    old.version(1).stores({ games: 'id, name', resources: 'id, name', settings: 'id' });
    await old.table('games').bulkPut([game('secondary', '5–8'), game('primary', '2–4'), game('kg', 'KG–2'), game('mine', '5–8', true)]);
    await old.table('resources').put({ ...game('site', '2–8'), useFor: '' });
    old.close();

    _useDatabase('test-migrate-v1');
    await db.open();
    const byId = Object.fromEntries((await db.games.toArray()).map((g) => [g.id, [g.levels, g.levelTags.join(' ')]]));
    expect(byId).toEqual({
      secondary: ['5–11', '5 6 7 8 9 10 11'],
      primary: ['1–4', '1 2 3 4'],
      kg: ['KG–2', 'KG 1 2'],
      mine: ['5–8', '5 6 7 8'], // your own games keep the range you chose
    });
    expect((await db.resources.get('site'))?.levels).toBe('1–11');
  });

  it('applies the same upgrade to a backup made before the update', async () => {
    _useDatabase('test-migrate-backup');
    const file: BackupFile = {
      app: 'red-pen', format: 1, schemaVersion: 1, exportedAt: 1, deviceName: 'Old iPhone', deviceId: 'x', lastChangeAt: 1,
      tables: { games: [game('secondary', '5–8')] }, tombstones: [],
    };
    await applyImport(file, 'replace');
    expect((await db.games.get('secondary'))?.levels).toBe('5–11');
  });
});
