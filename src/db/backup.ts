// Backup, restore and "Move my data".
//
// A backup is one JSON file holding every table, plus the list of deleted
// records (tombstones). Attached files are stored inside it as base64.
//
// Import has two modes:
//   replace — this device ends up exactly like the file.
//   merge   — for each record the newer copy wins (by `updatedAt`); a record
//             deleted on one device stays deleted unless it was edited after that.

import { APP_ID } from '../config';
import type { Stamped, StoredFile, Tombstone } from '../domain/types';
import { db, SYNCED_TABLES, type SyncedTable } from './db';
import { getLocal, setLocal } from './repo';

export const BACKUP_FORMAT = 1;

type SerialisedFile = Omit<StoredFile, 'blob'> & { data: string };

export interface BackupFile {
  app: typeof APP_ID;
  format: number;
  schemaVersion: number;
  exportedAt: number;
  deviceName: string;
  deviceId: string;
  /** When data last changed on the exporting device. */
  lastChangeAt: number | null;
  tables: Partial<Record<SyncedTable, Stamped[]>>;
  tombstones: Tombstone[];
}

// ─── Helpers ───────────────────────────────────────────────────────────

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type });
}

export async function deviceId(): Promise<string> {
  let id = await getLocal<string>('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    await setLocal('deviceId', id);
  }
  return id;
}

// ─── Export ────────────────────────────────────────────────────────────

export async function buildBackup(): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const name of SYNCED_TABLES) {
    const rows = await db.table(name).toArray();
    tables[name] =
      name === 'files'
        ? await Promise.all(
            (rows as StoredFile[]).map(async ({ blob, ...f }) => ({ ...f, data: await blobToBase64(blob) }) as SerialisedFile),
          )
        : rows;
  }
  return {
    app: APP_ID,
    format: BACKUP_FORMAT,
    schemaVersion: db.verno,
    exportedAt: Date.now(),
    deviceName: (await getLocal<string>('deviceName')) ?? 'Unknown device',
    deviceId: await deviceId(),
    lastChangeAt: (await getLocal<number>('lastChangeAt')) ?? null,
    tables,
    tombstones: await db.tombstones.toArray(),
  };
}

export function backupFileName(b: BackupFile): string {
  const d = new Date(b.exportedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const device = b.deviceName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return `${APP_ID}-${device}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

export async function recordExport(b: BackupFile) {
  await setLocal('lastExportAt', b.exportedAt);
}

// ─── Reading a file ────────────────────────────────────────────────────

export class BackupError extends Error {}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('not-json');
  }
  const b = data as BackupFile;
  if (!b || b.app !== APP_ID || typeof b.tables !== 'object') throw new BackupError('not-red-pen');
  if (b.format > BACKUP_FORMAT) throw new BackupError('too-new');
  b.tombstones ??= [];
  return b;
}

// ─── Merge logic (pure, tested) ──────────────────────────────────────────

export interface TablePreview {
  table: SyncedTable;
  inFile: number;
  onDevice: number;
  added: number;
  updated: number;
  keptLocal: number;
  deleted: number;
}

export interface MergePlan {
  table: SyncedTable;
  put: Stamped[];
  delete: string[];
  preview: TablePreview;
}

export function planMerge(
  table: SyncedTable,
  local: Stamped[],
  incoming: Stamped[],
  localTombs: Tombstone[],
  incomingTombs: Tombstone[],
): MergePlan {
  const localById = new Map(local.map((r) => [r.id, r]));
  const localDeletedAt = new Map(localTombs.filter((t) => t.table === table).map((t) => [t.recordId, t.deletedAt]));
  const put: Stamped[] = [];
  const del: string[] = [];
  let added = 0;
  let updated = 0;
  let keptLocal = 0;

  for (const r of incoming) {
    const mine = localById.get(r.id);
    if (!mine) {
      const deletedHere = localDeletedAt.get(r.id);
      if (deletedHere !== undefined && deletedHere >= r.updatedAt) continue; // I deleted it after their last edit
      put.push(r);
      added++;
    } else if (r.updatedAt > mine.updatedAt) {
      put.push(r);
      updated++;
    } else if (r.updatedAt < mine.updatedAt) {
      keptLocal++;
    }
  }
  for (const t of incomingTombs.filter((t) => t.table === table)) {
    const mine = localById.get(t.recordId);
    if (mine && mine.updatedAt <= t.deletedAt && !put.some((p) => p.id === t.recordId)) del.push(t.recordId);
  }

  return {
    table,
    put,
    delete: del,
    preview: { table, inFile: incoming.length, onDevice: local.length, added, updated, keptLocal, deleted: del.length },
  };
}

// ─── Import ────────────────────────────────────────────────────────────

export interface ImportPreview {
  file: BackupFile;
  mode: 'merge' | 'replace';
  tables: TablePreview[];
  /** True if this device has changes newer than the file. */
  deviceIsNewer: boolean;
  localLastChangeAt: number | null;
}

function incomingRows(file: BackupFile, table: SyncedTable): Stamped[] {
  const rows = (file.tables[table] ?? []) as Stamped[];
  if (table !== 'files') return rows;
  return (rows as unknown as SerialisedFile[]).map(({ data, ...f }) => ({ ...f, blob: base64ToBlob(data, f.type) }) as StoredFile);
}

export async function previewImport(file: BackupFile, mode: 'merge' | 'replace'): Promise<ImportPreview> {
  const localTombs = await db.tombstones.toArray();
  const tables: TablePreview[] = [];
  for (const t of SYNCED_TABLES) {
    const local = await db.table(t).toArray();
    const incoming = (file.tables[t] ?? []) as Stamped[];
    if (mode === 'replace') {
      tables.push({ table: t, inFile: incoming.length, onDevice: local.length, added: incoming.length, updated: 0, keptLocal: 0, deleted: local.length });
    } else {
      tables.push(planMerge(t, local, incoming, localTombs, file.tombstones).preview);
    }
  }
  const localLastChangeAt = (await getLocal<number>('lastChangeAt')) ?? null;
  return {
    file,
    mode,
    tables,
    localLastChangeAt,
    deviceIsNewer: localLastChangeAt !== null && localLastChangeAt > (file.lastChangeAt ?? file.exportedAt),
  };
}

export async function applyImport(file: BackupFile, mode: 'merge' | 'replace') {
  const tables = SYNCED_TABLES.map((t) => db.table(t));
  await db.transaction('rw', [...tables, db.tombstones, db.local], async () => {
    if (mode === 'replace') {
      for (const t of SYNCED_TABLES) {
        await db.table(t).clear();
        await db.table(t).bulkPut(incomingRows(file, t));
      }
      await db.tombstones.clear();
      await db.tombstones.bulkPut(file.tombstones);
    } else {
      const localTombs = await db.tombstones.toArray();
      for (const t of SYNCED_TABLES) {
        const plan = planMerge(t, await db.table(t).toArray(), incomingRows(file, t), localTombs, file.tombstones);
        await db.table(t).bulkPut(plan.put);
        await db.table(t).bulkDelete(plan.delete);
      }
      // Keep the newest tombstone for each record.
      const byId = new Map(localTombs.map((x) => [x.id, x]));
      for (const x of file.tombstones) if (!byId.has(x.id) || byId.get(x.id)!.deletedAt < x.deletedAt) byId.set(x.id, x);
      await db.tombstones.bulkPut([...byId.values()]);
    }
    await db.local.put({ key: 'lastImport', value: { at: Date.now(), fromDevice: file.deviceName, exportedAt: file.exportedAt, mode } });
    await db.local.put({ key: 'lastChangeAt', value: Date.now() });
  });
}

// ─── Sharing / saving the file ──────────────────────────────────────────

/**
 * On phones this opens the share sheet (Save to Files, AirDrop, Telegram, Mail…).
 * On laptops it downloads the file.
 */
export async function shareOrDownload(content: Blob, fileName: string, preferShare: boolean): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([content], fileName, { type: content.type || 'application/json' });
  if (preferShare && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // Fall through to a download if sharing failed for another reason.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
