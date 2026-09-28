import { describe, expect, it } from 'vitest';
import type { TimetableChange, TimetableSlot, TimetableVersion } from '../domain/types';
import { SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START } from '../seed/groups';
import { lessonsForDate, versionFor, type ScheduleData } from './schedule';

const calendar = { yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS };
const v1: TimetableVersion = { id: 'v1', name: 'Autumn', effectiveFrom: '2026-08-31', updatedAt: 0 };
const v2: TimetableVersion = { id: 'v2', name: 'From November', effectiveFrom: '2026-11-02', updatedAt: 0 };
const slot = (id: string, v: string, groupId: string, weekday: TimetableSlot['weekday'], start: string, end: string): TimetableSlot => ({
  id, timetableVersionId: v, groupId, weekday, startTime: start, endTime: end, room: '12', updatedAt: 0,
});
const groups = [
  { id: '2a', lessonLengthMin: 40, archived: false },
  { id: '2b', lessonLengthMin: 40, archived: false },
  { id: 'kg', lessonLengthMin: 15, archived: false },
  { id: 'old', lessonLengthMin: 40, archived: true },
];
const slots = [
  slot('s1', 'v1', '2a', 1, '09:00', '09:40'), // Monday
  slot('s2', 'v1', '2b', 1, '10:00', '10:40'),
  slot('s3', 'v1', 'old', 1, '11:00', '11:40'),
  slot('s4', 'v1', 'kg', 3, '08:30', '08:45'), // Wednesday
  slot('s5', 'v2', '2a', 2, '12:00', '12:40'), // Tuesday, new timetable
];
const data = (changes: TimetableChange[] = []): ScheduleData => ({ calendar, versions: [v1, v2], slots, changes, groups });
const change = (c: Partial<TimetableChange> & Pick<TimetableChange, 'id' | 'type' | 'date'>): TimetableChange => ({
  groupId: '', reason: '', updatedAt: 0, ...c,
});

// Mon 28 Sep 2026 is week 5 (a normal school Monday).
const MON = '2026-09-28';

describe("generating a day's lessons", () => {
  it('lists regular lessons in time order, skipping archived groups', () => {
    const day = lessonsForDate(data(), MON);
    expect(day.map((o) => [o.groupId, o.start, o.end])).toEqual([
      ['2a', '09:00', '09:40'],
      ['2b', '10:00', '10:40'],
    ]);
    expect(day[0].key).toBe(`${MON}|s1`);
  });

  it('uses the timetable version in force on that date', () => {
    expect(versionFor([v1, v2], '2026-10-01')?.id).toBe('v1');
    expect(versionFor([v1, v2], '2026-11-10')?.id).toBe('v2');
    expect(lessonsForDate(data(), '2026-11-02')).toEqual([]); // Monday under v2: nothing
    expect(lessonsForDate(data(), '2026-11-03').map((o) => o.groupId)).toEqual(['2a']); // Tuesday under v2
  });

  it('respects a version with an end date', () => {
    const ended = { ...v1, effectiveTo: '2026-09-30' };
    expect(lessonsForDate({ ...data(), versions: [ended] }, '2026-10-05')).toEqual([]);
  });

  it('hides lessons on holidays and outside the quarters', () => {
    expect(lessonsForDate(data(), '2026-10-26')).toEqual([]); // autumn break
    expect(lessonsForDate(data(), '2026-11-04')).toEqual([]); // Wednesday public holiday
    expect(lessonsForDate(data(), '2027-06-07')).toEqual([]); // summer
  });

  it('marks a cancelled lesson but keeps it visible', () => {
    const day = lessonsForDate(data([change({ id: 'c1', type: 'cancel', date: MON, slotId: 's1', reason: 'Trip' })]), MON);
    expect(day.find((o) => o.slotId === 's1')).toMatchObject({ status: 'cancelled', note: 'Trip' });
    expect(day.filter((o) => o.status === 'scheduled')).toHaveLength(1);
  });

  it('moves a lesson to another day', () => {
    const d = data([change({ id: 'm1', type: 'move', date: MON, slotId: 's1', newDate: '2026-10-01', newStartTime: '13:00' })]);
    expect(lessonsForDate(d, MON).find((o) => o.slotId === 's1')).toMatchObject({ status: 'moved-away', movedTo: '2026-10-01' });
    const thu = lessonsForDate(d, '2026-10-01');
    expect(thu).toHaveLength(1);
    expect(thu[0]).toMatchObject({ groupId: '2a', start: '13:00', end: '13:40', kind: 'moved', movedFrom: MON, key: `${MON}|c:m1` });
  });

  it('moves a lesson to another time on the same day', () => {
    const day = lessonsForDate(data([change({ id: 'm2', type: 'move', date: MON, slotId: 's2', newStartTime: '08:00' })]), MON);
    expect(day.map((o) => [o.groupId, o.start, o.status])).toEqual([
      ['2b', '08:00', 'scheduled'],
      ['2a', '09:00', 'scheduled'],
      ['2b', '10:00', 'moved-away'],
    ]);
  });

  it("doesn't move a lesson that wasn't going to happen (e.g. from a holiday)", () => {
    const d = data([change({ id: 'm3', type: 'move', date: '2026-10-26', slotId: 's1', newDate: '2026-10-22', newStartTime: '13:00' })]);
    expect(lessonsForDate(d, '2026-10-22')).toEqual([]);
  });

  it('swaps two groups', () => {
    const day = lessonsForDate(data([change({ id: 'w1', type: 'swap', date: MON, slotId: 's1', otherSlotId: 's2' })]), MON);
    expect(day.map((o) => [o.start, o.groupId, o.kind])).toEqual([
      ['09:00', '2b', 'swapped'],
      ['10:00', '2a', 'swapped'],
    ]);
  });

  it('adds an extra lesson, using the group length for the end time', () => {
    const day = lessonsForDate(data([change({ id: 'x1', type: 'extra', date: '2026-09-30', groupId: 'kg', newStartTime: '11:00', room: 'Hall' })]), '2026-09-30');
    expect(day.map((o) => [o.groupId, o.start, o.end, o.kind, o.room])).toEqual([
      ['kg', '08:30', '08:45', 'regular', '12'],
      ['kg', '11:00', '11:15', 'extra', 'Hall'],
    ]);
  });
});
