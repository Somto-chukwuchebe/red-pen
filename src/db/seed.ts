// First-run setup: fills an empty database with your groups, the school
// calendar and the imported curriculum. Also used to load a re-imported
// curriculum later (Settings → Curriculum).

import type curriculumJson from '../seed/curriculum.json';
import type gamesJson from '../seed/games.json';
import type resourcesJson from '../seed/resources.json';
import { SEED_GROUPS, SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START, type SeedGroup } from '../seed/groups';
import type {
  Curriculum,
  Game,
  Group,
  LessonFramework,
  Module,
  PlannedLesson,
  Resource,
  Settings,
  TimetableVersion,
} from '../domain/types';
import { db } from './db';
import { guessDeviceName } from '../lib/platform';

export const SETTINGS_ID = 'settings';
export const DEFAULT_VERSION_ID = 'tt-2026-27';

type SeedFile = typeof curriculumJson;
interface SeedFiles {
  curriculum: SeedFile;
  games: typeof gamesJson;
  resources: typeof resourcesJson;
}

/**
 * The imported curriculum is only needed on first launch (and when reloading it),
 * so it's loaded on demand instead of slowing down every start.
 */
export async function loadSeedFiles(): Promise<SeedFiles> {
  const [curriculum, games, resources] = await Promise.all([
    import('../seed/curriculum.json'),
    import('../seed/games.json'),
    import('../seed/resources.json'),
  ]);
  return { curriculum: curriculum.default, games: games.default, resources: resources.default };
}

export function curriculumRecords(seed: SeedFile, now = Date.now()) {
  const curricula: Curriculum[] = seed.curricula.map((c) => ({
    ...c,
    type: c.type as Curriculum['type'],
    id: c.key,
    updatedAt: now,
  }));
  const modules: Module[] = seed.modules.map((m) => ({ ...m, updatedAt: now }));
  const lessons: PlannedLesson[] = seed.lessons.map((l) => ({ ...l, stages: [], updatedAt: now }));
  const frameworks: LessonFramework[] = seed.frameworks.map((f) => ({
    ...f,
    appliesTo: f.appliesTo as LessonFramework['appliesTo'],
    stages: f.stages.map((s) => ({ ...s, minutesByLength: s.minutesByLength as Record<number, number> })),
    updatedAt: now,
  }));
  return { curricula, modules, lessons, frameworks };
}

export function libraryRecords(files: Pick<SeedFiles, 'games' | 'resources'>, now = Date.now()) {
  const games: Game[] = files.games.map((g) => ({
    ...g,
    skills: ['speaking'],
    energy: '',
    prepMinutes: null,
    needsProjector: /projector/i.test(g.howItWorks + g.prep),
    link: '',
    fileId: null,
    custom: false,
    updatedAt: now,
  }));
  const resources: Resource[] = files.resources.map((r) => ({
    ...r,
    skills: [],
    needsProjector: /projector/i.test(r.useFor),
    fileId: null,
    custom: false,
    updatedAt: now,
  }));
  return { games, resources };
}

/** Where a group's lesson pointer starts on a fresh install. */
export function startingLessonId(
  seedGroup: Pick<SeedGroup, 'curriculumKey' | 'startAt'>,
  modules: Pick<Module, 'id' | 'curriculumKey' | 'order' | 'title'>[],
  lessons: Pick<PlannedLesson, 'id' | 'moduleId' | 'order' | 'label'>[],
): string | null {
  const mods = modules
    .filter((m) => m.curriculumKey === seedGroup.curriculumKey)
    .sort((a, b) => a.order - b.order);
  const mod =
    seedGroup.startAt?.module === 'module-1'
      ? (mods.find((m) => /^Module 1\b/.test(m.title)) ?? mods[0])
      : mods[0];
  if (!mod) return null;
  const inModule = lessons.filter((l) => l.moduleId === mod.id).sort((a, b) => a.order - b.order);
  const label = seedGroup.startAt?.label;
  const wanted = label ? inModule.find((l) => l.label === label) : undefined;
  return (wanted ?? inModule[0])?.id ?? null;
}

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
  /** Groups to create. Example groups carry a `startAt`; new ones don't. */
  groups: SeedGroup[];
  calendar: Pick<Settings, 'yearStart' | 'quarters' | 'holidays'>;
  /** Load the built-in (English, Spotlight-aligned) curriculum, games and resources. */
  includeBuiltInCurriculum: boolean;
}

export const isEnglish = (subject?: string) => !subject || /^(english|английский)/i.test(subject.trim());

/** The example setup: all of the owner's groups, the 2026–27 calendar and the built-in curriculum. */
export function exampleSetup(): SetupOptions {
  return {
    subject: 'English',
    language: 'en',
    groups: SEED_GROUPS,
    calendar: { yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS },
    includeBuiltInCurriculum: true,
  };
}

/** First-time setup of this device (from the setup wizard). Does nothing if already set up. */
export async function setupNewDevice(opts: SetupOptions): Promise<boolean> {
  if (await db.settings.get(SETTINGS_ID)) return false;
  const now = Date.now();
  const files = opts.includeBuiltInCurriculum ? await loadSeedFiles() : null;
  const cur = files ? curriculumRecords(files.curriculum, now) : { curricula: [], modules: [], lessons: [], frameworks: [] };
  const lib = files ? libraryRecords(files, now) : { games: [], resources: [] };
  const keys = new Set(cur.curricula.map((c) => c.key));
  const groups: Group[] = opts.groups.map(({ startAt, ...g }, i) => {
    const curriculumKey = keys.has(g.curriculumKey) ? g.curriculumKey : '';
    return {
      ...g,
      curriculumKey,
      order: i + 1,
      currentPlannedLessonId: curriculumKey ? startingLessonId({ curriculumKey, startAt }, cur.modules, cur.lessons) : null,
      updatedAt: now,
    };
  });
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
    await db.curricula.bulkPut(cur.curricula);
    await db.modules.bulkPut(cur.modules);
    await db.lessons.bulkPut(cur.lessons);
    await db.frameworks.bulkPut(cur.frameworks);
    await db.games.bulkPut(lib.games);
    await db.resources.bulkPut(lib.resources);
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

/** Set up with the example data (used by tests and as the wizard's default). */
export function ensureSeeded(): Promise<boolean> {
  return setupNewDevice(exampleSetup());
}

/**
 * Load a re-imported curriculum on a device that already has data.
 * Imported modules/lessons are replaced; ones you added by hand are kept.
 * Group pointers stay where they are if that lesson still exists.
 */
export async function reloadCurriculum() {
  const now = Date.now();
  const files = await loadSeedFiles();
  const { curricula, modules, lessons, frameworks } = curriculumRecords(files.curriculum, now);
  const { games, resources } = libraryRecords(files, now);
  const seededModuleIds = new Set(modules.map((m) => m.id));
  const seededLessonIds = new Set(lessons.map((l) => l.id));

  await db.transaction('rw', db.tables, async () => {
    // Keep planner stages you've already filled in for lessons that still exist.
    const existingLessons = await db.lessons.bulkGet([...seededLessonIds]);
    for (const [i, old] of existingLessons.entries()) {
      if (old?.stages?.length) lessons[i].stages = old.stages;
    }
    await db.curricula.bulkPut(curricula);
    await db.modules.bulkPut(modules);
    await db.lessons.bulkPut(lessons);
    await db.frameworks.bulkPut(frameworks);
    // Games/resources: add new ones, refresh imported text, keep your tags and files.
    for (const g of games) {
      const old = await db.games.get(g.id);
      await db.games.put(old ? { ...old, name: g.name, levels: g.levels, levelTags: g.levelTags, howItWorks: g.howItWorks, prep: g.prep, updatedAt: now } : g);
    }
    for (const r of resources) {
      const old = await db.resources.get(r.id);
      await db.resources.put(old ? { ...old, name: r.name, useFor: r.useFor, levels: r.levels, levelTags: r.levelTags, link: r.link, updatedAt: now } : r);
    }
    // Remove imported modules/lessons that no longer exist in the document
    // (ids from the importer look like "grade-2-m03" / "grade-2-m03-l04").
    const importedPattern = /^(grade-\d|kg-[a-z]+)-m\d\d(-l\d\d)?$/;
    const staleModules = (await db.modules.toArray()).filter((m) => importedPattern.test(m.id) && !seededModuleIds.has(m.id));
    const staleLessons = (await db.lessons.toArray()).filter((l) => importedPattern.test(l.id) && !seededLessonIds.has(l.id));
    await db.modules.bulkDelete(staleModules.map((m) => m.id));
    await db.lessons.bulkDelete(staleLessons.map((l) => l.id));
    await db.tombstones.bulkPut([
      ...staleModules.map((m) => ({ id: `modules:${m.id}`, table: 'modules', recordId: m.id, deletedAt: now })),
      ...staleLessons.map((l) => ({ id: `lessons:${l.id}`, table: 'lessons', recordId: l.id, deletedAt: now })),
    ]);
    // Fix pointers that now point nowhere.
    for (const g of await db.groups.toArray()) {
      if (g.currentPlannedLessonId && !(await db.lessons.get(g.currentPlannedLessonId))) {
        const fallback = startingLessonId({ curriculumKey: g.curriculumKey, startAt: { module: 'first' } }, modules, lessons);
        await db.groups.update(g.id, { currentPlannedLessonId: fallback, updatedAt: now });
      }
    }
    await db.local.put({ key: 'lastChangeAt', value: now });
  });
  return { modules: modules.length, lessons: lessons.length };
}
