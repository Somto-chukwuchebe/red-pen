// Live queries: components re-render automatically when the data changes.

import { useLiveQuery } from 'dexie-react-hooks';
import type { Group, Settings } from '../domain/types';
import { DEFAULT_FLAG_RULE, type FlagRule } from '../lib/participation';
import type { ScheduleData } from '../lib/schedule';
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
