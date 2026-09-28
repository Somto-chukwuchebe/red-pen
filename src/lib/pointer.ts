// The lesson pointer: each group's "next lesson to teach", and how it moves
// after a lesson is logged.

import type { ID, LogStatus, Module, PlannedLesson } from '../domain/types';

/** All lessons of one curriculum in teaching order (module order, then lesson order). */
export function orderedLessons(
  modules: Pick<Module, 'id' | 'order'>[],
  lessons: Pick<PlannedLesson, 'id' | 'moduleId' | 'order'>[],
): ID[] {
  const moduleOrder = new Map(modules.map((m) => [m.id, m.order]));
  return lessons
    .filter((l) => moduleOrder.has(l.moduleId))
    .sort((a, b) => moduleOrder.get(a.moduleId)! - moduleOrder.get(b.moduleId)! || a.order - b.order)
    .map((l) => l.id);
}

/** The lesson after `current`; `null` at the end of the curriculum. */
export function nextLessonId(ordered: ID[], current: ID | null): ID | null {
  if (!ordered.length) return null;
  if (!current) return ordered[0];
  const i = ordered.indexOf(current);
  if (i === -1) return ordered[0];
  return ordered[i + 1] ?? null;
}

/**
 * Does logging a lesson with this status move the group on?
 *  - taught / swapped: yes, the planned lesson happened.
 *  - cancelled: no.
 *  - review (test week): no, a review game replaced the planned lesson.
 */
export const advancesPointer = (status: LogStatus) => status === 'taught' || status === 'swapped';

/**
 * Where the pointer should go after logging `taughtLessonId` with `status`.
 * If you taught a different lesson from the planned one, the group moves on from the one you taught.
 */
export function pointerAfterLog(ordered: ID[], currentPointer: ID | null, taughtLessonId: ID | null, status: LogStatus): ID | null {
  if (!advancesPointer(status)) return currentPointer;
  const base = taughtLessonId ?? currentPointer;
  if (!base) return currentPointer;
  // At the end of the curriculum the pointer stays on the last lesson.
  return nextLessonId(ordered, base) ?? base;
}

/** Share of the curriculum covered: lessons before the pointer ÷ all lessons (0–1). */
export function progressFraction(ordered: ID[], pointer: ID | null): number {
  if (!ordered.length) return 0;
  if (!pointer) return 0;
  const i = ordered.indexOf(pointer);
  return i === -1 ? 0 : i / ordered.length;
}

/** First lesson of a module (used when the class teacher's module changes). */
export function firstLessonOfModule(lessons: Pick<PlannedLesson, 'id' | 'moduleId' | 'order'>[], moduleId: ID): ID | null {
  return lessons.filter((l) => l.moduleId === moduleId).sort((a, b) => a.order - b.order)[0]?.id ?? null;
}
