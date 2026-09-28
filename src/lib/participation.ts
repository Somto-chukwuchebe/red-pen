// Participation ratings (1–5 per student per lesson) and the "low for 3+ lessons" flag.

import type { ID, ISODate, LessonLog, Participation } from '../domain/types';

export const RATINGS = [1, 2, 3, 4, 5] as const;
/** A rating at or below this counts as low. */
export const LOW_RATING = 2;
/** Flag a student after this many low-rated lessons in a row. */
export const LOW_STREAK = 3;

export interface HistoryPoint {
  logId: ID;
  date: ISODate;
  absent: boolean;
  rating: number | null;
}

type LogLike = Pick<LessonLog, 'id' | 'date' | 'status' | 'absentStudentIds' | 'updatedAt'>;

/** One student's lessons, oldest first (cancelled lessons left out). */
export function studentHistory(studentId: ID, logs: LogLike[], parts: Pick<Participation, 'studentId' | 'lessonLogId' | 'rating'>[]): HistoryPoint[] {
  const rating = new Map(parts.filter((p) => p.studentId === studentId).map((p) => [p.lessonLogId, p.rating ?? null]));
  return logs
    .filter((l) => l.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt - b.updatedAt)
    .map((l) => ({ logId: l.id, date: l.date, absent: l.absentStudentIds.includes(studentId), rating: rating.get(l.id) ?? null }));
}

/** How many of the most recent rated lessons in a row were low (absent/unrated lessons are skipped). */
export function lowStreak(history: HistoryPoint[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.absent || h.rating === null) continue;
    if (h.rating <= LOW_RATING) n++;
    else break;
  }
  return n;
}

export const isFlagged = (history: HistoryPoint[]) => lowStreak(history) >= LOW_STREAK;

export interface StudentStats {
  average: number | null;
  rated: number;
  attended: number;
  lessons: number;
  /** Share of lessons attended, 0–1 (null if there were none). */
  attendance: number | null;
  streak: number;
  flagged: boolean;
}

export function studentStats(history: HistoryPoint[]): StudentStats {
  const rated = history.filter((h) => !h.absent && h.rating !== null);
  const attended = history.filter((h) => !h.absent).length;
  const streak = lowStreak(history);
  return {
    average: rated.length ? rated.reduce((s, h) => s + h.rating!, 0) / rated.length : null,
    rated: rated.length,
    attended,
    lessons: history.length,
    attendance: history.length ? attended / history.length : null,
    streak,
    flagged: streak >= LOW_STREAK,
  };
}

/** Average rating of the present, rated students in each lesson (oldest first). */
export function classAverages(logs: LogLike[], parts: Pick<Participation, 'lessonLogId' | 'rating' | 'studentId'>[]): { logId: ID; date: ISODate; average: number; rated: number }[] {
  return logs
    .filter((l) => l.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt - b.updatedAt)
    .map((l) => {
      const r = parts.filter((p) => p.lessonLogId === l.id && p.rating !== null && !l.absentStudentIds.includes(p.studentId)).map((p) => p.rating!);
      return { logId: l.id, date: l.date, average: r.length ? r.reduce((s, x) => s + x, 0) / r.length : NaN, rated: r.length };
    })
    .filter((x) => x.rated > 0);
}
