// Building and editing a curriculum by hand.
// Hand-made ids never look like imported ones ("grade-2-m03"), so re-importing a
// document never removes them.

import type { Curriculum, GroupType, ID, Module, PlannedLesson } from '../domain/types';
import { parseMonths } from '../import/text';
import { orderedLessons } from '../lib/pointer';
import { db } from './db';
import { newId, touchLocal } from './repo';

const tomb = (table: string, recordId: string, now: number) => ({ id: `${table}:${recordId}`, table, recordId, deletedAt: now });

export async function createCurriculum(title: string, type: GroupType, grade: number | null): Promise<Curriculum> {
  const now = Date.now();
  const key = newId('cur');
  const order = (await db.curricula.count()) + 1;
  const c: Curriculum = { id: key, key, title: title.trim(), type, grade, intro: '', order, updatedAt: now };
  await db.curricula.put(c);
  await touchLocal();
  return c;
}

export async function saveModule(m: Omit<Module, 'id' | 'order' | 'monthNums' | 'updatedAt'> & { id?: ID; order?: number }): Promise<Module> {
  const now = Date.now();
  const order = m.order ?? (await db.modules.where('curriculumKey').equals(m.curriculumKey).count()) + 1;
  const mod: Module = { ...m, id: m.id ?? newId(`${m.curriculumKey}-x`), order, monthNums: parseMonths(m.months), updatedAt: now };
  await db.modules.put(mod);
  await touchLocal();
  return mod;
}

export async function saveLesson(l: Omit<PlannedLesson, 'id' | 'order' | 'updatedAt' | 'stages' | 'gameIds' | 'resourceIds'> & Partial<Pick<PlannedLesson, 'id' | 'order' | 'stages' | 'gameIds' | 'resourceIds'>>): Promise<PlannedLesson> {
  const now = Date.now();
  const existing = l.id ? await db.lessons.get(l.id) : undefined;
  const order = l.order ?? existing?.order ?? (await db.lessons.where('moduleId').equals(l.moduleId).count()) + 1;
  const lesson: PlannedLesson = {
    stages: [],
    gameIds: [],
    resourceIds: [],
    ...existing,
    ...l,
    id: l.id ?? newId(`${l.moduleId}-x`),
    order,
    updatedAt: now,
  };
  await db.lessons.put(lesson);
  // Groups on this curriculum with no next lesson start here.
  const mod = await db.modules.get(lesson.moduleId);
  if (mod) {
    for (const g of await db.groups.where('curriculumKey').equals(mod.curriculumKey).toArray()) {
      if (!g.currentPlannedLessonId) await db.groups.update(g.id, { currentPlannedLessonId: lesson.id, updatedAt: now });
    }
  }
  await touchLocal();
  return lesson;
}

/** Swap an item with its neighbour (direction −1 = up, +1 = down). */
export async function moveItem(table: 'modules' | 'lessons', id: ID, direction: -1 | 1) {
  const now = Date.now();
  const item = await db.table(table).get(id);
  if (!item) return;
  const siblings = (table === 'modules' ? await db.modules.where('curriculumKey').equals(item.curriculumKey).toArray() : await db.lessons.where('moduleId').equals(item.moduleId).toArray()).sort((a, b) => a.order - b.order);
  const i = siblings.findIndex((s) => s.id === id);
  const j = i + direction;
  if (j < 0 || j >= siblings.length) return;
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  // Renumber so orders stay 1, 2, 3… even after deletions.
  await db.table(table).bulkPut(siblings.map((s, k) => ({ ...s, order: k + 1, updatedAt: now })));
  await touchLocal();
}

/** Groups whose next lesson is being removed move on to the next remaining lesson. */
async function repointGroups(curriculumKey: string, removed: Set<ID>, now: number) {
  const modules = await db.modules.where('curriculumKey').equals(curriculumKey).toArray();
  const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
  const ordered = orderedLessons(modules, lessons);
  for (const g of await db.groups.where('curriculumKey').equals(curriculumKey).toArray()) {
    if (!g.currentPlannedLessonId || !removed.has(g.currentPlannedLessonId)) continue;
    const from = ordered.indexOf(g.currentPlannedLessonId);
    const next = ordered.slice(from + 1).find((id) => !removed.has(id)) ?? ordered.slice(0, from).reverse().find((id) => !removed.has(id)) ?? null;
    await db.groups.update(g.id, { currentPlannedLessonId: next, updatedAt: now });
  }
}

export async function deleteLesson(id: ID) {
  const now = Date.now();
  const lesson = await db.lessons.get(id);
  if (!lesson) return;
  const mod = await db.modules.get(lesson.moduleId);
  await db.transaction('rw', [db.lessons, db.modules, db.groups, db.tombstones], async () => {
    if (mod) await repointGroups(mod.curriculumKey, new Set([id]), now);
    await db.lessons.delete(id);
    await db.tombstones.put(tomb('lessons', id, now));
  });
  await touchLocal();
}

export async function deleteModule(id: ID) {
  const now = Date.now();
  const mod = await db.modules.get(id);
  if (!mod) return;
  await db.transaction('rw', [db.lessons, db.modules, db.groups, db.tombstones, db.canDoStatements], async () => {
    const lessons = await db.lessons.where('moduleId').equals(id).toArray();
    await repointGroups(mod.curriculumKey, new Set(lessons.map((l) => l.id)), now);
    await db.lessons.bulkDelete(lessons.map((l) => l.id));
    await db.modules.delete(id);
    const cando = await db.canDoStatements.where('moduleId').equals(id).toArray();
    await db.canDoStatements.bulkDelete(cando.map((c) => c.id));
    await db.tombstones.bulkPut([tomb('modules', id, now), ...lessons.map((l) => tomb('lessons', l.id, now)), ...cando.map((c) => tomb('canDoStatements', c.id, now))]);
  });
  await touchLocal();
}

export async function deleteCurriculum(key: string) {
  const now = Date.now();
  await db.transaction('rw', [db.curricula, db.lessons, db.modules, db.groups, db.tombstones], async () => {
    const modules = await db.modules.where('curriculumKey').equals(key).toArray();
    const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
    await db.lessons.bulkDelete(lessons.map((l) => l.id));
    await db.modules.bulkDelete(modules.map((m) => m.id));
    await db.curricula.delete(key);
    for (const g of await db.groups.where('curriculumKey').equals(key).toArray()) await db.groups.update(g.id, { curriculumKey: '', currentPlannedLessonId: null, updatedAt: now });
    await db.tombstones.bulkPut([tomb('curricula', key, now), ...modules.map((m) => tomb('modules', m.id, now)), ...lessons.map((l) => tomb('lessons', l.id, now))]);
  });
  await touchLocal();
}
