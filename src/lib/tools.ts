// Logic for the classroom tools (kept separate from the screens so it can be tested).

export type Rng = () => number;

// ─── Random picker: no repeats until everyone has had a turn ────────────

export interface Bag {
  /** Names (or ids) still to be picked this round. */
  left: string[];
  /** Picked this round, in order. */
  picked: string[];
}

export const newBag = (items: string[]): Bag => ({ left: [...items], picked: [] });

/**
 * Pick the next item. When everyone has been picked, a new round starts — and the
 * last person picked is never picked first again straight away.
 */
export function draw(bag: Bag, all: string[], rng: Rng = Math.random): { item: string | null; bag: Bag } {
  if (!all.length) return { item: null, bag: newBag([]) };
  // Keep the bag in step with the roster (students added or removed since).
  let left = bag.left.filter((x) => all.includes(x));
  let picked = bag.picked.filter((x) => all.includes(x));
  for (const x of all) if (!left.includes(x) && !picked.includes(x)) left.push(x);
  const last = picked[picked.length - 1];
  if (!left.length) {
    left = all.filter((x) => x !== last || all.length === 1);
    picked = [];
    if (all.length > 1 && last) {
      // `last` joins the new round, but can't be the first pick.
      const i = Math.floor(rng() * left.length);
      const item = left[i];
      return { item, bag: { left: [...left.filter((_, j) => j !== i), last], picked: [item] } };
    }
  }
  const i = Math.floor(rng() * left.length);
  const item = left[i];
  return { item, bag: { left: left.filter((_, j) => j !== i), picked: [...picked, item] } };
}

// ─── Dice ────────────────────────────────────────────────────────────────

export const rollDice = (count: number, rng: Rng = Math.random, sides = 6) => Array.from({ length: count }, () => 1 + Math.floor(rng() * sides));

// ─── Clock ───────────────────────────────────────────────────────────────

/** 75 → "1:15"; 3600 → "60:00"; negative values show as overtime ("+0:30"). */
export function formatClock(seconds: number): string {
  const over = seconds < 0;
  const s = Math.abs(Math.round(seconds));
  const text = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return over ? `+${text}` : text;
}

// ─── Spinner wheel ───────────────────────────────────────────────────────

/** Which segment is under the pointer (at the top) when the wheel has turned `angle` degrees clockwise. */
export function wheelIndex(angle: number, count: number): number {
  if (count <= 0) return -1;
  const seg = 360 / count;
  const under = (((360 - (angle % 360)) % 360) + 360) % 360;
  return Math.floor(under / seg) % count;
}

/** A new, larger angle that spins several full turns and lands in the middle part of `target`. */
export function spinTo(current: number, count: number, target: number, rng: Rng = Math.random): number {
  const seg = 360 / count;
  const landAt = target * seg + seg * (0.2 + 0.6 * rng()); // the pointer lands inside the segment, not on an edge
  const base = current - (current % 360);
  const turns = 5 + Math.floor(rng() * 3);
  return base + turns * 360 + ((360 - landAt) % 360);
}

// ─── Lesson stages timer ─────────────────────────────────────────────────

export interface StageClock {
  index: number;
  /** Seconds left in this stage (negative = over time). */
  remaining: number;
  /** Seconds left in the whole lesson (negative = over). */
  lessonRemaining: number;
}

/** Given stage lengths (minutes), the current stage and time spent in it, work out what to show. */
export function stageClock(minutes: number[], index: number, secondsInStage: number): StageClock {
  const i = Math.min(Math.max(0, index), Math.max(0, minutes.length - 1));
  const stageSeconds = (minutes[i] ?? 0) * 60;
  const later = minutes.slice(i + 1).reduce((s, m) => s + m * 60, 0);
  return { index: i, remaining: stageSeconds - secondsInStage, lessonRemaining: stageSeconds - secondsInStage + later };
}
