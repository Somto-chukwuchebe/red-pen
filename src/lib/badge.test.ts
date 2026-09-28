import { describe, expect, it } from 'vitest';
import type { TimetableSlot, TimetableVersion } from '../domain/types';
import { SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START } from '../seed/groups';
import { lessonsToLog } from './badge';
import type { ScheduleData } from './schedule';

const calendar = { yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS };
const v1: TimetableVersion = { id: 'v1', name: 'Autumn', effectiveFrom: '2026-08-31', updatedAt: 0 };
const slot = (id: string, groupId: string, weekday: TimetableSlot['weekday'], start: string): TimetableSlot => ({
  id, timetableVersionId: 'v1', groupId, weekday, startTime: start, endTime: '23:59', room: '', updatedAt: 0,
});
// 2a on Monday and Friday, 2b on Wednesday.
const data: ScheduleData = {
  calendar,
  versions: [v1],
  slots: [slot('m', '2a', 1, '09:00'), slot('f', '2a', 5, '09:00'), slot('w', '2b', 3, '10:00')],
  changes: [],
  groups: [{ id: '2a', lessonLengthMin: 40, archived: false }, { id: '2b', lessonLengthMin: 40, archived: false }],
};

describe('app icon badge', () => {
  it("counts today's lessons, logged or not yet, and last week's forgotten ones", () => {
    // Monday 28 Sept: today's Monday lesson + last Friday (25th) + last Wednesday (23rd).
    expect(lessonsToLog(data, new Set(), '2026-09-28')).toBe(3);
    expect(lessonsToLog(data, new Set(['2026-09-28|m', '2026-09-25|f']), '2026-09-28')).toBe(1);
    expect(lessonsToLog(data, new Set(['2026-09-28|m', '2026-09-25|f', '2026-09-23|w']), '2026-09-28')).toBe(0);
  });

  it('forgets lessons more than a week old', () => {
    // Tuesday 29th: the lookback reaches Wednesday 23rd but not Monday 21st.
    expect(lessonsToLog(data, new Set(['2026-09-28|m', '2026-09-25|f']), '2026-09-29')).toBe(1);
  });

  it('skips cancelled lessons', () => {
    const withCancel: ScheduleData = { ...data, changes: [{ id: 'c', type: 'cancel', date: '2026-09-28', slotId: 'm', groupId: '2a', reason: 'Trip', updatedAt: 0 }] };
    expect(lessonsToLog(withCancel, new Set(['2026-09-25|f', '2026-09-23|w']), '2026-09-28')).toBe(0);
  });
});
