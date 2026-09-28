import { useEffect, useState } from 'react';
import { Banner, Button, Dialog, Select, TextInput } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { newId, remove, save } from '../../db/repo';
import type { Group, TimetableSlot, Weekday } from '../../domain/types';
import { useT } from '../../i18n';
import { addMinutes, normaliseTime, toMinutes } from '../../lib/dates';

export interface SlotDraft {
  id?: string;
  groupId: string;
  weekday: Weekday;
  startTime: string;
  endTime?: string;
  room: string;
}

export function SlotEditor({
  draft,
  versionId,
  groups,
  otherSlots,
  weekdays,
  onClose,
}: {
  draft: SlotDraft | null;
  versionId: string;
  groups: Group[];
  otherSlots: TimetableSlot[];
  weekdays: Weekday[];
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [d, setD] = useState<SlotDraft | null>(draft);
  const [endTouched, setEndTouched] = useState(false);

  useEffect(() => {
    setD(draft);
    setEndTouched(!!draft?.id);
  }, [draft]);

  if (!d) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  const group = groups.find((g) => g.id === d.groupId);
  const autoEnd = group ? addMinutes(d.startTime || '00:00', group.lessonLengthMin) : d.endTime;
  const end = endTouched ? d.endTime ?? autoEnd : autoEnd;
  const validTimes = !!normaliseTime(d.startTime) && !!end && toMinutes(end) > toMinutes(d.startTime);
  const clashes = otherSlots.filter(
    (s) => s.id !== d.id && s.weekday === d.weekday && toMinutes(s.startTime) < toMinutes(end ?? d.startTime) && toMinutes(d.startTime) < toMinutes(s.endTime),
  );
  const name = (id: string) => groups.find((g) => g.id === id)?.name ?? '?';

  async function onSave() {
    if (!d || !group || !validTimes || !end) return;
    await save<TimetableSlot>('slots', {
      id: d.id ?? newId('slot'),
      timetableVersionId: versionId,
      groupId: d.groupId,
      weekday: d.weekday,
      startTime: normaliseTime(d.startTime)!,
      endTime: end,
      room: d.room.trim(),
    });
    toast(t.common.saved);
    onClose();
  }

  async function onDelete() {
    if (!d?.id || !confirm(t.common.confirmDelete)) return;
    await remove('slots', d.id);
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={d.id ? t.timetable.editLesson : t.timetable.addLesson}
      footer={
        <>
          {d.id && (
            <Button variant="quiet-danger" onClick={onDelete} className="mr-auto">
              {t.common.delete}
            </Button>
          )}
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave} disabled={!group || !validTimes}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select label={t.common.group} value={d.groupId} onChange={(e) => setD({ ...d, groupId: e.target.value })}>
            <option value="" disabled>
              —
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} · {g.lessonLengthMin} {t.common.minutes}
              </option>
            ))}
          </Select>
        </div>
        <Select label={t.common.day} value={d.weekday} onChange={(e) => setD({ ...d, weekday: Number(e.target.value) as Weekday })}>
          {weekdays.map((w) => (
            <option key={w} value={w}>
              {t.weekdays[w - 1]}
            </option>
          ))}
        </Select>
        <TextInput label={t.common.room} value={d.room} onChange={(e) => setD({ ...d, room: e.target.value })} placeholder="12" />
        <TextInput label={t.common.start} type="time" step={300} value={d.startTime} onChange={(e) => setD({ ...d, startTime: e.target.value })} required />
        <TextInput
          label={t.common.end}
          type="time"
          step={300}
          value={end ?? ''}
          onChange={(e) => {
            setEndTouched(true);
            setD({ ...d, endTime: e.target.value });
          }}
          hint={group && !endTouched ? t.timetable.endAuto(group.lessonLengthMin) : undefined}
        />
      </div>
      {clashes.length > 0 && (
        <div className="mt-4">
          <Banner tone="warn">
            {clashes.map((c) => (
              <div key={c.id}>{t.timetable.clashLine(group?.name ?? '', `${name(c.groupId)} ${c.startTime}–${c.endTime}`, t.weekdays[d.weekday - 1])}</div>
            ))}
          </Banner>
        </div>
      )}
    </Dialog>
  );
}
