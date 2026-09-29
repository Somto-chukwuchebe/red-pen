// Saving lesson logs: the log itself, who spoke, and moving the group's
// lesson pointer on — all in one step.

import type { ID, ISODate, LessonLog, LogStatus, Participation, StoredFile } from '../domain/types';
import { orderedLessons, pointerAfterLog } from '../lib/pointer';
import { db } from './db';
import { newId, touchLocal } from './repo';

export interface LogDraft {
  id?: ID;
  groupId: ID;
  date: ISODate;
  occurrenceKey?: string;
  plannedLessonId: ID | null;
  status: LogStatus;
  whatWorked: string[];
  whatToChange: string;
  energy: number | null;
  absentStudentIds: ID[];
  /** Participation rating 1–5 for each rated student (unrated students are left out). */
  ratings: Record<ID, number>;
  gameIds: ID[];
  notes: string;
  /** Photos kept with the log (existing ones and any in `newPhotos`). */
  photoIds?: ID[];
  /** Photos added in this sitting, saved together with the log. */
  newPhotos?: StoredFile[];
  /**
   * Where the group's pointer goes next. `undefined` = automatic
   * (moves on for a new, taught lesson; unchanged when editing an old log).
   */
  nextPointer?: ID | null;
}

/** The lessons of a group's curriculum in teaching order. */
export async function curriculumOrder(curriculumKey: string): Promise<ID[]> {
  if (!curriculumKey) return [];
  const modules = await db.modules.where('curriculumKey').equals(curriculumKey).toArray();
  const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
  return orderedLessons(modules, lessons);
}

/** Where the pointer would go if this draft were saved now (shown in the log sheet). */
export async function suggestedPointer(draft: Pick<LogDraft, 'groupId' | 'plannedLessonId' | 'status'>): Promise<ID | null> {
  const group = await db.groups.get(draft.groupId);
  if (!group) return null;
  const ordered = await curriculumOrder(group.curriculumKey);
  return pointerAfterLog(ordered, group.currentPlannedLessonId, draft.plannedLessonId, draft.status);
}

export async function saveLog(draft: LogDraft): Promise<LessonLog> {
  const now = Date.now();
  const isNew = !draft.id || !(await db.logs.get(draft.id));
  const id = draft.id ?? newId('log');
  const log: LessonLog = {
    id,
    groupId: draft.groupId,
    date: draft.date,
    ...(draft.occurrenceKey ? { occurrenceKey: draft.occurrenceKey } : {}),
    plannedLessonId: draft.plannedLessonId,
    status: draft.status,
    stagesUsed: [],
    whatWorked: draft.whatWorked,
    whatToChange: draft.whatToChange.trim(),
    energy: draft.energy,
    absentStudentIds: draft.absentStudentIds,
    gameIds: draft.gameIds,
    notes: draft.notes.trim(),
    ...(draft.photoIds?.length ? { photoIds: draft.photoIds } : {}),
    updatedAt: now,
  };
  const photoIds = draft.photoIds ?? [];
  const addedPhotos = (draft.newPhotos ?? []).filter((f) => photoIds.includes(f.id)).map((f) => ({ ...f, updatedAt: now }));
  const removedPhotos = ((isNew ? undefined : (await db.logs.get(id))?.photoIds) ?? []).filter((p) => !photoIds.includes(p));
  const absent = new Set(draft.absentStudentIds);
  // Older logs counted how often students spoke; keep those counts when editing.
  const previous = new Map((await db.participation.where('lessonLogId').equals(id).toArray()).map((p) => [p.studentId, p]));
  const studentIds = new Set([...Object.keys(draft.ratings), ...[...previous.values()].filter((p) => p.spoke > 0).map((p) => p.studentId)]);
  const participation: Participation[] = [...studentIds]
    .filter((studentId) => !absent.has(studentId))
    .map((studentId) => ({
      id: `${id}:${studentId}`,
      studentId,
      lessonLogId: id,
      rating: draft.ratings[studentId] ?? null,
      spoke: previous.get(studentId)?.spoke ?? 0,
      volunteered: false,
      helpedOthers: false,
      note: previous.get(studentId)?.note ?? '',
      updatedAt: now,
    }))
    .filter((p) => p.rating !== null || p.spoke > 0);

  const group = await db.groups.get(draft.groupId);
  let pointer = group?.currentPlannedLessonId ?? null;
  if (draft.nextPointer !== undefined) pointer = draft.nextPointer;
  else if (isNew && group) pointer = pointerAfterLog(await curriculumOrder(group.curriculumKey), pointer, draft.plannedLessonId, draft.status);

  await db.transaction('rw', [db.logs, db.participation, db.groups, db.files, db.tombstones], async () => {
    await db.files.bulkPut(addedPhotos);
    await db.files.bulkDelete(removedPhotos);
    await db.tombstones.bulkPut(removedPhotos.map((fid) => ({ id: `files:${fid}`, table: 'files', recordId: fid, deletedAt: now })));
    const old = await db.participation.where('lessonLogId').equals(id).toArray();
    const keep = new Set(participation.map((p) => p.id));
    const gone = old.filter((p) => !keep.has(p.id)).map((p) => p.id);
    await db.participation.bulkDelete(gone);
    await db.tombstones.bulkPut(gone.map((pid) => ({ id: `participation:${pid}`, table: 'participation', recordId: pid, deletedAt: now })));
    await db.participation.bulkPut(participation);
    await db.logs.put(log);
    if (group && pointer !== group.currentPlannedLessonId) await db.groups.update(group.id, { currentPlannedLessonId: pointer, updatedAt: now });
  });
  await touchLocal();
  return log;
}

export async function deleteLog(id: ID) {
  const now = Date.now();
  await db.transaction('rw', [db.logs, db.participation, db.files, db.tombstones], async () => {
    const parts = await db.participation.where('lessonLogId').equals(id).toArray();
    const photos = (await db.logs.get(id))?.photoIds ?? [];
    await db.participation.bulkDelete(parts.map((p) => p.id));
    await db.files.bulkDelete(photos);
    await db.logs.delete(id);
    await db.tombstones.bulkPut([
      { id: `logs:${id}`, table: 'logs', recordId: id, deletedAt: now },
      ...parts.map((p) => ({ id: `participation:${p.id}`, table: 'participation', recordId: p.id, deletedAt: now })),
      ...photos.map((fid) => ({ id: `files:${fid}`, table: 'files', recordId: fid, deletedAt: now })),
    ]);
  });
  await touchLocal();
}

/** Delete a group together with its timetable lessons, students, logs and notes. */
export async function deleteGroup(groupId: ID) {
  const now = Date.now();
  await db.transaction('rw', db.tables, async () => {
    const slots = await db.slots.where('groupId').equals(groupId).toArray();
    const changes = await db.changes.where('groupId').equals(groupId).toArray();
    const students = await db.students.where('groupId').equals(groupId).toArray();
    const logs = await db.logs.where('groupId').equals(groupId).toArray();
    const parts = await db.participation.where('lessonLogId').anyOf(logs.map((l) => l.id)).toArray();
    const marks = await db.canDoMarks.where('groupId').equals(groupId).toArray();
    const syncs = await db.teacherSync.where('groupId').equals(groupId).toArray();
    const del = async (table: string, ids: string[]) => {
      await db.table(table).bulkDelete(ids);
      await db.tombstones.bulkPut(ids.map((recordId) => ({ id: `${table}:${recordId}`, table, recordId, deletedAt: now })));
    };
    await del('slots', slots.map((x) => x.id));
    await del('changes', changes.map((x) => x.id));
    await del('students', students.map((x) => x.id));
    await del('logs', logs.map((x) => x.id));
    await del('files', logs.flatMap((x) => x.photoIds ?? []));
    await del('participation', parts.map((x) => x.id));
    await del('canDoMarks', marks.map((x) => x.id));
    await del('teacherSync', syncs.map((x) => x.id));
    await del('groups', [groupId]);
  });
  await touchLocal();
}
