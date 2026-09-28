// Lesson stages: minutes must add up to the lesson length.

import type { Stage } from '../domain/types';

export interface StageCheck {
  total: number;
  length: number;
  /** Positive = over the lesson length, negative = under. */
  diff: number;
  ok: boolean;
  /** Stages with no name or zero minutes. */
  incomplete: number[];
}

export function checkStages(stages: Pick<Stage, 'name' | 'minutes'>[], lengthMin: number): StageCheck {
  const total = stages.reduce((s, st) => s + (Number.isFinite(st.minutes) ? Math.max(0, st.minutes) : 0), 0);
  const incomplete = stages.map((s, i) => (!s.name.trim() || !(s.minutes > 0) ? i : -1)).filter((i) => i >= 0);
  return { total, length: lengthMin, diff: total - lengthMin, ok: stages.length > 0 && total === lengthMin, incomplete };
}

/** Scale stage minutes to a different lesson length (e.g. a 40-min plan used for a 30-min group). */
export function fitStages<T extends Pick<Stage, 'minutes'>>(stages: T[], lengthMin: number): T[] {
  const total = stages.reduce((s, st) => s + st.minutes, 0);
  if (!total || total === lengthMin) return stages;
  const scaled = stages.map((s) => ({ ...s, minutes: Math.max(1, Math.round((s.minutes * lengthMin) / total)) }));
  // Put any rounding difference on the longest stage.
  const diff = lengthMin - scaled.reduce((s, st) => s + st.minutes, 0);
  const longest = scaled.reduce((best, s, i) => (s.minutes > scaled[best].minutes ? i : best), 0);
  scaled[longest] = { ...scaled[longest], minutes: Math.max(1, scaled[longest].minutes + diff) };
  return scaled;
}
