import { describe, expect, it } from 'vitest';
import type { TimetableSlot } from '../domain/types';
import { SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START } from '../seed/groups';
import type { ScheduleData } from './schedule';
import { defaultTermIndex, termCheck, type TermCheckInput } from './termCheck';

const calendar = { yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS };
const slot = (id: string, weekday: TimetableSlot['weekday']): TimetableSlot => ({ id, timetableVersionId: 'v1', groupId: '2a', weekday, startTime: '09:00', endTime: '09:40', room: '', updatedAt: 0 });
const schedule: ScheduleData = {
  calendar,
  versions: [{ id: 'v1', name: 'Autumn', effectiveFrom: '2026-08-31', updatedAt: 0 }],
  slots: [slot('mon', 1)],
  changes: [],
  groups: [{ id: '2a', lessonLengthMin: 40, archived: false }],
};
// A short "term": Mondays 14, 21 and 28 September.
const term = { name: 'Test', start: '2026-09-14', end: '2026-09-30' };
const log = (date: string, extra = {}) => ({ id: `log-${date}`, date, status: 'taught' as const, occurrenceKey: `${date}|mon`, plannedLessonId: 'l1', absentStudentIds: [] as string[], ...extra });

const input = (extra: Partial<TermCheckInput> = {}): TermCheckInput => ({
  groupId: '2a',
  tracksStudents: true,
  term,
  today: '2026-09-29',
  schedule,
  logs: [log('2026-09-14'), log('2026-09-21'), log('2026-09-28')],
  participation: [
    { lessonLogId: 'log-2026-09-14', studentId: 'masha', rating: 4 },
    { lessonLogId: 'log-2026-09-21', studentId: 'lev', rating: 2 },
  ],
  students: [
    { id: 'masha', name: 'Masha', active: true },
    { id: 'lev', name: 'Lev', active: true },
    { id: 'left', name: 'Gone', active: false },
  ],
  lessons: new Map([['l1', { moduleId: 'm1' }]]),
  statements: [
    { id: 'c1', text: 'say hello', moduleId: 'm1' },
    { id: 'c2', text: 'count to ten', moduleId: 'm2' }, // a module not taught this term
  ],
  marks: [{ statementId: 'c1' }],
  ...extra,
});

describe('end-of-term check', () => {
  it('says a group is ready when everything is logged, rated and marked', () => {
    const c = termCheck(input());
    expect(c).toMatchObject({ unlogged: [], unrated: [], unmarked: [], taught: 3, ready: true });
  });

  it('lists lessons not logged, up to today only', () => {
    const c = termCheck(input({ logs: [log('2026-09-14')], today: '2026-09-27' }));
    expect(c.unlogged.map((o) => o.date)).toEqual(['2026-09-21']); // the 28th hasn't happened yet
    expect(c.ready).toBe(false);
  });

  it('lists active students never rated this term, and statements not marked', () => {
    const c = termCheck(input({ participation: [{ lessonLogId: 'log-2026-09-14', studentId: 'masha', rating: 4 }], marks: [] }));
    expect(c.unrated.map((s) => s.name)).toEqual(['Lev']);
    expect(c.unmarked.map((s) => s.text)).toEqual(['say hello']);
  });

  it("doesn't ask for ratings in groups that don't track students", () => {
    expect(termCheck(input({ tracksStudents: false, participation: [] })).unrated).toEqual([]);
  });

  it('opens on the current term, or the last one that ended', () => {
    const qs = [
      { name: 'Q1', start: '2026-09-01', end: '2026-10-23' },
      { name: 'Q2', start: '2026-11-02', end: '2026-12-26' },
    ];
    expect(defaultTermIndex(qs, '2026-11-10')).toBe(1);
    expect(defaultTermIndex(qs, '2026-10-28')).toBe(0); // autumn holidays
    expect(defaultTermIndex(qs, '2026-08-20')).toBe(0);
  });
});
