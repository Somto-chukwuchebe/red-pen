// Live queries: components re-render automatically when the data changes.

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import type { Group, Settings } from '../domain/types';
import { DEFAULT_FLAG_RULE, type FlagRule } from '../lib/participation';
import type { ScheduleData } from '../lib/schedule';
import { BADGE_LOOKBACK_DAYS, lessonsToLog, showBadge } from '../lib/badge';
import { addDaysISO, todayISO } from '../lib/dates';
import { db } from './db';
import { SETTINGS_ID } from './seed';

/** `undefined` while loading, `null` if this device hasn't been set up yet. */
export function useSettings(): Settings | null | undefined {
  return useLiveQuery(async () => (await db.settings.get(SETTINGS_ID)) ?? null, []);
}

export function useGroups(includeArchived = false): Group[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.groups.orderBy('order').toArray();
    return includeArchived ? all : all.filter((g) => !g.archived);
  }, [includeArchived]);
}

export function useLocal<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.local.get(key))?.value as T | undefined, [key]);
}

/** Everything the schedule builder needs, kept live. */
export function useScheduleData(): ScheduleData | undefined {
  return useLiveQuery(async () => {
    const settings = await db.settings.get(SETTINGS_ID);
    if (!settings) return undefined;
    const [versions, slots, changes, groups] = await Promise.all([
      db.timetableVersions.toArray(),
      db.slots.toArray(),
      db.changes.toArray(),
      db.groups.toArray(),
    ]);
    return { calendar: settings, versions, slots, changes, groups };
  }, []);
}

/** The teacher's rule for flagging low participation (Settings), or the default. */
export function useFlagRule(): FlagRule {
  const s = useSettings();
  return { low: s?.flagLow ?? DEFAULT_FLAG_RULE.low, streak: s?.flagStreak ?? DEFAULT_FLAG_RULE.streak };
}

/**
 * Keeps the number on the app icon up to date while Red Pen is open (if turned on
 * in Settings on this device). Rechecks every minute, so it moves on at midnight.
 */
export function useAppBadge() {
  const on = useLocal<boolean>('badge');
  const data = useScheduleData();
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayISO()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const since = addDaysISO(today, -(BADGE_LOOKBACK_DAYS - 1));
  const keys = useLiveQuery(async () => new Set((await db.logs.where('date').between(since, today, true, true).toArray()).map((l) => l.occurrenceKey).filter((k): k is string => !!k)), [since, today]);
  useEffect(() => {
    if (on === undefined) return; // still loading
    if (!on) {
      void showBadge(0);
      return;
    }
    if (data && keys) void showBadge(lessonsToLog(data, keys, today));
  }, [on, data, keys, today]);
}
