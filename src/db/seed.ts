// First-run setup of a device (from the setup wizard): groups, the school
// calendar and settings. No curriculum is built in: each teacher imports
// their own (Settings → Curriculum) or builds one by hand.

import { SEED_GROUPS, SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START, type SeedGroup } from '../seed/groups';
import type { Group, Settings, TimetableVersion } from '../domain/types';
import { db } from './db';
import { guessDeviceName } from '../lib/platform';

export const SETTINGS_ID = 'settings';
export const DEFAULT_VERSION_ID = 'tt-2026-27';

export function defaultSettings(now = Date.now()): Settings {
  return {
    id: SETTINGS_ID,
    yearStart: SEED_YEAR_START,
    quarters: SEED_QUARTERS,
    holidays: SEED_HOLIDAYS,
    backupReminderDays: 7,
    theme: 'system',
    language: 'en',
    showSaturday: false,
    updatedAt: now,
  };
}

export interface SetupOptions {
  subject: string;
  language: 'en' | 'ru';
  teacherName?: string;
  groups: SeedGroup[];
  calendar: Pick<Settings, 'yearStart' | 'quarters' | 'holidays'>;
}

/** Language subjects use "Key language"; others use "Key content". */
export const isEnglish = (subject?: string) => !subject || /^(english|английский)/i.test(subject.trim());

/** The example setup: 16 example groups and the 2026–27 calendar. */
export function exampleSetup(): SetupOptions {
  return {
    subject: 'English',
    language: 'en',
    groups: SEED_GROUPS,
    calendar: { yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS },
  };
}

/** First-time setup of this device. Does nothing if already set up. */
export async function setupNewDevice(opts: SetupOptions): Promise<boolean> {
  if (await db.settings.get(SETTINGS_ID)) return false;
  const now = Date.now();
  const groups: Group[] = opts.groups.map((g, i) => ({ ...g, order: i + 1, currentPlannedLessonId: null, updatedAt: now }));
  const startYear = opts.calendar.yearStart.slice(0, 4);
  const version: TimetableVersion = {
    id: DEFAULT_VERSION_ID,
    name: `Timetable ${startYear}–${String(Number(startYear) + 1).slice(2)}`,
    effectiveFrom: opts.calendar.yearStart,
    updatedAt: now,
  };

  await db.transaction('rw', db.tables, async () => {
    // Check again inside the transaction in case two tabs opened at once.
    if (await db.settings.get(SETTINGS_ID)) return;
    await db.groups.bulkPut(groups);
    await db.timetableVersions.put(version);
    await db.settings.put({
      ...defaultSettings(now),
      ...opts.calendar,
      language: opts.language,
      subject: opts.subject.trim() || 'English',
      ...(opts.teacherName?.trim() ? { teacherName: opts.teacherName.trim() } : {}),
    });
    if (!(await db.local.get('deviceName'))) await db.local.put({ key: 'deviceName', value: guessDeviceName() });
    await db.local.put({ key: 'createdAt', value: now });
  });
  return true;
}

/** Every device needs a name for its backups (restoring a backup doesn't bring one). */
export async function ensureDeviceName() {
  if (!(await db.local.get('deviceName'))) await db.local.put({ key: 'deviceName', value: guessDeviceName() });
}

/** Set up with the example groups (used by tests). */
export function ensureSeeded(): Promise<boolean> {
  return setupNewDevice(exampleSetup());
}
