import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Banner, Button, EmptyState, GroupDot, Segmented, cx } from '../../components/ui';
import type { Group, TimetableSlot, Weekday } from '../../domain/types';
import { useT } from '../../i18n';
import { fromMinutes, isoWeekday, todayISO, toMinutes } from '../../lib/dates';
import { countMismatches, findClashes } from '../../lib/timetable';
import { SlotEditor, type SlotDraft } from './SlotEditor';

const PX_PER_MIN = 1.3;

export function WeekGrid({ versionId, slots, groups, weekdays }: { versionId: string; slots: TimetableSlot[]; groups: Group[]; weekdays: Weekday[] }) {
  const t = useT();
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const todayWd = isoWeekday(todayISO());
  const [mobileDay, setMobileDay] = useState<Weekday>((weekdays.includes(todayWd as Weekday) ? todayWd : 1) as Weekday);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const clashes = useMemo(() => findClashes(slots), [slots]);
  const mismatches = useMemo(() => countMismatches(slots, groups), [slots, groups]);
  const clashIds = new Set(clashes.flatMap((c) => [c.a.id, c.b.id]));

  // Grid spans at least 08:00–15:00, widened to fit every lesson.
  const startMin = Math.min(8 * 60, ...slots.map((s) => Math.floor(toMinutes(s.startTime) / 60) * 60));
  const endMin = Math.max(15 * 60, ...slots.map((s) => Math.ceil(toMinutes(s.endTime) / 60) * 60));
  const hours = Array.from({ length: (endMin - startMin) / 60 + 1 }, (_, i) => startMin + i * 60);

  const add = (weekday: Weekday, start = '09:00') => setDraft({ groupId: '', weekday, startTime: start, room: '' });
  const edit = (s: TimetableSlot) => setDraft({ id: s.id, groupId: s.groupId, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, room: s.room });

  return (
    <div className="flex flex-col gap-4">
      <Issues clashes={clashes.map((c) => t.timetable.clashLine(label(c.a), label(c.b), t.weekdays[c.a.weekday - 1]))} mismatches={mismatches.map((m) => t.timetable.countLine(m.group.name, m.actual, m.group.lessonsPerWeek))} hasSlots={slots.length > 0} />

      {slots.length === 0 && (
        <EmptyState title={t.timetable.empty}>{t.timetable.emptyHint}</EmptyState>
      )}

      {/* Phones: one day at a time */}
      <div className="md:hidden">
        <Segmented
          label={t.common.day}
          value={String(mobileDay)}
          onChange={(v) => setMobileDay(Number(v) as Weekday)}
          options={weekdays.map((w) => ({ value: String(w), label: t.weekdaysShort[w - 1] }))}
        />
        <ul className="mt-3 flex flex-col gap-2">
          {slots
            .filter((s) => s.weekday === mobileDay)
            .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
            .map((s) => {
              const g = groupById.get(s.groupId);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => edit(s)}
                    className={cx('flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card px-4 text-left', clashIds.has(s.id) ? 'border-amber' : 'border-line')}
                  >
                    <span className="w-28 tabular-nums text-ink-soft">
                      {s.startTime}–{s.endTime}
                    </span>
                    {g && <GroupDot colour={g.colour} />}
                    <span className="font-semibold">{g?.name}</span>
                    {s.room && <span className="ml-auto text-sm text-ink-soft">{s.room}</span>}
                  </button>
                </li>
              );
            })}
        </ul>
        <Button className="mt-3 w-full" icon={<Plus size={18} />} onClick={() => add(mobileDay)}>
          {t.timetable.addLesson}
        </Button>
      </div>

      {/* Tablets, laptops, projector: the whole week */}
      <div className="hidden md:block">
        <p className="mb-2 text-sm text-ink-soft">{t.timetable.tapToAdd}</p>
        <div className="grid rounded-2xl border border-line bg-card" style={{ gridTemplateColumns: `3.5rem repeat(${weekdays.length}, minmax(0, 1fr))` }}>
          <div />
          {weekdays.map((w) => (
            <div key={w} className={cx('border-l border-line px-2 py-2 text-center font-semibold', w === todayWd && 'text-pen')}>
              {t.weekdaysShort[w - 1]}
            </div>
          ))}
          <div className="relative border-t border-line" style={{ height: (endMin - startMin) * PX_PER_MIN }}>
            {hours.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-ink-soft" style={{ top: (h - startMin) * PX_PER_MIN }}>
                {h > startMin ? fromMinutes(h) : ''}
              </span>
            ))}
          </div>
          {weekdays.map((w) => (
            <div
              key={w}
              role="presentation"
              className="relative cursor-copy border-t border-l border-line"
              style={{ height: (endMin - startMin) * PX_PER_MIN }}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                const minutes = startMin + Math.round(y / PX_PER_MIN / 5) * 5;
                add(w, fromMinutes(minutes));
              }}
            >
              {hours.slice(1, -1).map((h) => (
                <div key={h} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/70" style={{ top: (h - startMin) * PX_PER_MIN }} />
              ))}
              {slots
                .filter((s) => s.weekday === w)
                .map((s, _i, day) => {
                  const g = groupById.get(s.groupId);
                  const top = (toMinutes(s.startTime) - startMin) * PX_PER_MIN;
                  const height = Math.max(22, (toMinutes(s.endTime) - toMinutes(s.startTime)) * PX_PER_MIN - 2);
                  // Overlapping lessons sit side by side so both stay readable.
                  const overlapping = day
                    .filter((o) => toMinutes(o.startTime) < toMinutes(s.endTime) && toMinutes(s.startTime) < toMinutes(o.endTime))
                    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
                  const n = overlapping.length;
                  const k = overlapping.findIndex((o) => o.id === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => edit(s)}
                      className={cx(
                        'absolute overflow-hidden rounded-lg border-l-4 bg-sunk px-2 py-1 text-left text-xs leading-tight shadow-sm hover:brightness-95',
                        clashIds.has(s.id) && 'ring-2 ring-amber',
                      )}
                      style={{ top, height, borderLeftColor: g?.colour, left: `calc(${(k / n) * 100}% + 4px)`, width: `calc(${100 / n}% - 8px)` }}
                      aria-label={`${g?.name} ${s.startTime}–${s.endTime} ${s.room}`}
                    >
                      <span className="block text-sm font-semibold">{g?.name}</span>
                      {height > 34 && (
                        <span className="block tabular-nums text-ink-soft">
                          {s.startTime}
                          {s.room && ` · ${s.room}`}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <SlotEditor
        draft={draft}
        versionId={versionId}
        groups={groups}
        otherSlots={slots}
        weekdays={weekdays}
        onClose={() => setDraft(null)}
      />
    </div>
  );

  function label(s: TimetableSlot) {
    return `${groupById.get(s.groupId)?.name ?? '?'} ${s.startTime}–${s.endTime}`;
  }
}

export function Issues({ clashes, mismatches, hasSlots }: { clashes: string[]; mismatches: string[]; hasSlots: boolean }) {
  const t = useT();
  if (!hasSlots) return null;
  if (!clashes.length && !mismatches.length) return <Banner tone="good">✓ {t.timetable.allGood}</Banner>;
  return (
    <Banner tone="warn">
      {clashes.length > 0 && (
        <div className="mb-2">
          <p className="font-semibold">{t.timetable.clashes(clashes.length)}</p>
          <ul className="ml-4 list-disc">
            {clashes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {mismatches.length > 0 && (
        <details>
          <summary className="cursor-pointer font-semibold">
            {t.timetable.counts} ({mismatches.length})
          </summary>
          <ul className="mt-1 ml-4 list-disc">
            {mismatches.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </details>
      )}
    </Banner>
  );
}
