import { describe, expect, it } from 'vitest';
import { advancesPointer, firstLessonOfModule, nextLessonId, orderedLessons, pointerAfterLog, progressFraction } from './pointer';

const modules = [
  { id: 'm2', order: 2 },
  { id: 'm1', order: 1 },
];
const lessons = [
  { id: 'm2-l1', moduleId: 'm2', order: 1 },
  { id: 'm1-l2', moduleId: 'm1', order: 2 },
  { id: 'm1-l1', moduleId: 'm1', order: 1 },
  { id: 'other', moduleId: 'elsewhere', order: 1 },
];
const ordered = orderedLessons(modules, lessons);

describe('lesson pointer', () => {
  it('orders lessons by module, then lesson, ignoring other curricula', () => {
    expect(ordered).toEqual(['m1-l1', 'm1-l2', 'm2-l1']);
  });

  it('moves to the next lesson, crossing into the next module', () => {
    expect(nextLessonId(ordered, 'm1-l1')).toBe('m1-l2');
    expect(nextLessonId(ordered, 'm1-l2')).toBe('m2-l1');
    expect(nextLessonId(ordered, 'm2-l1')).toBeNull();
    expect(nextLessonId(ordered, null)).toBe('m1-l1');
  });

  it('advances only when the lesson was actually taught', () => {
    expect(advancesPointer('taught')).toBe(true);
    expect(advancesPointer('swapped')).toBe(true);
    expect(advancesPointer('cancelled')).toBe(false);
    expect(advancesPointer('review')).toBe(false);
    expect(pointerAfterLog(ordered, 'm1-l1', 'm1-l1', 'taught')).toBe('m1-l2');
    expect(pointerAfterLog(ordered, 'm1-l1', 'm1-l1', 'cancelled')).toBe('m1-l1');
    expect(pointerAfterLog(ordered, 'm1-l1', 'm1-l1', 'review')).toBe('m1-l1');
  });

  it('moves on from the lesson you actually taught if you changed it', () => {
    expect(pointerAfterLog(ordered, 'm1-l1', 'm1-l2', 'taught')).toBe('m2-l1');
  });

  it('stays on the last lesson at the end of the year', () => {
    expect(pointerAfterLog(ordered, 'm2-l1', 'm2-l1', 'taught')).toBe('m2-l1');
  });

  it('works out progress and module starts', () => {
    expect(progressFraction(ordered, 'm1-l1')).toBe(0);
    expect(progressFraction(ordered, 'm2-l1')).toBeCloseTo(2 / 3);
    expect(firstLessonOfModule(lessons, 'm1')).toBe('m1-l1');
  });
});
