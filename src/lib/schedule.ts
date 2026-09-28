// Works out which lessons happen on a given date from:
//   1. the timetable version in force that day,
//   2. one-off changes (cancel / move / swap / extra),
//   3. the school calendar (holidays and days outside the quarters hide regular lessons).
//
// Each lesson gets a stable `key` so a lesson log can be linked to it.

import type {
  Group,
  HHMM,
  ID,
  ISODate,
  TimetableChange,
  TimetableSlot,
  TimetableVersion,
} from '../domain/types';
import { holidayFor, isSchoolDay, type CalendarSettings } from './calendar';
import { addDaysISO, addMinutes, isoWeekday, toMinutes } from './dates';

export type OccurrenceStatus = 'scheduled' | 'cancelled' | 'moved-away';

export interface Occurrence {
  key: string;
  date: ISODate;
  groupId: ID;
  start: HHMM;
  end: HHMM;
  room: string;
  slotId?: ID;
  changeId?: ID;
  kind: 'regular' | 'moved' | 'swapped' | 'extra';
  status: OccurrenceStatus;
  /** Reason, or where it moved to / from. */
  note: string;
  /** For moved lessons: the date they were originally on. */
  movedFrom?: ISODate;
  movedTo?: ISODate;
}

export interface ScheduleData {
  calendar: CalendarSettings;
  versions: TimetableVersion[];
  slots: TimetableSlot[];
  changes: TimetableChange[];
  groups: Pick<Group, 'id' | 'lessonLengthMin' | 'archived'>[];
}

/** The timetable version in force on a date: the latest one that has started and not ended. */
export function versionFor(versions: TimetableVersion[], date: ISODate): TimetableVersion | null {
  return (
    versions
      .filter((v) => v.effectiveFrom <= date && (!v.effectiveTo || date <= v.effectiveTo))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
  );
}

export const occurrenceKey = {
  regular: (date: ISODate, slotId: ID) => `${date}|${slotId}`,
  change: (date: ISODate, changeId: ID) => `${date}|c:${changeId}`,
};

const byTime = (a: Occurrence, b: Occurrence) => toMinutes(a.start) - toMinutes(b.start) || a.groupId.localeCompare(b.groupId);

export function lessonsForDate(data: ScheduleData, date: ISODate): Occurrence[] {
  const groupById = new Map(data.groups.map((g) => [g.id, g]));
  const slotById = new Map(data.slots.map((s) => [s.id, s]));
  const active = (groupId: ID) => {
    const g = groupById.get(groupId);
    return !!g && !g.archived;
  };
  const endFor = (groupId: ID, start: HHMM, explicit?: HHMM) =>
    explicit ?? addMinutes(start, groupById.get(groupId)?.lessonLengthMin ?? 40);

  const out: Occurrence[] = [];
  const weekday = isoWeekday(date);

  // 1. Regular lessons (only on school days).
  if (isSchoolDay(data.calendar, date)) {
    const version = versionFor(data.versions, date);
    if (version) {
      for (const s of data.slots) {
        if (s.timetableVersionId !== version.id || s.weekday !== weekday || !active(s.groupId)) continue;
        out.push({
          key: occurrenceKey.regular(date, s.id),
          date,
          groupId: s.groupId,
          start: s.startTime,
          end: s.endTime,
          room: s.room,
          slotId: s.id,
          kind: 'regular',
          status: 'scheduled',
          note: '',
        });
      }
    }
  }

  // 2. One-off changes on this date.
  const bySlot = (slotId?: ID) => out.find((o) => o.slotId === slotId && o.kind !== 'extra' && o.kind !== 'moved');
  for (const c of data.changes.filter((c) => c.date === date)) {
    if (c.type === 'cancel') {
      const o = bySlot(c.slotId);
      if (o) Object.assign(o, { status: 'cancelled', changeId: c.id, note: c.reason });
    } else if (c.type === 'move') {
      const o = bySlot(c.slotId);
      if (o) Object.assign(o, { status: 'moved-away', changeId: c.id, note: c.reason, movedTo: c.newDate ?? date });
    } else if (c.type === 'swap') {
      const a = bySlot(c.slotId);
      const b = bySlot(c.otherSlotId);
      if (a && b) {
        const ga = a.groupId;
        a.groupId = b.groupId;
        b.groupId = ga;
        for (const o of [a, b]) Object.assign(o, { kind: 'swapped', changeId: c.id, note: c.reason });
      }
    } else if (c.type === 'extra' && active(c.groupId) && c.newStartTime) {
      out.push({
        key: occurrenceKey.change(date, c.id),
        date,
        groupId: c.groupId,
        start: c.newStartTime,
        end: endFor(c.groupId, c.newStartTime, c.newEndTime),
        room: c.room ?? '',
        changeId: c.id,
        kind: 'extra',
        status: 'scheduled',
        note: c.reason,
      });
    }
  }

  // 3. Lessons moved *to* this date from another day (or another time on the same day).
  for (const c of data.changes.filter((c) => c.type === 'move' && (c.newDate ?? c.date) === date)) {
    const slot = c.slotId ? slotById.get(c.slotId) : undefined;
    const groupId = slot?.groupId ?? c.groupId;
    if (!active(groupId)) continue;
    // Only if the original lesson really existed (e.g. not on a holiday).
    const original = c.date === date ? out.find((o) => o.changeId === c.id && o.status === 'moved-away') : lessonsForDate({ ...data, changes: data.changes.filter((x) => x.id !== c.id && x.date === c.date) }, c.date).find((o) => o.slotId === c.slotId);
    if (!original) continue;
    const start = c.newStartTime ?? slot?.startTime ?? original.start;
    const duration = toMinutes(original.end) - toMinutes(original.start);
    out.push({
      key: occurrenceKey.change(c.date, c.id),
      date,
      groupId,
      start,
      end: c.newEndTime ?? addMinutes(start, duration),
      room: c.room ?? slot?.room ?? '',
      slotId: c.slotId,
      changeId: c.id,
      kind: 'moved',
      status: 'scheduled',
      note: c.reason,
      movedFrom: c.date,
    });
  }

  return out.sort(byTime);
}

export function lessonsForRange(data: ScheduleData, from: ISODate, days: number): Map<ISODate, Occurrence[]> {
  const out = new Map<ISODate, Occurrence[]>();
  for (let i = 0; i < days; i++) {
    const d = addDaysISO(from, i);
    out.set(d, lessonsForDate(data, d));
  }
  return out;
}

/** Lessons you actually teach (not cancelled, not moved away). */
export const isTeachable = (o: Occurrence) => o.status === 'scheduled';

export function dayNote(data: ScheduleData, date: ISODate): string | null {
  const h = holidayFor(data.calendar, date);
  if (h) return h.name;
  return null;
}
