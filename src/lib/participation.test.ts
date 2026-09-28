import { describe, expect, it } from 'vitest';
import { classAverages, isFlagged, lowStreak, studentHistory, studentStats } from './participation';

const log = (id: string, date: string, extra: Partial<{ status: 'taught' | 'cancelled'; absentStudentIds: string[] }> = {}) => ({
  id, date, status: 'taught' as const, absentStudentIds: [] as string[], updatedAt: 0, ...extra,
});
const p = (lessonLogId: string, rating: number | null, studentId = 's') => ({ studentId, lessonLogId, rating });

describe('participation ratings', () => {
  it('flags a student whose last 3 rated lessons were all low (1–2)', () => {
    const logs = [log('a', '2026-09-01'), log('b', '2026-09-03'), log('c', '2026-09-08'), log('d', '2026-09-10')];
    const h = studentHistory('s', logs, [p('a', 4), p('b', 2), p('c', 1), p('d', 2)]);
    expect(lowStreak(h)).toBe(3);
    expect(isFlagged(h)).toBe(true);
  });

  it('skips absences and unrated lessons, and a good lesson ends the run', () => {
    const logs = [log('a', '2026-09-01'), log('b', '2026-09-03'), log('c', '2026-09-08', { absentStudentIds: ['s'] }), log('d', '2026-09-10'), log('e', '2026-09-15')];
    const h = studentHistory('s', logs, [p('a', 1), p('b', 2), p('d', null), p('e', 2)]);
    expect(lowStreak(h)).toBe(3); // a, b, e (c absent, d unrated)
    const better = studentHistory('s', logs, [p('a', 1), p('b', 2), p('d', 4), p('e', 2)]);
    expect(lowStreak(better)).toBe(1);
    expect(isFlagged(better)).toBe(false);
  });

  it('ignores cancelled lessons and works out averages and attendance', () => {
    const logs = [log('a', '2026-09-01'), log('b', '2026-09-03', { status: 'cancelled' }), log('c', '2026-09-08', { absentStudentIds: ['s'] }), log('d', '2026-09-10')];
    const stats = studentStats(studentHistory('s', logs, [p('a', 3), p('d', 5)]));
    expect(stats).toMatchObject({ average: 4, rated: 2, attended: 2, lessons: 3, streak: 0, flagged: false });
    expect(stats.attendance).toBeCloseTo(2 / 3);
  });

  it('averages the class per lesson, leaving out absent students', () => {
    const logs = [log('a', '2026-09-01', { absentStudentIds: ['x'] }), log('b', '2026-09-03')];
    const parts = [p('a', 4, 's'), p('a', 1, 'x'), p('b', 2, 's'), p('b', 5, 'x'), p('b', null, 'y')];
    expect(classAverages(logs, parts).map((x) => [x.logId, x.average, x.rated])).toEqual([['a', 4, 1], ['b', 3.5, 2]]);
  });
});
