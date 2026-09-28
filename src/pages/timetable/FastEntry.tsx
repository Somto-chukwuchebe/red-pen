import { useEffect, useMemo, useState } from 'react';
import { BareInput, BareSelect, Button, GroupDot } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { db } from '../../db/db';
import { newId, touchLocal } from '../../db/repo';
import type { Group, TimetableSlot, Weekday } from '../../domain/types';
import { useT } from '../../i18n';
import { addMinutes, normaliseTime, toMinutes } from '../../lib/dates';
import { countMismatches, findClashes } from '../../lib/timetable';
import { Issues } from './WeekGrid';

interface Row {
  slotId?: string;
  groupId: string;
  weekday: Weekday | 0;
  start: string;
  end?: string;
  room: string;
}

/** Every group's weekly lessons on one screen. */
export function FastEntry({ versionId, slots, groups, weekdays }: { versionId: string; slots: TimetableSlot[]; groups: Group[]; weekdays: Weekday[] }) {
  const t = useT();
  const toast = useToast();

  const initial = useMemo(() => {
    const rows: Row[] = [];
    for (const g of groups) {
      const mine = slots
        .filter((s) => s.groupId === g.id)
        .sort((a, b) => a.weekday - b.weekday || toMinutes(a.startTime) - toMinutes(b.startTime));
      mine.forEach((s) => rows.push({ slotId: s.id, groupId: g.id, weekday: s.weekday, start: s.startTime, end: s.endTime, room: s.room }));
      for (let i = mine.length; i < g.lessonsPerWeek; i++) rows.push({ groupId: g.id, weekday: 0, start: '', room: '' });
    }
    return rows;
  }, [groups, slots]);

  const [rows, setRows] = useState<Row[]>(initial);
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const endFor = (r: Row) => {
    const start = normaliseTime(r.start);
    if (!start) return '';
    const original = r.slotId ? slots.find((s) => s.id === r.slotId) : undefined;
    // Keep a hand-set end time if the start hasn't changed.
    if (original && original.startTime === start && r.end) return r.end;
    return addMinutes(start, groupById.get(r.groupId)?.lessonLengthMin ?? 40);
  };

  const filled = rows.filter((r) => r.weekday && normaliseTime(r.start));
  const preview: TimetableSlot[] = filled.map((r, i) => ({
    id: r.slotId ?? `new-${i}`,
    timetableVersionId: versionId,
    groupId: r.groupId,
    weekday: r.weekday as Weekday,
    startTime: normaliseTime(r.start)!,
    endTime: endFor(r),
    room: r.room.trim(),
    updatedAt: 0,
  }));
  const clashes = findClashes(preview);
  const mismatches = countMismatches(preview, groups);

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function saveAll() {
    const now = Date.now();
    const keep = new Set(filled.map((r) => r.slotId).filter(Boolean));
    // Only touch groups shown here (archived groups keep their lessons).
    const toDelete = slots.filter((s) => groupById.has(s.groupId) && !keep.has(s.id)).map((s) => s.id);
    await db.transaction('rw', db.slots, db.tombstones, async () => {
      await db.slots.bulkPut(preview.map((s) => ({ ...s, id: s.id.startsWith('new-') ? newId('slot') : s.id, updatedAt: now })));
      await db.slots.bulkDelete(toDelete);
      await db.tombstones.bulkPut(toDelete.map((id) => ({ id: `slots:${id}`, table: 'slots', recordId: id, deletedAt: now })));
    });
    await touchLocal();
    toast(t.timetable.fastSaved(preview.length));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">{t.timetable.fastIntro}</p>
      <Issues
        hasSlots={preview.length > 0}
        clashes={clashes.map((c) => t.timetable.clashLine(`${groupById.get(c.a.groupId)?.name} ${c.a.startTime}`, `${groupById.get(c.b.groupId)?.name} ${c.b.startTime}`, t.weekdays[c.a.weekday - 1]))}
        mismatches={mismatches.map((m) => t.timetable.countLine(m.group.name, m.actual, m.group.lessonsPerWeek))}
      />
      {/* One block per group; each lesson is a row of Day · Start · (End) · Room. Fits a small phone. */}
      <ul className="flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.id} className="rounded-2xl border border-line bg-card px-3 py-2 sm:px-4">
            <div className="flex min-h-10 items-center gap-2 font-semibold">
              <GroupDot colour={g.colour} /> {g.name}
              <span className="text-sm font-normal text-ink-soft">
                · {t.groups.perWeek(g.lessonsPerWeek)} · {g.lessonLengthMin} {t.common.minutes}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                aria-label={`${t.common.add} ${g.name}`}
                onClick={() => {
                  const at = rows.map((r) => r.groupId).lastIndexOf(g.id);
                  setRows((rs) => [...rs.slice(0, at + 1), { groupId: g.id, weekday: 0, start: '', room: '' }, ...rs.slice(at + 1)]);
                }}
              >
                +
              </Button>
            </div>
            {rows.map((r, i) =>
              r.groupId !== g.id ? null : (
                <div key={i} className="grid grid-cols-[5.5rem_minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-2 py-1 sm:grid-cols-[6rem_8rem_4rem_minmax(0,10rem)]">
                  <BareSelect aria-label={`${g.name} ${t.common.day}`} value={r.weekday} onChange={(e) => update(i, { weekday: Number(e.target.value) as Weekday })}>
                    <option value={0}>—</option>
                    {weekdays.map((w) => (
                      <option key={w} value={w}>
                        {t.weekdaysShort[w - 1]}
                      </option>
                    ))}
                  </BareSelect>
                  <BareInput aria-label={`${g.name} ${t.common.start}`} type="time" step={300} value={r.start} onChange={(e) => update(i, { start: e.target.value })} />
                  <span className="hidden tabular-nums text-ink-soft sm:block" aria-label={t.common.end}>
                    –{endFor(r) || '—'}
                  </span>
                  <BareInput aria-label={`${g.name} ${t.common.room}`} placeholder={t.common.room} value={r.room} onChange={(e) => update(i, { room: e.target.value })} />
                </div>
              ),
            )}
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 flex justify-end md:bottom-4">
        <Button variant="primary" size="lg" onClick={saveAll}>
          {t.timetable.fastSave(preview.length)}
        </Button>
      </div>
    </div>
  );
}
