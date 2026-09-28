import { describe, expect, it } from 'vitest';
import type { LessonLog, Participation, Student } from '../domain/types';
import { progressRows, termSummary, type SummaryInput } from './summary';

const log = (id: string, date: string, extra: Partial<LessonLog> = {}): LessonLog => ({
  id, groupId: 'g', date, plannedLessonId: 'p1', status: 'taught', stagesUsed: [], whatWorked: [], whatToChange: '', energy: null,
  absentStudentIds: [], gameIds: [], notes: '', updatedAt: 0, ...extra,
});
const student = (id: string, name: string): Student => ({ id, groupId: 'g', name, notes: '', active: true, updatedAt: 0 });
const part = (lessonLogId: string, studentId: string, rating: number): Participation => ({
  id: `${lessonLogId}:${studentId}`, studentId, lessonLogId, rating, spoke: 0, volunteered: false, helpedOthers: false, note: '', updatedAt: 0,
});

const logs = [log('a', '2026-09-07'), log('b', '2026-09-14', { absentStudentIds: ['s2'] }), log('c', '2026-09-21'), log('d', '2026-09-28'), log('x', '2026-10-05', { status: 'cancelled' }), log('z', '2026-11-10')];
const participation = ['a', 'c', 'd'].flatMap((l) => [part(l, 's1', 5), part(l, 's2', l === 'a' ? 3 : 2)]).concat([part('b', 's1', 4), part('b', 's3', 1), part('c', 's3', 2), part('d', 's3', 1)]);
const input: SummaryInput = {
  group: { name: '2a' },
  term: { name: 'Q1', start: '2026-08-31', end: '2026-10-23' },
  logs,
  students: [student('s1', 'Masha'), student('s2', 'Petya'), student('s3', 'Lev')],
  participation,
  lessons: new Map([['p1', { label: 'Week 1 · Lesson A', moduleId: 'm1' }]]),
  modules: new Map([['m1', { title: 'Starter: Hello!' }]]),
  canDo: [{ statement: { id: 'c1', text: 'say my name' }, level: 'secure' }, { statement: { id: 'c2', text: 'say how old I am' }, level: 'emerging' }],
  next: 'Module 1 · Week 1 · Lesson A',
  teacherName: 'Somto',
  includeNames: true,
  locale: 'en-GB',
};

describe('term summary', () => {
  it('writes the numbers, what was covered, can-dos and who needs encouragement', () => {
    const text = termSummary(input, 'en');
    expect(text).toContain('2a: Q1 summary');
    expect(text).toContain('Lessons taught: 4 (1 cancelled).'); // the November lesson is outside Q1
    expect(text).toContain('Covered: Starter: Hello!.');
    expect(text).toContain('The class can confidently: say my name.');
    expect(text).toContain('Still building: say how old I am.');
    expect(text).toContain('Especially active: Masha.');
    expect(text).toMatch(/Needs encouragement: .*Lev/);
    expect(text).toContain('— Somto');
  });

  it('can leave out names, and is written in Russian on request', () => {
    const anon = termSummary({ ...input, includeNames: false }, 'en');
    expect(anon).not.toMatch(/Masha|Lev|Petya/);
    expect(anon).toMatch(/students? need/);
    const ru = termSummary({ ...input, locale: 'ru-RU' }, 'ru');
    expect(ru).toContain('Проведено уроков: 4, отменено: 1.');
    expect(ru).toContain('Нужна поддержка');
    expect(ru).toMatch(/в среднем \d(,\d)? из 5/);
    expect(ru).not.toMatch(/\d\.\d из 5/);
  });

  it('exports one row per student with attendance, average and flag', () => {
    const rows = progressRows(input.term, logs, input.students, participation, [{ id: 'c1', text: 'say my name' }], [{ statementId: 'c1', studentId: 's1', level: 'secure' }],
      { student: 'Student', lessons: 'Lessons', attended: 'Attended', attendance: 'Attendance', average: 'Average', recent: 'Last 3', flag: 'Low lately' }, { secure: 'Secure' });
    expect(rows[1]).toEqual(['Masha', 4, 4, '100%', '4.8', '4 5 5', '', 'Secure']);
    expect(rows[2]).toEqual(['Petya', 4, 3, '75%', '2.3', '3 2 2', '', '']);
    expect(rows[3]).toEqual(['Lev', 4, 4, '100%', '1.3', '1 2 1', '!', '']);
  });
});
