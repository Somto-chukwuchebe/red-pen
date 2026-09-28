// All writes go through these helpers so every record gets a fresh
// `updatedAt`, deletions leave a tombstone (so a merge won't bring them back),
// and the device remembers when its data last changed.

import type { Stamped } from '../domain/types';
import { db, type SyncedTable } from './db';

export function newId(prefix = ''): string {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}-${id}` : id;
}

export async function touchLocal() {
  await db.local.put({ key: 'lastChangeAt', value: Date.now() });
}

type Input<T extends Stamped> = Omit<T, 'updatedAt'> & { updatedAt?: number };

export async function save<T extends Stamped>(table: SyncedTable, record: Input<T>): Promise<T> {
  const stamped = { ...record, updatedAt: Date.now() } as T;
  await db.table(table).put(stamped);
  await touchLocal();
  return stamped;
}

export async function saveMany<T extends Stamped>(table: SyncedTable, records: Input<T>[]) {
  const now = Date.now();
  await db.table(table).bulkPut(records.map((r) => ({ ...r, updatedAt: now })));
  await touchLocal();
}

export async function patch<T extends Stamped>(table: SyncedTable, id: string, changes: Partial<T>) {
  await db.table(table).update(id, { ...changes, updatedAt: Date.now() });
  await touchLocal();
}

export async function remove(table: SyncedTable, ids: string | string[]) {
  const list = Array.isArray(ids) ? ids : [ids];
  if (!list.length) return;
  const now = Date.now();
  await db.transaction('rw', [db.table(table), db.tombstones], async () => {
    await db.table(table).bulkDelete(list);
    await db.tombstones.bulkPut(
      list.map((recordId) => ({ id: `${table}:${recordId}`, table, recordId, deletedAt: now })),
    );
  });
  await touchLocal();
}

export async function getLocal<T>(key: string): Promise<T | undefined> {
  return (await db.local.get(key))?.value as T | undefined;
}

export async function setLocal(key: string, value: unknown) {
  await db.local.put({ key, value });
}
