// End-of-term check: for each group, what's still missing before the term can be
// wrapped up — lessons not logged, students never rated, can-do statements not marked.

import type { CanDoMark, CanDoStatement, DateRange, ID, ISODate, LessonLog, Participation, PlannedLesson, Student } from '../domain/types';
import { daysBetween } from './dates';
import { lessonsForRange, type Occurrence, type ScheduleData } from './schedule';

export interface TermCheck {
  /** Scheduled lessons (up to today) with no log. */
  unlogged: Occurrence[];
  /** Active students with no participation rating in any lesson this term. */
  unrated: Pick<Student, 'id' | 'name'>[];
  /** Can-do statements of the modules taught this term that have no mark at all. */
  unmarked: Pick<CanDoStatement, 'id' | 'text' | 'moduleId'>[];
  /** Lessons logged as taught (or reviewed / swapped) this term. */
  taught: number;
  ready: boolean;
}

export interface TermCheckInput {
  groupId: ID;
  tracksStudents: boolean;
  term: DateRange;
  today: ISODate;
  schedule: ScheduleData;
  logs: Pick<LessonLog, 'id' | 'date' | 'status' | 'occurrenceKey' | 'plannedLessonId' | 'absentStudentIds'>[];
  participation: Pick<Participation, 'lessonLogId' | 'studentId' | 'rating'>[];
  students: Pick<Student, 'id' | 'name' | 'active'>[];
  lessons: Map<ID, Pick<PlannedLesson, 'moduleId'>>;
  statements: Pick<CanDoStatement, 'id' | 'text' | 'moduleId'>[];
  marks: Pick<CanDoMark, 'statementId'>[];
}

export function termCheck(input: TermCheckInput): TermCheck {
  const { term, today } = input;
  const inTerm = input.logs.filter((l) => l.date >= term.start && l.date <= term.end);
  const loggedKeys = new Set(inTerm.map((l) => l.occurrenceKey).filter(Boolean));

  // Lessons from the start of term up to today (or the end of term, if it's over).
  const last = today < term.end ? today : term.end;
  const unlogged: Occurrence[] = [];
  if (last >= term.start) {
    for (const [, day] of lessonsForRange(input.schedule, term.start, daysBetween(term.start, last) + 1)) {
      for (const o of day) if (o.groupId === input.groupId && o.status === 'scheduled' && !loggedKeys.has(o.key)) unlogged.push(o);
    }
  }

  const taughtLogs = inTerm.filter((l) => l.status !== 'cancelled');
  const ratedIds = new Set(input.participation.filter((p) => p.rating !== null && taughtLogs.some((l) => l.id === p.lessonLogId)).map((p) => p.studentId));
  const unrated = input.tracksStudents && taughtLogs.length ? input.students.filter((s) => s.active && !ratedIds.has(s.id)).map(({ id, name }) => ({ id, name })) : [];

  const modules = new Set(taughtLogs.map((l) => (l.plannedLessonId ? input.lessons.get(l.plannedLessonId)?.moduleId : undefined)).filter(Boolean));
  const marked = new Set(input.marks.map((m) => m.statementId));
  const unmarked = input.statements.filter((s) => modules.has(s.moduleId) && !marked.has(s.id));

  return { unlogged, unrated, unmarked, taught: taughtLogs.length, ready: !unlogged.length && !unrated.length && !unmarked.length };
}

/** The term to show first: the current one, or the one that ended most recently (in the holidays). */
export function defaultTermIndex(quarters: DateRange[], today: ISODate): number {
  const current = quarters.findIndex((q) => q.start <= today && today <= q.end);
  if (current >= 0) return current;
  let best = -1;
  quarters.forEach((q, i) => {
    if (q.end < today && (best < 0 || q.end > quarters[best].end)) best = i;
  });
  return best >= 0 ? best : 0;
}
