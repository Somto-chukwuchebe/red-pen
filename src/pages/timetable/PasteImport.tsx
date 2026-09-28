import { useMemo, useState } from 'react';
import { Banner, Button, GroupDot, TextArea, cx } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { db } from '../../db/db';
import { newId, touchLocal } from '../../db/repo';
import type { Group, TimetableSlot } from '../../domain/types';
import { useT } from '../../i18n';
import { parseTimetableText } from '../../lib/timetable';

export function PasteImport({ versionId, slots, groups, onDone }: { versionId: string; slots: TimetableSlot[]; groups: Group[]; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>(slots.length ? 'append' : 'replace');
  const rows = useMemo(() => parseTimetableText(text, groups), [text, groups]);
  const ok = rows.filter((r) => !r.error);
  const bad = rows.filter((r) => r.error);
  const colour = (id?: string) => groups.find((g) => g.id === id)?.colour ?? 'transparent';

  async function add() {
    const now = Date.now();
    const fresh: TimetableSlot[] = ok.map((r) => ({
      id: newId('slot'),
      timetableVersionId: versionId,
      groupId: r.groupId!,
      weekday: r.weekday!,
      startTime: r.startTime!,
      endTime: r.endTime!,
      room: r.room,
      updatedAt: now,
    }));
    await db.transaction('rw', db.slots, db.tombstones, async () => {
      if (mode === 'replace') {
        const ids = slots.map((s) => s.id);
        await db.slots.bulkDelete(ids);
        await db.tombstones.bulkPut(ids.map((id) => ({ id: `slots:${id}`, table: 'slots', recordId: id, deletedAt: now })));
      }
      await db.slots.bulkPut(fresh);
    });
    await touchLocal();
    toast(t.timetable.fastSaved(fresh.length));
    setText('');
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">{t.timetable.pasteIntro}</p>
      <pre className="rounded-xl bg-sunk px-4 py-3 text-sm whitespace-pre-wrap text-ink-soft">{t.timetable.pasteExample}</pre>
      <TextArea label={t.timetable.pastePlaceholder} value={text} onChange={(e) => setText(e.target.value)} rows={8} className="font-mono text-sm" spellCheck={false} />

      {rows.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">{t.timetable.preview}</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-pen-soft px-3 py-1 font-medium">✓ {t.timetable.pasteOk(ok.length)}</span>
            {bad.length > 0 && <span className="rounded-full bg-amber-soft px-3 py-1 font-medium">{t.timetable.pasteErrors(bad.length)}</span>}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">{t.timetable.line}</th>
                  <th className="px-3 py-2 font-medium">{t.common.day}</th>
                  <th className="px-3 py-2 font-medium">{t.common.start}–{t.common.end}</th>
                  <th className="px-3 py-2 font-medium">{t.common.group}</th>
                  <th className="px-3 py-2 font-medium">{t.common.room}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={cx('border-b border-line last:border-0', r.error && 'bg-amber-soft')}>
                    <td className="px-3 py-2 tabular-nums text-ink-soft">{r.line}</td>
                    {r.error ? (
                      <td colSpan={4} className="px-3 py-2">
                        <span className="font-mono">{r.text}</span> — <span className="font-medium">{r.error}</span>
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2">{t.weekdaysShort[r.weekday! - 1]}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {r.startTime}–{r.endTime}
                        </td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2 font-semibold">
                            <GroupDot colour={colour(r.groupId)} />
                            {r.groupName}
                          </span>
                        </td>
                        <td className="px-3 py-2">{r.room}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {slots.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              {(['append', 'replace'] as const).map((m) => (
                <label key={m} className="flex min-h-11 items-center gap-3">
                  <input type="radio" name="paste-mode" checked={mode === m} onChange={() => setMode(m)} className="h-5 w-5 accent-[var(--pen)]" />
                  {m === 'append' ? t.timetable.pasteAppend : t.timetable.pasteReplace}
                </label>
              ))}
            </fieldset>
          )}
          {bad.length > 0 && <Banner tone="warn">{t.timetable.pasteErrors(bad.length)}</Banner>}
          <div className="flex justify-end">
            <Button variant="primary" size="lg" disabled={!ok.length} onClick={add}>
              {t.timetable.pasteAdd(ok.length)}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
