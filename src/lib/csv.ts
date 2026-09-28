// CSV export (opens in Excel, Numbers, Google Sheets).

import type { Group, LessonLog, Module, Participation, PlannedLesson, Student } from '../domain/types';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A CSV file. Starts with a byte-order mark so Excel reads Cyrillic names correctly. */
export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** One row per student per lesson: date, lesson, status, present, times spoken. */
export function attendanceRows(
  group: Pick<Group, 'name'>,
  logs: LessonLog[],
  students: Student[],
  participation: Participation[],
  lessons: Map<string, Pick<PlannedLesson, 'label' | 'moduleId'>>,
  modules: Map<string, Pick<Module, 'title'>>,
  headers: string[],
): unknown[][] {
  const spoke = new Map(participation.map((p) => [`${p.lessonLogId}:${p.studentId}`, p.spoke]));
  const rows: unknown[][] = [headers];
  for (const log of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    const l = log.plannedLessonId ? lessons.get(log.plannedLessonId) : undefined;
    const lessonName = l ? `${modules.get(l.moduleId)?.title ?? ''} · ${l.label}` : '';
    if (!students.length) {
      rows.push([log.date, group.name, lessonName, log.status, '', '', '', log.whatWorked.join('; '), log.notes]);
      continue;
    }
    for (const s of students) {
      const present = !log.absentStudentIds.includes(s.id) && log.status !== 'cancelled';
      rows.push([log.date, group.name, lessonName, log.status, s.name, present ? 1 : 0, spoke.get(`${log.id}:${s.id}`) ?? 0, log.whatWorked.join('; '), log.notes]);
    }
  }
  return rows;
}
