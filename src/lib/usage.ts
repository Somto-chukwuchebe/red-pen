// How often and how recently games were used, worked out from lesson logs
// (so it can never drift out of step with what you actually logged).

import type { ID, ISODate, LessonLog } from '../domain/types';

export interface Usage {
  count: number;
  last: ISODate;
}

export function gameUsage(logs: Pick<LessonLog, 'groupId' | 'date' | 'gameIds' | 'status'>[], groupId?: ID): Map<ID, Usage> {
  const out = new Map<ID, Usage>();
  for (const l of logs) {
    if (l.status === 'cancelled' || (groupId && l.groupId !== groupId)) continue;
    for (const g of l.gameIds) {
      const u = out.get(g);
      if (!u) out.set(g, { count: 1, last: l.date });
      else out.set(g, { count: u.count + 1, last: l.date > u.last ? l.date : u.last });
    }
  }
  return out;
}

/** Games played with a group in its last `lessons` logged lessons. */
export function recentGameIds(logs: Pick<LessonLog, 'groupId' | 'date' | 'gameIds' | 'status'>[], groupId: ID, lessons = 6): ID[] {
  return [...logs]
    .filter((l) => l.groupId === groupId && l.status !== 'cancelled')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, lessons)
    .flatMap((l) => l.gameIds);
}
