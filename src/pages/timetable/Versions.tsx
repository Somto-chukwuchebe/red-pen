import { useState } from 'react';
import { Banner, Button, Card, Dialog, Select, TextInput } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { db } from '../../db/db';
import { newId, remove, save, touchLocal } from '../../db/repo';
import type { TimetableSlot, TimetableVersion } from '../../domain/types';
import { useT } from '../../i18n';
import { todayISO } from '../../lib/dates';
import { dayMonth } from '../../lib/format';
import { versionFor } from '../../lib/schedule';

interface Draft {
  id?: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string;
  copyFrom: string;
}

export function Versions({ versions, slots, selectedId, onSelect }: { versions: TimetableVersion[]; slots: TimetableSlot[]; selectedId: string; onSelect: (id: string) => void }) {
  const t = useT();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const current = versionFor(versions, todayISO());
  const sorted = [...versions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  async function onSave() {
    if (!draft || !draft.name.trim() || !draft.effectiveFrom) return;
    const id = draft.id ?? newId('tt');
    await save<TimetableVersion>('timetableVersions', {
      id,
      name: draft.name.trim(),
      effectiveFrom: draft.effectiveFrom,
      ...(draft.effectiveTo ? { effectiveTo: draft.effectiveTo } : {}),
    });
    if (!draft.id && draft.copyFrom) {
      const now = Date.now();
      const copies = slots.filter((s) => s.timetableVersionId === draft.copyFrom).map((s) => ({ ...s, id: newId('slot'), timetableVersionId: id, updatedAt: now }));
      await db.slots.bulkPut(copies);
      await touchLocal();
    }
    toast(t.common.saved);
    onSelect(id);
    setDraft(null);
  }

  async function onDelete(v: TimetableVersion) {
    if (versions.length <= 1) return alert(t.timetable.deleteVersionBlocked);
    if (!confirm(t.common.confirmDelete)) return;
    await remove('slots', slots.filter((s) => s.timetableVersionId === v.id).map((s) => s.id));
    await remove('timetableVersions', v.id);
    if (selectedId === v.id) onSelect(sorted.find((x) => x.id !== v.id)!.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">{t.timetable.versionsIntro}</p>
      <ul className="flex flex-col gap-3">
        {sorted.map((v) => (
          <Card as="li" key={v.id} className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{v.name}</p>
              <p className="text-ink-soft">
                {t.timetable.effective(dayMonth(t.locale, v.effectiveFrom), v.effectiveTo && dayMonth(t.locale, v.effectiveTo))} ·{' '}
                {t.common.lessons(slots.filter((s) => s.timetableVersionId === v.id).length)}
              </p>
            </div>
            {current?.id === v.id && <span className="rounded-full bg-pen-soft px-3 py-1 text-sm font-medium">{t.timetable.inForceToday}</span>}
            <Button size="sm" onClick={() => onSelect(v.id)} disabled={selectedId === v.id}>
              {t.common.open}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft({ id: v.id, name: v.name, effectiveFrom: v.effectiveFrom, effectiveTo: v.effectiveTo ?? '', copyFrom: '' })}>
              {t.common.edit}
            </Button>
            <Button size="sm" variant="quiet-danger" onClick={() => onDelete(v)}>
              {t.common.delete}
            </Button>
          </Card>
        ))}
      </ul>
      <div>
        <Button variant="primary" onClick={() => setDraft({ name: '', effectiveFrom: todayISO(), effectiveTo: '', copyFrom: current?.id ?? '' })}>
          {t.timetable.newVersion}
        </Button>
      </div>

      <Dialog
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? t.common.edit : t.timetable.newVersion}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>{t.common.cancel}</Button>
            <Button variant="primary" onClick={onSave} disabled={!draft?.name.trim() || !draft?.effectiveFrom}>
              {t.common.save}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <TextInput label={t.timetable.versionName} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t.timetable.versionPlaceholder} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t.timetable.effectiveFrom} type="date" value={draft.effectiveFrom} onChange={(e) => setDraft({ ...draft, effectiveFrom: e.target.value })} />
              <TextInput label={`${t.timetable.effectiveTo} (${t.common.optional})`} type="date" value={draft.effectiveTo} onChange={(e) => setDraft({ ...draft, effectiveTo: e.target.value })} />
            </div>
            {!draft.id && (
              <Select label={t.timetable.copyFrom} value={draft.copyFrom} onChange={(e) => setDraft({ ...draft, copyFrom: e.target.value })}>
                <option value="">{t.timetable.copyNothing}</option>
                {sorted.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            )}
            {draft.effectiveTo && draft.effectiveTo < draft.effectiveFrom && <Banner tone="warn">{t.timetable.endBeforeStart}</Banner>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
