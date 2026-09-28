import { describe, expect, it } from 'vitest';
import { SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START } from '../seed/groups';
import { checkCalendar, holidayFor, isSchoolDay, lastWeek, quarterFor, totalTeachingWeeks, weekNumber } from './calendar';

const cal = { yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS };

describe('school calendar', () => {
  it('numbers weeks from 31 Aug and runs through holidays', () => {
    expect(weekNumber(cal, '2026-08-31')).toBe(1);
    expect(weekNumber(cal, '2026-09-28')).toBe(5);
    expect(weekNumber(cal, '2026-10-26')).toBe(9); // autumn break still has a number
    expect(weekNumber(cal, '2026-11-02')).toBe(10);
    expect(weekNumber(cal, '2026-08-30')).toBeNull();
  });

  it('knows quarters and holidays', () => {
    expect(quarterFor(cal, '2026-09-28')?.name).toBe('Q1');
    expect(quarterFor(cal, '2027-02-01')?.name).toBe('Q3');
    expect(holidayFor(cal, '2026-12-31')?.name).toBe('Winter break');
    expect(isSchoolDay(cal, '2026-09-28')).toBe(true);
    expect(isSchoolDay(cal, '2026-09-27')).toBe(false); // Sunday
    expect(isSchoolDay(cal, '2026-11-04')).toBe(false);
  });

  it('adds up to 34 teaching weeks', () => {
    expect(totalTeachingWeeks(cal)).toBe(34);
    expect(lastWeek(cal)).toBe(38);
  });

  it('flags overlapping quarters', () => {
    const bad = { ...cal, quarters: [{ name: 'Q1', start: '2026-09-01', end: '2026-11-05' }, { name: 'Q2', start: '2026-11-02', end: '2026-12-25' }] };
    expect(checkCalendar(bad)[0].kind).toBe('overlap');
    expect(checkCalendar(cal)).toEqual([]);
  });
});
