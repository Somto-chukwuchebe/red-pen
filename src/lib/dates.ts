// Small date/time helpers. Dates are "yyyy-MM-dd" strings in local time;
// times are "HH:mm".

import { addDays, differenceInCalendarDays, format, getISODay, parseISO, startOfISOWeek } from 'date-fns';
import type { HHMM, ISODate } from '../domain/types';

export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd');
export const fromISODate = (s: ISODate): Date => parseISO(s);
export const todayISO = (): ISODate => toISODate(new Date());
export const addDaysISO = (s: ISODate, n: number): ISODate => toISODate(addDays(fromISODate(s), n));
export const daysBetween = (a: ISODate, b: ISODate) => differenceInCalendarDays(fromISODate(b), fromISODate(a));
/** 1 = Monday … 7 = Sunday. */
export const isoWeekday = (s: ISODate) => getISODay(fromISODate(s));
export const mondayOf = (s: ISODate): ISODate => toISODate(startOfISOWeek(fromISODate(s)));

export function toMinutes(t: HHMM): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(n: number): HHMM {
  const h = Math.floor(n / 60) % 24;
  const m = n % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const addMinutes = (t: HHMM, n: number): HHMM => fromMinutes(toMinutes(t) + n);

/** Accepts "9:00", "09.00", "0900", "9" → "09:00". Returns null if it isn't a time. */
export function normaliseTime(input: string): HHMM | null {
  const s = input.trim();
  let m = /^(\d{1,2})[:.](\d{2})$/.exec(s) ?? /^(\d{2})(\d{2})$/.exec(s);
  if (!m) {
    const h = /^(\d{1,2})$/.exec(s);
    if (h) m = [s, h[1], '00'] as unknown as RegExpExecArray;
  }
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return fromMinutes(h * 60 + min);
}

export const inRange = (d: ISODate, start: ISODate, end: ISODate) => d >= start && d <= end;
