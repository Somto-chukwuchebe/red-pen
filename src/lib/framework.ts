// Picks the lesson shape (framework) for a lesson and works out stage minutes.

import type { FrameworkStage, GroupType, LessonFramework } from '../domain/types';

/** Kindergarten → the kindergarten shape; primary → Lesson A or B by label; secondary → speaking club. */
export function frameworkFor(frameworks: LessonFramework[], type: GroupType, lessonLabel = ''): LessonFramework | null {
  const candidates = frameworks.filter((f) => f.appliesTo === type);
  if (candidates.length <= 1) return candidates[0] ?? null;
  const variant = /Lesson\s+([AB])\b/i.exec(lessonLabel)?.[1]?.toUpperCase();
  return candidates.find((f) => f.variant === variant) ?? candidates.find((f) => !f.variant) ?? candidates[0];
}

/** Minutes for a stage at a given lesson length: exact match, else the closest length listed. */
export function stageMinutes(stage: FrameworkStage, lengthMin: number): number {
  const lengths = Object.keys(stage.minutesByLength).map(Number);
  if (!lengths.length) return 0;
  const best = lengths.reduce((a, b) => (Math.abs(b - lengthMin) < Math.abs(a - lengthMin) ? b : a));
  return stage.minutesByLength[best] ?? 0;
}

export function stagesFor(fw: LessonFramework | null, lengthMin: number) {
  return (fw?.stages ?? [])
    .map((s) => ({ name: s.name, minutes: stageMinutes(s, lengthMin), description: s.description }))
    .filter((s) => s.minutes > 0);
}
