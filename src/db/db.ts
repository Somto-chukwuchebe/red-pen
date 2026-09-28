// The on-device database (IndexedDB via Dexie).
//
// Migrations: never edit an existing `db.version(n)` block once it has shipped.
// To change the schema, add `db.version(n + 1).stores({...}).upgrade(tx => ...)`
// below the last one. Dexie runs the upgrades in order on each device the next
// time Red Pen opens, so existing data is kept.

import Dexie, { type Table } from 'dexie';
import { upgradeLibraryLevels } from '../import/text';
import type {
  CanDoMark,
  CanDoStatement,
  Curriculum,
  Game,
  Group,
  LessonFramework,
  LessonLog,
  LocalMeta,
  Module,
  Participation,
  PlannedLesson,
  Resource,
  Settings,
  StoredFile,
  Student,
  TeacherSync,
  TimetableChange,
  TimetableSlot,
  TimetableVersion,
  Tombstone,
} from '../domain/types';

export class RedPenDB extends Dexie {
  groups!: Table<Group, string>;
  timetableVersions!: Table<TimetableVersion, string>;
  slots!: Table<TimetableSlot, string>;
  changes!: Table<TimetableChange, string>;
  curricula!: Table<Curriculum, string>;
  modules!: Table<Module, string>;
  lessons!: Table<PlannedLesson, string>;
  frameworks!: Table<LessonFramework, string>;
  logs!: Table<LessonLog, string>;
  students!: Table<Student, string>;
  participation!: Table<Participation, string>;
  canDoStatements!: Table<CanDoStatement, string>;
  canDoMarks!: Table<CanDoMark, string>;
  games!: Table<Game, string>;
  resources!: Table<Resource, string>;
  files!: Table<StoredFile, string>;
  teacherSync!: Table<TeacherSync, string>;
  settings!: Table<Settings, string>;
  tombstones!: Table<Tombstone, string>;
  local!: Table<LocalMeta, string>;

  constructor(name = 'red-pen') {
    super(name);
    this.version(1).stores({
      groups: 'id, order, curriculumKey',
      timetableVersions: 'id, effectiveFrom',
      slots: 'id, timetableVersionId, groupId',
      changes: 'id, date, newDate, groupId',
      curricula: 'id, order',
      modules: 'id, curriculumKey, [curriculumKey+order]',
      lessons: 'id, moduleId, [moduleId+order]',
      frameworks: 'id',
      logs: 'id, groupId, date, occurrenceKey, [groupId+date]',
      students: 'id, groupId',
      participation: 'id, studentId, lessonLogId',
      canDoStatements: 'id, moduleId',
      canDoMarks: 'id, statementId, groupId, studentId',
      games: 'id, name',
      resources: 'id, name',
      files: 'id',
      teacherSync: 'id, groupId, date',
      settings: 'id',
      tombstones: 'id, table',
      local: 'key',
    });

    // v2 (Phase 3.1): the library covers kindergarten and grades 1–11.
    // Imported games/resources written for grades 2–8 are widened ("5–8" → "5–11",
    // "2–4" → "1–4"), and every item's level tags now include grade 1 where its range does.
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        const now = Date.now();
        for (const name of ['games', 'resources'] as const) {
          await tx
            .table(name)
            .toCollection()
            .modify((item: { levels?: string; levelTags?: string[]; custom?: boolean; updatedAt: number }) => {
              const change = upgradeLibraryLevels(item);
              if (change) Object.assign(item, change, { updatedAt: now });
            });
        }
      });
  }
}

/** Tables that hold your data and travel in backups / "Move my data". */
export const SYNCED_TABLES = [
  'groups',
  'timetableVersions',
  'slots',
  'changes',
  'curricula',
  'modules',
  'lessons',
  'frameworks',
  'logs',
  'students',
  'participation',
  'canDoStatements',
  'canDoMarks',
  'games',
  'resources',
  'files',
  'teacherSync',
  'settings',
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export let db = new RedPenDB();

/** Tests use a fresh database each time. */
export function _useDatabase(name: string) {
  db.close();
  db = new RedPenDB(name);
  return db;
}
