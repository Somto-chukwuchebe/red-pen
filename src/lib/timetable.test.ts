import { describe, expect, it } from 'vitest';
import type { TimetableSlot } from '../domain/types';
import { countMismatches, findClashes, parseTimetableText } from './timetable';

const groups = [
  { id: 'g2a', name: '2a', lessonLengthMin: 40, lessonsPerWeek: 2, archived: false },
  { id: 'g5a', name: '5a', lessonLengthMin: 40, lessonsPerWeek: 1, archived: false },
  { id: 'kgo1', name: 'KG Older 1', lessonLengthMin: 30, lessonsPerWeek: 2, archived: false },
  { id: 'kgl', name: 'KG Little', lessonLengthMin: 15, lessonsPerWeek: 2, archived: false },
];

describe('pasting a timetable', () => {
  it('reads several formats', () => {
    const rows = parseTimetableText(
      ['Day Time Group Room', 'Mon 09:00 2a room 12', 'Tue 10:00-10:30 KG Older 1 Hall', 'Wed,8.30,KG Little,5', 'Пт 9:00 5а каб. 14'].join('\n'),
      groups,
    );
    expect(rows.map((r) => [r.weekday, r.startTime, r.endTime, r.groupId, r.room, r.error])).toEqual([
      [1, '09:00', '09:40', 'g2a', '12', undefined],
      [2, '10:00', '10:30', 'kgo1', 'Hall', undefined],
      [3, '08:30', '08:45', 'kgl', '5', undefined],
      [5, '09:00', '09:40', 'g5a', '14', undefined],
    ]);
  });

  it('explains lines it cannot read', () => {
    const rows = parseTimetableText('Funday 09:00 2a\nMon 25:00 2a\nMon 09:00 9z', groups);
    expect(rows.map((r) => r.error)).toEqual([
      '"Funday" isn\'t a day of the week',
      '"25:00" isn\'t a time',
      'No group matches "9z"',
    ]);
  });
});

describe('timetable checks', () => {
  const s = (id: string, groupId: string, weekday: TimetableSlot['weekday'], start: string, end: string): TimetableSlot => ({
    id, groupId, weekday, startTime: start, endTime: end, room: '', timetableVersionId: 'v', updatedAt: 0,
  });

  it('finds overlapping lessons', () => {
    const clashes = findClashes([s('a', 'g2a', 1, '09:00', '09:40'), s('b', 'g5a', 1, '09:30', '10:10'), s('c', 'kgl', 1, '09:40', '09:55')]);
    expect(clashes.map((c) => [c.a.id, c.b.id])).toEqual([['a', 'b'], ['b', 'c']]);
  });

  it('finds groups with the wrong number of weekly lessons', () => {
    const m = countMismatches([s('a', 'g2a', 1, '09:00', '09:40'), s('b', 'g5a', 2, '09:00', '09:40')], groups);
    expect(m.map((x) => [x.group.name, x.actual])).toEqual([['2a', 1], ['KG Older 1', 0], ['KG Little', 0]]);
  });
});
