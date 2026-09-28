// Brings a curriculum read from a teacher's own document into this device's
// database. Nothing leaves the device: the file is read locally.
//
// Re-importing is safe: for each curriculum in the file, its imported modules
// and lessons are refreshed; lesson plans you've filled in, lessons you added
// by hand, and each group's position are kept.

import type { Curriculum, Game, LessonFramework, Module, PlannedLesson, Resource } from '../domain/types';
import type { ParseResult } from '../import/parseCurriculum';
import { orderedLessons } from '../lib/pointer';
import { db } from './db';

export function curriculumRecords(parsed: ParseResult, now = Date.now()) {
  const curricula: Curriculum[] = parsed.curricula.map((c) => ({ ...c, id: c.key, updatedAt: now }));
  const modules: Module[] = parsed.modules.map((m) => ({ ...m, updatedAt: now }));
  const lessons: PlannedLesson[] = parsed.lessons.map((l) => ({ ...l, stages: [], updatedAt: now }));
  const frameworks: LessonFramework[] = parsed.frameworks.map((f) => ({ ...f, updatedAt: now }));
  return { curricula, modules, lessons, frameworks };
}

export function libraryRecords(parsed: Pick<ParseResult, 'games' | 'resources'>, now = Date.now()) {
  const games: Game[] = parsed.games.map((g) => ({
    ...g,
    skills: [],
    energy: '',
    prepMinutes: null,
    needsProjector: /projector|проектор/i.test(g.howItWorks + g.prep),
    link: '',
    fileId: null,
    custom: false,
    updatedAt: now,
  }));
  const resources: Resource[] = parsed.resources.map((r) => ({
    ...r,
    skills: [],
    needsProjector: /projector|проектор/i.test(r.useFor),
    fileId: null,
    custom: false,
    updatedAt: now,
  }));
  return { games, resources };
}

export interface ImportOutcome {
  curricula: number;
  modules: number;
  lessons: number;
  games: number;
  resources: number;
  /** Groups that were given a starting lesson because they had none. */
  groupsStarted: number;
}

export async function importCurriculum(parsed: ParseResult, opts: { includeLibrary: boolean } = { includeLibrary: true }): Promise<ImportOutcome> {
  const now = Date.now();
  const { curricula, modules, lessons, frameworks } = curriculumRecords(parsed, now);
  const { games, resources } = opts.includeLibrary ? libraryRecords(parsed, now) : { games: [], resources: [] };
  const keys = new Set(curricula.map((c) => c.key));
  const moduleIds = new Set(modules.map((m) => m.id));
  const lessonIds = new Set(lessons.map((l) => l.id));
  let groupsStarted = 0;

  await db.transaction('rw', db.tables, async () => {
    // Keep lesson plans (stages) already filled in for lessons that still exist.
    const existing = await db.lessons.bulkGet(lessons.map((l) => l.id));
    existing.forEach((old, i) => {
      if (old?.stages?.length) lessons[i].stages = old.stages;
    });
    await db.curricula.bulkPut(curricula);
    await db.modules.bulkPut(modules);
    await db.lessons.bulkPut(lessons);
    await db.frameworks.bulkPut(frameworks);

    // Library: add new items, refresh imported text, keep your own tags, files and edits to custom items.
    for (const g of games) {
      const old = await db.games.get(g.id);
      await db.games.put(old ? { ...old, name: g.name, levels: g.levels, levelTags: g.levelTags, howItWorks: g.howItWorks, prep: g.prep, updatedAt: now } : g);
    }
    for (const r of resources) {
      const old = await db.resources.get(r.id);
      await db.resources.put(old ? { ...old, name: r.name, useFor: r.useFor, levels: r.levels, levelTags: r.levelTags, link: r.link, updatedAt: now } : r);
    }

    // Remove imported modules/lessons of these curricula that are no longer in the document.
    // (Imported ids look like "grade-2-m03" / "grade-2-m03-l04"; hand-made ones don't.)
    const importedId = (id: string, key: string) => new RegExp(`^${key}-m\\d\\d(-l\\d\\d)?$`).test(id);
    const staleModules = (await db.modules.toArray()).filter((m) => keys.has(m.curriculumKey) && importedId(m.id, m.curriculumKey) && !moduleIds.has(m.id));
    const staleModuleIds = new Set(staleModules.map((m) => m.id));
    const staleLessons = (await db.lessons.toArray()).filter((l) => (staleModuleIds.has(l.moduleId) || moduleIds.has(l.moduleId)) && /-m\d\d-l\d\d$/.test(l.id) && !lessonIds.has(l.id));
    await db.modules.bulkDelete([...staleModuleIds]);
    await db.lessons.bulkDelete(staleLessons.map((l) => l.id));
    await db.tombstones.bulkPut([
      ...staleModules.map((m) => ({ id: `modules:${m.id}`, table: 'modules', recordId: m.id, deletedAt: now })),
      ...staleLessons.map((l) => ({ id: `lessons:${l.id}`, table: 'lessons', recordId: l.id, deletedAt: now })),
    ]);

    // Groups following these curricula: keep their position, or start them at the first lesson.
    for (const g of await db.groups.toArray()) {
      if (!keys.has(g.curriculumKey)) continue;
      if (g.currentPlannedLessonId && (await db.lessons.get(g.currentPlannedLessonId))) continue;
      const allModules = await db.modules.where('curriculumKey').equals(g.curriculumKey).toArray();
      const allLessons = await db.lessons.where('moduleId').anyOf(allModules.map((m) => m.id)).toArray();
      const first = orderedLessons(allModules, allLessons)[0] ?? null;
      await db.groups.update(g.id, { currentPlannedLessonId: first, updatedAt: now });
      if (first) groupsStarted++;
    }
    await db.local.put({ key: 'lastChangeAt', value: now });
  });

  return { curricula: curricula.length, modules: modules.length, lessons: lessons.length, games: games.length, resources: resources.length, groupsStarted };
}
