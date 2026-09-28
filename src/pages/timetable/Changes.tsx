import { ArrowRight, Repeat, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Banner, Button, Card, Dialog, EmptyState, GroupChip, Select, TextInput, cx } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { newId, remove, save } from '../../db/repo';
import type { ChangeType, Group, TimetableChange } from '../../domain/types';
import { useT } from '../../i18n';
import { todayISO } from '../../lib/dates';
import { shortDate } from '../../lib/format';
import { lessonsForDate, type ScheduleData } from '../../lib/schedule';

interface Draft {
  date: string;
  type: ChangeType;
  slotId: string;
  otherSlotId: string;
  groupId: string;
  newDate: string;
  newStartTime: string;
  room: string;
  reason: string;
}

export function Changes({ data, groups }: { data: ScheduleData; groups: Group[] }) {
  const t = useT();
  const toast = useToast();
  const today = todayISO();
  const [draft, setDraft] = useState<Draft | null>(null);
  const groupById = new Map(data.groups.map((g) => [g.id, g as Group]));
  const slotById = new Map(data.slots.map((s) => [s.id, s]));

  const sorted = [...data.changes].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((c) => (c.newDate ?? c.date) >= today || c.date >= today);
  const past = sorted.filter((c) => !upcoming.includes(c)).reverse();

  // Lessons on the chosen date, ignoring changes (so you pick from the regular timetable).
  const dayLessons = useMemo(
    () => (draft?.date ? lessonsForDate({ ...data, changes: [] }, draft.date).filter((o) => o.slotId) : []),
    [data, draft?.date],
  );

  async function onSave() {
    if (!draft) return;
    const slot = slotById.get(draft.slotId);
    const base = { id: newId('chg'), date: draft.date, type: draft.type, reason: draft.reason.trim() };
    let change: Omit<TimetableChange, 'updatedAt'>;
    if (draft.type === 'extra') {
      change = { ...base, groupId: draft.groupId, newStartTime: draft.newStartTime, room: draft.room.trim() };
    } else if (draft.type === 'move') {
      change = { ...base, slotId: draft.slotId, groupId: slot?.groupId ?? '', newDate: draft.newDate || draft.date, newStartTime: draft.newStartTime || slot?.startTime, ...(draft.room.trim() ? { room: draft.room.trim() } : {}) };
    } else if (draft.type === 'swap') {
      change = { ...base, slotId: draft.slotId, otherSlotId: draft.otherSlotId, groupId: slot?.groupId ?? '' };
    } else {
      change = { ...base, slotId: draft.slotId, groupId: slot?.groupId ?? '' };
    }
    await save<TimetableChange>('changes', change);
    toast(t.common.saved);
    setDraft(null);
  }

  const canSave =
    !!draft &&
    !!draft.date &&
    (draft.type === 'extra'
      ? !!draft.groupId && !!draft.newStartTime
      : !!draft.slotId && (draft.type !== 'swap' || (!!draft.otherSlotId && draft.otherSlotId !== draft.slotId)) && (draft.type !== 'move' || !!(draft.newDate || draft.newStartTime)));

  function describe(c: TimetableChange) {
    const slot = c.slotId ? slotById.get(c.slotId) : undefined;
    const g = groupById.get(slot?.groupId ?? c.groupId);
    const chip = g ? <GroupChip name={g.name} colour={g.colour} /> : null;
    if (c.type === 'extra') return <>{chip} <span className="tabular-nums">{c.newStartTime}</span>{c.room && ` · ${t.common.roomLabel(c.room)}`}</>;
    if (c.type === 'swap') {
      const other = c.otherSlotId ? groupById.get(slotById.get(c.otherSlotId)?.groupId ?? '') : undefined;
      return (
        <>
          {chip} <Repeat size={16} aria-label="swap" /> {other && <GroupChip name={other.name} colour={other.colour} />}
        </>
      );
    }
    if (c.type === 'move')
      return (
        <>
          {chip} <span className="tabular-nums">{slot?.startTime}</span> <ArrowRight size={16} aria-label="to" />{' '}
          <span className="first-letter:uppercase">{shortDate(t.locale, c.newDate ?? c.date)}</span> <span className="tabular-nums">{c.newStartTime}</span>
        </>
      );
    return <>{chip} <span className="tabular-nums">{slot?.startTime}</span></>;
  }

  const row = (c: TimetableChange) => (
    <Card as="li" key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 !py-3">
      <span className="w-36 font-medium first-letter:uppercase">{shortDate(t.locale, c.date)}</span>
      <span className={cx('rounded-full px-2.5 py-0.5 text-sm font-medium', c.type === 'cancel' ? 'bg-sunk' : 'bg-amber-soft')}>{t.timetable.typeShort[c.type]}</span>
      <span className="flex flex-wrap items-center gap-1.5">{describe(c)}</span>
      {c.reason && <span className="text-ink-soft">· {c.reason}</span>}
      <Button variant="ghost" size="sm" className="ml-auto" aria-label={t.common.delete} onClick={() => confirm(t.common.confirmDelete) && remove('changes', c.id)}>
        <Trash2 size={18} />
      </Button>
    </Card>
  );

  const lessonOption = (o: (typeof dayLessons)[number]) => (
    <option key={o.slotId} value={o.slotId}>
      {o.start} · {groupById.get(o.groupId)?.name}
      {o.room ? ` · ${o.room}` : ''}
    </option>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft">{t.timetable.changesIntro}</p>
        <Button variant="primary" onClick={() => setDraft({ date: today, type: 'cancel', slotId: '', otherSlotId: '', groupId: '', newDate: '', newStartTime: '', room: '', reason: '' })}>
          {t.timetable.addChange}
        </Button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState title={t.timetable.noChanges} />
      ) : (
        <>
          <h2 className="text-xl font-semibold">{t.timetable.upcoming}</h2>
          {upcoming.length ? <ul className="flex flex-col gap-2">{upcoming.map(row)}</ul> : <p className="text-ink-soft">{t.timetable.noChanges}</p>}
          {past.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xl font-semibold">
                {t.timetable.past} ({past.length})
              </summary>
              <ul className="mt-3 flex flex-col gap-2">{past.map(row)}</ul>
            </details>
          )}
        </>
      )}

      <Dialog
        open={!!draft}
        onClose={() => setDraft(null)}
        title={t.timetable.addChange}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>{t.common.cancel}</Button>
            <Button variant="primary" disabled={!canSave} onClick={onSave}>
              {t.common.save}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <TextInput label={t.timetable.pickDate} type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value, slotId: '', otherSlotId: '' })} />
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t.timetable.whatChange}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['cancel', 'move', 'swap', 'extra'] as const).map((type) => (
                  <label key={type} className={cx('flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3', draft.type === type ? 'border-pen bg-pen-soft' : 'border-line')}>
                    <input type="radio" name="change-type" className="h-4 w-4 accent-[var(--pen)]" checked={draft.type === type} onChange={() => setDraft({ ...draft, type })} />
                    {t.timetable.types[type]}
                  </label>
                ))}
              </div>
            </fieldset>

            {draft.type !== 'extra' &&
              (dayLessons.length === 0 ? (
                <Banner tone="info">{t.timetable.noLessonsThatDay}</Banner>
              ) : (
                <Select label={t.timetable.whichLesson} value={draft.slotId} onChange={(e) => setDraft({ ...draft, slotId: e.target.value })}>
                  <option value="">—</option>
                  {dayLessons.map(lessonOption)}
                </Select>
              ))}

            {draft.type === 'swap' && dayLessons.length > 0 && (
              <Select label={t.timetable.swapWith} value={draft.otherSlotId} onChange={(e) => setDraft({ ...draft, otherSlotId: e.target.value })}>
                <option value="">—</option>
                {dayLessons.filter((o) => o.slotId !== draft.slotId).map(lessonOption)}
              </Select>
            )}

            {draft.type === 'move' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label={t.timetable.moveTo} type="date" value={draft.newDate || draft.date} onChange={(e) => setDraft({ ...draft, newDate: e.target.value })} />
                <TextInput label={t.timetable.newTime} type="time" step={300} value={draft.newStartTime} onChange={(e) => setDraft({ ...draft, newStartTime: e.target.value })} />
                <TextInput label={`${t.common.room} (${t.common.optional})`} value={draft.room} onChange={(e) => setDraft({ ...draft, room: e.target.value })} />
              </div>
            )}

            {draft.type === 'extra' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select label={t.common.group} value={draft.groupId} onChange={(e) => setDraft({ ...draft, groupId: e.target.value })}>
                    <option value="">—</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <TextInput label={t.common.start} type="time" step={300} value={draft.newStartTime} onChange={(e) => setDraft({ ...draft, newStartTime: e.target.value })} />
                <TextInput label={t.common.room} value={draft.room} onChange={(e) => setDraft({ ...draft, room: e.target.value })} />
              </div>
            )}

            <TextInput label={`${t.common.reason} (${t.common.optional})`} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder={t.timetable.reasonPlaceholder} />
          </div>
        )}
      </Dialog>
    </div>
  );
}
