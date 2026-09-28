// The school calendar: week numbers, quarters and holidays.
// Week numbers run straight through holidays (week 1 = the week of `yearStart`).

import type { DateRange, ISODate, Settings } from '../domain/types';
import { addDaysISO, daysBetween, inRange, isoWeekday, mondayOf } from './dates';

export type CalendarSettings = Pick<Settings, 'yearStart' | 'quarters' | 'holidays'>;

export function weekNumber(cal: CalendarSettings, date: ISODate): number | null {
  const d = daysBetween(mondayOf(cal.yearStart), date);
  if (d < 0) return null;
  return Math.floor(d / 7) + 1;
}

export function weekStartForNumber(cal: CalendarSettings, week: number): ISODate {
  return addDaysISO(mondayOf(cal.yearStart), (week - 1) * 7);
}

export function quarterFor(cal: CalendarSettings, date: ISODate): DateRange | null {
  return cal.quarters.find((q) => inRange(date, q.start, q.end)) ?? null;
}

export function holidayFor(cal: CalendarSettings, date: ISODate): DateRange | null {
  return cal.holidays.find((h) => inRange(date, h.start, h.end)) ?? null;
}

/** A school day: inside a quarter, not a holiday, not Sunday. */
export function isSchoolDay(cal: CalendarSettings, date: ISODate): boolean {
  return isoWeekday(date) !== 7 && !!quarterFor(cal, date) && !holidayFor(cal, date);
}

/** The last week number of the school year. */
export function lastWeek(cal: CalendarSettings): number {
  const end = cal.quarters.reduce((m, q) => (q.end > m ? q.end : m), cal.yearStart);
  return weekNumber(cal, end) ?? 1;
}

/** Weeks with at least one school day in them, from week 1 to the given week (inclusive). */
export function teachingWeeksUpTo(cal: CalendarSettings, week: number): number {
  let n = 0;
  for (let w = 1; w <= week; w++) {
    const mon = weekStartForNumber(cal, w);
    for (let i = 0; i < 6; i++) {
      if (isSchoolDay(cal, addDaysISO(mon, i))) {
        n++;
        break;
      }
    }
  }
  return n;
}

export function totalTeachingWeeks(cal: CalendarSettings): number {
  return teachingWeeksUpTo(cal, lastWeek(cal));
}

export interface CalendarProblem {
  kind: 'order' | 'overlap' | 'holiday-order';
  message: string;
}

/** Sanity checks for the Settings → School year editor. */
export function checkCalendar(cal: CalendarSettings): CalendarProblem[] {
  const out: CalendarProblem[] = [];
  const qs = [...cal.quarters].sort((a, b) => a.start.localeCompare(b.start));
  for (const q of qs) if (q.end < q.start) out.push({ kind: 'order', message: `${q.name} ends before it starts.` });
  for (let i = 1; i < qs.length; i++)
    if (qs[i].start <= qs[i - 1].end) out.push({ kind: 'overlap', message: `${qs[i - 1].name} and ${qs[i].name} overlap.` });
  for (const h of cal.holidays)
    if (h.end < h.start) out.push({ kind: 'holiday-order', message: `${h.name} ends before it starts.` });
  return out;
}
