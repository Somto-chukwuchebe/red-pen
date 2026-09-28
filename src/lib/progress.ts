// Where a group is in its curriculum, and where it should be by now.

import type { ID, ISODate, Module } from '../domain/types';
import { teachingWeeksUpTo, totalTeachingWeeks, weekNumber, type CalendarSettings } from './calendar';
import { fromISODate } from './dates';

/** Months in school-year order: September = 0 … August = 11. */
const schoolMonth = (m: number) => (m + 3) % 12;

/** A date as a position in the school year, in months (1 Oct at noon ≈ 1.0). */
function schoolTime(date: ISODate): number {
  const d = fromISODate(date);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return schoolMonth(d.getMonth() + 1) + (d.getDate() - 1) / days;
}

/**
 * How many lessons a group should have covered by `date`.
 * With module months ("Sep–Oct"), each module's lessons are spread evenly over its months.
 * Without them, the share of the year's teaching weeks gone so far is used.
 */
export function expectedCovered(
  calendar: CalendarSettings,
  modules: Pick<Module, 'id' | 'monthNums'>[],
  lessonsPerModule: Map<ID, number>,
  date: ISODate,
): number {
  const total = [...lessonsPerModule.values()].reduce((s, n) => s + n, 0);
  const dated = modules.filter((m) => m.monthNums.length);
  if (dated.length && dated.length === modules.length) {
    const t = schoolTime(date);
    let expected = 0;
    for (const m of dated) {
      const months = m.monthNums.map(schoolMonth);
      const start = Math.min(...months);
      const end = Math.max(...months) + 1;
      const share = Math.min(1, Math.max(0, (t - start) / (end - start)));
      expected += share * (lessonsPerModule.get(m.id) ?? 0);
    }
    return expected;
  }
  const week = weekNumber(calendar, date) ?? 0;
  const all = totalTeachingWeeks(calendar);
  return all ? (teachingWeeksUpTo(calendar, week) / all) * total : 0;
}

export interface GroupProgress {
  covered: number;
  expected: number;
  total: number;
  /** covered − expected, rounded: negative = behind. */
  diff: number;
  state: 'on-track' | 'behind' | 'ahead' | 'none';
}

/** Within this many lessons of the plan counts as on track. */
export const ON_TRACK_MARGIN = 2;

export function groupProgress(
  calendar: CalendarSettings,
  modules: Pick<Module, 'id' | 'monthNums'>[],
  ordered: ID[],
  lessonModule: Map<ID, ID>,
  pointer: ID | null,
  date: ISODate,
): GroupProgress {
  const total = ordered.length;
  if (!total) return { covered: 0, expected: 0, total: 0, diff: 0, state: 'none' };
  const at = pointer ? ordered.indexOf(pointer) : 0;
  const covered = at < 0 ? 0 : at;
  const perModule = new Map<ID, number>();
  for (const id of ordered) {
    const m = lessonModule.get(id);
    if (m) perModule.set(m, (perModule.get(m) ?? 0) + 1);
  }
  const expected = Math.min(total, expectedCovered(calendar, modules, perModule, date));
  const diff = Math.round(covered - expected);
  const state = Math.abs(diff) <= ON_TRACK_MARGIN ? 'on-track' : diff < 0 ? 'behind' : 'ahead';
  return { covered, expected, total, diff, state };
}
