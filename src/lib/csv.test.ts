import { describe, expect, it } from 'vitest';
import type { LessonLog } from '../domain/types';
import { attendanceRows, toCsv } from './csv';

describe('CSV export', () => {
  it('quotes awkward values and keeps Cyrillic readable in Excel', () => {
    const csv = toCsv([['Имя', 'Note'], ['Маша', 'said "hello", then left']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Маша,"said ""hello"", then left"');
  });

  it('writes one row per student per lesson', () => {
    const log: LessonLog = {
      id: 'l1', groupId: 'g', date: '2026-09-28', plannedLessonId: 'p1', status: 'taught', stagesUsed: [], whatWorked: ['Game'],
      whatToChange: '', energy: 4, absentStudentIds: ['s2'], gameIds: [], notes: '', updatedAt: 0,
    };
    const students = [
      { id: 's1', groupId: 'g', name: 'Masha', notes: '', active: true, updatedAt: 0 },
      { id: 's2', groupId: 'g', name: 'Petya', notes: '', active: true, updatedAt: 0 },
    ];
    const rows = attendanceRows(
      { name: '2a' }, [log], students,
      [{ id: 'x', studentId: 's1', lessonLogId: 'l1', rating: 4, spoke: 3, volunteered: false, helpedOthers: false, note: '', updatedAt: 0 }],
      new Map([['p1', { label: 'Week 2 · Lesson A', moduleId: 'm' }]]), new Map([['m', { title: 'Starter' }]]),
      ['date', 'group', 'lesson', 'status', 'student', 'present', 'spoke', 'worked', 'notes'],
    );
    expect(rows.slice(1)).toEqual([
      ['2026-09-28', '2a', 'Starter · Week 2 · Lesson A', 'taught', 'Masha', 1, 4, 'Game', ''],
      ['2026-09-28', '2a', 'Starter · Week 2 · Lesson A', 'taught', 'Petya', 0, '', 'Game', ''],
    ]);
  });
});
