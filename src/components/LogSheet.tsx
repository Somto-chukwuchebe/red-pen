// The 30-second lesson log. Everything defaults to "taught as planned, everyone
// present", so a normal lesson is: Everyone 4 → adjust the few who stood out → what worked → Done (D).

import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { db } from '../db/db';
import { deleteLog, saveLog, type LogDraft } from '../db/logs';
import type { ID, ISODate, LogStatus } from '../domain/types';
import { useT } from '../i18n';
import { shortDate } from '../lib/format';
import { LOW_STREAK, lowStreak, studentHistory } from '../lib/participation';
import { orderedLessons, pointerAfterLog } from '../lib/pointer';
import { LowFlag, RatingPicker } from './Rating';
import { useToast } from './Toast';
import { Button, Dialog, Segmented, cx } from './ui';

export interface LogTarget {
  groupId: ID;
  date: ISODate;
  occurrenceKey?: string;
  start?: string;
  /** Open an existing log (otherwise it's found by occurrence, or a new one is started). */
  logId?: ID;
}

const STATUSES: LogStatus[] = ['taught', 'review', 'cancelled', 'swapped'];

export function LogSheet({ target, onClose, onSaved }: { target: LogTarget | null; onClose: () => void; onSaved?: () => void }) {
  if (!target) return null;
  return <LogSheetInner key={`${target.groupId}|${target.date}|${target.occurrenceKey}|${target.logId}`} target={target} onClose={onClose} onSaved={onSaved} />;
}

function LogSheetInner({ target, onClose, onSaved }: { target: LogTarget; onClose: () => void; onSaved?: () => void }) {
  const t = useT();
  const toast = useToast();

  const data = useLiveQuery(async () => {
    const group = await db.groups.get(target.groupId);
    if (!group) return null;
    const existing = target.logId
      ? await db.logs.get(target.logId)
      : target.occurrenceKey
        ? await db.logs.where('occurrenceKey').equals(target.occurrenceKey).first()
        : undefined;
    const students = (await db.students.where('groupId').equals(group.id).toArray()).filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name));
    const parts = existing ? await db.participation.where('lessonLogId').equals(existing.id).toArray() : [];
    const modules = group.curriculumKey ? await db.modules.where('curriculumKey').equals(group.curriculumKey).sortBy('order') : [];
    const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
    // Earlier lessons, to show who has had low participation lately.
    const history = (await db.logs.where('groupId').equals(group.id).toArray()).filter((l) => l.id !== existing?.id && l.date <= target.date);
    const historyParts = await db.participation.where('lessonLogId').anyOf(history.map((l) => l.id)).toArray();
    return { group, existing, students, parts, modules, lessons, history, historyParts };
  }, [target.groupId, target.logId, target.occurrenceKey]);

  const [draft, setDraft] = useState<LogDraft | null>(null);
  const [customWorked, setCustomWorked] = useState('');
  const [pointerChoice, setPointerChoice] = useState<string>('auto');
  const saving = useRef(false);

  // Build the draft once the data has loaded.
  useEffect(() => {
    if (!data || draft) return;
    const { group, existing, parts } = data;
    setDraft(
      existing
        ? {
            id: existing.id,
            groupId: group.id,
            date: existing.date,
            occurrenceKey: existing.occurrenceKey,
            plannedLessonId: existing.plannedLessonId,
            status: existing.status,
            whatWorked: existing.whatWorked,
            whatToChange: existing.whatToChange,
            energy: existing.energy,
            absentStudentIds: existing.absentStudentIds,
            ratings: Object.fromEntries(parts.filter((p) => p.rating != null).map((p) => [p.studentId, p.rating as number])),
            gameIds: existing.gameIds,
            notes: existing.notes,
          }
        : {
            groupId: group.id,
            date: target.date,
            occurrenceKey: target.occurrenceKey,
            plannedLessonId: group.currentPlannedLessonId,
            status: 'taught',
            whatWorked: [],
            whatToChange: '',
            energy: null,
            absentStudentIds: [],
            ratings: {},
            gameIds: [],
            notes: '',
          },
    );
  }, [data, draft, target.date, target.occurrenceKey]);

  const ordered = useMemo(() => (data ? orderedLessons(data.modules, data.lessons) : []), [data]);
  const streaks = useMemo(() => new Map((data?.students ?? []).map((s) => [s.id, lowStreak(studentHistory(s.id, data!.history, data!.historyParts))])), [data]);
  const lessonById = useMemo(() => new Map(data?.lessons.map((l) => [l.id, l]) ?? []), [data]);
  const moduleById = useMemo(() => new Map(data?.modules.map((m) => [m.id, m]) ?? []), [data]);
  const plannedGames = useLiveQuery(async () => {
    const l = draft?.plannedLessonId ? await db.lessons.get(draft.plannedLessonId) : undefined;
    return l ? (await db.games.bulkGet(l.gameIds)).filter((g) => !!g) : [];
  }, [draft?.plannedLessonId]);

  const isNew = !data?.existing;
  const autoPointer = data && draft ? (isNew ? pointerAfterLog(ordered, data.group.currentPlannedLessonId, draft.plannedLessonId, draft.status) : data.group.currentPlannedLessonId) : null;
  const nextPointer = pointerChoice === 'auto' ? autoPointer : pointerChoice || null;

  async function onSave() {
    if (!draft || saving.current) return;
    saving.current = true;
    try {
      await saveLog({ ...draft, nextPointer: pointerChoice === 'auto' ? undefined : nextPointer });
      toast(t.log.saved);
      onClose();
      onSaved?.();
    } finally {
      saving.current = false;
    }
  }

  // D = Done (when not typing in a text box).
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        void saveRef.current();
      }
      if (/^[1-5]$/.test(e.key)) setDraft((d) => (d ? { ...d, energy: Number(e.key) } : d));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (data === null) return null;
  const set = (p: Partial<LogDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  // Taps can come faster than re-renders, so these build on the latest draft.
  const update = (fn: (d: LogDraft) => Partial<LogDraft>) => setDraft((d) => (d ? { ...d, ...fn(d) } : d));
  const lessonLabel = (id: ID | null) => {
    const l = id ? lessonById.get(id) : undefined;
    return l ? `${moduleById.get(l.moduleId)?.title ?? ''} · ${l.label}` : t.log.noLesson;
  };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const workedOptions = [...new Set([...t.log.workedPresets, ...(draft?.whatWorked ?? [])])];
  const presentCount = data ? data.students.length - (draft?.absentStudentIds.length ?? 0) : 0;

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={
        data ? (
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: data.group.colour }} />
              {data.group.name}
            </span>
            <span className="font-sans text-base font-normal text-ink-soft first-letter:uppercase">
              {shortDate(t.locale, target.date)}
              {target.start && ` · ${target.start}`}
            </span>
          </span>
        ) : (
          t.log.title
        )
      }
      footer={
        <>
          {!isNew && data?.existing && (
            <Button
              variant="quiet-danger"
              className="mr-auto"
              onClick={async () => {
                if (!confirm(t.common.confirmDelete)) return;
                await deleteLog(data.existing!.id);
                onClose();
              }}
            >
              {t.common.delete}
            </Button>
          )}
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave} disabled={!draft}>
            {t.log.done} <kbd className="hidden rounded border border-white/40 px-1.5 text-xs sm:inline">D</kbd>
          </Button>
        </>
      }
    >
      {!data || !draft ? null : (
        <div className="flex flex-col gap-5">
          {/* What was taught */}
          <section>
            <label className="text-sm font-medium text-ink-soft" htmlFor="log-lesson">
              {t.log.lesson}
            </label>
            <select
              id="log-lesson"
              value={draft.plannedLessonId ?? ''}
              onChange={(e) => set({ plannedLessonId: e.target.value || null })}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3"
            >
              <option value="">{t.log.noLesson}</option>
              {data.modules.map((m) => (
                <optgroup key={m.id} label={m.title}>
                  {data.lessons
                    .filter((l) => l.moduleId === m.id)
                    .sort((a, b) => a.order - b.order)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label} — {l.focus.slice(0, 60)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <div className="mt-3">
              <Segmented<LogStatus> label={t.log.status} value={draft.status} onChange={(status) => set({ status })} options={STATUSES.map((s) => ({ value: s, label: t.log.statuses[s] }))} />
            </div>
          </section>

          {/* Participation and attendance */}
          {draft.status !== 'cancelled' && (
            <section>
              {data.group.tracksStudents && data.students.length > 0 ? (
                <>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">
                      {t.log.participation} <span className="font-normal text-ink-soft">· {t.log.present(presentCount, data.students.length)}</span>
                    </h3>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => update((d) => ({ ratings: Object.fromEntries(data.students.filter((s) => !d.absentStudentIds.includes(s.id)).map((s) => [s.id, d.ratings[s.id] ?? 4])) }))}>
                        {t.log.everyone(4)}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => set({ ratings: {} })}>
                        {t.log.clearRatings}
                      </Button>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-ink-soft">{t.log.ratingHint}</p>
                  <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
                    {data.students.map((s) => {
                      const absent = draft.absentStudentIds.includes(s.id);
                      const streak = streaks.get(s.id) ?? 0;
                      return (
                        <li key={s.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 sm:flex-nowrap">
                          <button
                            type="button"
                            aria-pressed={absent}
                            aria-label={`${s.name}: ${absent ? t.log.markPresent : t.log.markAbsent}`}
                            title={absent ? t.log.markPresent : t.log.markAbsent}
                            onClick={() => update((d) => ({ absentStudentIds: toggle(d.absentStudentIds, s.id) }))}
                            className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-sm', absent ? 'border-ink/40 bg-sunk font-semibold text-ink' : 'border-line text-ink-soft')}
                          >
                            {absent ? t.log.absentShort : <Check size={16} aria-hidden />}
                          </button>
                          <span className={cx('flex min-w-0 flex-1 items-center gap-2 font-medium', absent && 'text-ink-soft line-through')}>
                            <span className="truncate">{s.name}</span>
                            {streak >= LOW_STREAK && !absent && <LowFlag streak={streak} compact />}
                          </span>
                          <RatingPicker
                            label={`${t.log.participation}: ${s.name}`}
                            value={absent ? null : (draft.ratings[s.id] ?? null)}
                            disabled={absent}
                            onChange={(v) =>
                              update((d) => {
                                const ratings = { ...d.ratings };
                                if (v === null) delete ratings[s.id];
                                else ratings[s.id] = v;
                                return { ratings };
                              })
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : data.group.tracksStudents ? (
                <p className="text-sm text-ink-soft">
                  {t.log.noStudents}{' '}
                  <Link to={`/groups/${data.group.id}`} onClick={onClose} className="font-medium text-pen underline">
                    {t.log.addStudents}
                  </Link>
                </p>
              ) : null}
            </section>
          )}

          {/* What worked */}
          {draft.status !== 'cancelled' && (
            <section>
              <h3 className="mb-2 font-semibold">{t.log.whatWorked}</h3>
              <div className="flex flex-wrap gap-2">
                {!!plannedGames?.length &&
                  plannedGames.map((g) => (
                    <Chip key={g!.id} active={draft.gameIds.includes(g!.id)} onClick={() => update((d) => ({ gameIds: toggle(d.gameIds, g!.id) }))}>
                      🎲 {g!.name}
                    </Chip>
                  ))}
                {workedOptions.map((w) => (
                  <Chip key={w} active={draft.whatWorked.includes(w)} onClick={() => update((d) => ({ whatWorked: toggle(d.whatWorked, w) }))}>
                    {w}
                  </Chip>
                ))}
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = customWorked.trim();
                    if (v && !draft.whatWorked.includes(v)) set({ whatWorked: [...draft.whatWorked, v] });
                    setCustomWorked('');
                  }}
                >
                  <input
                    value={customWorked}
                    onChange={(e) => setCustomWorked(e.target.value)}
                    placeholder={t.log.addWorked}
                    aria-label={t.log.addWorked}
                    className="min-h-10 w-36 rounded-full border border-dashed border-line bg-paper px-3 text-sm"
                  />
                  <Button type="submit" variant="ghost" size="sm" aria-label={t.common.add} className="h-10 w-10 !px-0">
                    <Plus size={18} />
                  </Button>
                </form>
              </div>
            </section>
          )}

          {/* Energy + notes */}
          {draft.status !== 'cancelled' && (
            <section className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <div>
                <h3 className="mb-2 font-semibold">{t.log.energy}</h3>
                <div className="flex gap-1" role="radiogroup" aria-label={t.log.energy}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={draft.energy === n}
                      aria-label={t.log.energyLevels[n - 1]}
                      title={t.log.energyLevels[n - 1]}
                      onClick={() => set({ energy: draft.energy === n ? null : n })}
                      className={cx('h-11 w-11 rounded-xl border font-semibold', draft.energy !== null && n <= draft.energy ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : 'border-line bg-paper')}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">{t.log.whatToChange}</span>
                <input value={draft.whatToChange} onChange={(e) => set({ whatToChange: e.target.value })} placeholder={t.common.optional} className="min-h-11 rounded-xl border border-line bg-paper px-3" />
              </label>
            </section>
          )}
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t.log.note}</span>
            <textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder={t.common.optional} className="rounded-xl border border-line bg-paper px-3 py-2" />
          </label>

          {/* Where the group goes next */}
          {ordered.length > 0 && (
            <section className="rounded-xl bg-sunk p-3">
              <label htmlFor="log-next" className="text-sm font-medium text-ink-soft">
                {t.log.nextTime}
              </label>
              <p className="font-medium">{lessonLabel(nextPointer)}</p>
              <select id="log-next" value={pointerChoice} onChange={(e) => setPointerChoice(e.target.value)} className="mt-2 min-h-10 w-full rounded-xl border border-line bg-paper px-2 text-sm">
                <option value="auto">{isNew ? t.log.nextAuto : t.log.nextKeep}</option>
                {ordered.map((id) => (
                  <option key={id} value={id}>
                    {lessonLabel(id)}
                  </option>
                ))}
              </select>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx('min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : 'border-line bg-paper hover:bg-sunk')}
    >
      {active && '✓ '}
      {children}
    </button>
  );
}
