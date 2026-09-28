import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { shareOrDownload } from '../db/backup';
import { db } from '../db/db';
import { useFlagRule, useSettings } from '../db/hooks';
import type { Group } from '../domain/types';
import { dictionaries, useT } from '../i18n';
import { quarterFor } from '../lib/calendar';
import { toCsv } from '../lib/csv';
import { todayISO } from '../lib/dates';
import { isTouchPhone } from '../lib/platform';
import { progressRows, termSummary } from '../lib/summary';
import { useToast } from './Toast';
import { Button, Dialog, Segmented, Select, Toggle } from './ui';

/** Term summary for one group: a message to copy (EN or RU) and a per-student CSV. */
export function TermSummaryDialog({ group, onClose }: { group: Group; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const settings = useSettings();
  const rule = useFlagRule();
  const [termIndex, setTermIndex] = useState<number | null>(null);
  const [lang, setLang] = useState<'en' | 'ru'>(settings?.language ?? 'en');
  const [includeNames, setIncludeNames] = useState(true);

  const data = useLiveQuery(async () => {
    const logs = await db.logs.where('groupId').equals(group.id).toArray();
    const students = await db.students.where('groupId').equals(group.id).toArray();
    const participation = await db.participation.where('lessonLogId').anyOf(logs.map((l) => l.id)).toArray();
    const modules = group.curriculumKey ? await db.modules.where('curriculumKey').equals(group.curriculumKey).toArray() : [];
    const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
    const next = group.currentPlannedLessonId ? lessons.find((l) => l.id === group.currentPlannedLessonId) : undefined;
    const statements = next ? await db.canDoStatements.where('moduleId').equals(next.moduleId).sortBy('order') : [];
    const marks = await db.canDoMarks.where('groupId').equals(group.id).toArray();
    return { logs, students, participation, modules, lessons, next, statements, marks };
  }, [group.id]);

  const quarters = settings?.quarters ?? [];
  const current = settings ? quarters.findIndex((q) => q.name === quarterFor(settings, todayISO())?.name) : -1;
  const term = quarters[termIndex ?? (current >= 0 ? current : 0)];

  const text = useMemo(() => {
    if (!data || !term || !settings) return '';
    const moduleById = new Map(data.modules.map((m) => [m.id, m]));
    const nextLabel = data.next ? `${moduleById.get(data.next.moduleId)?.title ?? ''} · ${data.next.label}` : null;
    return termSummary(
      {
        group,
        term,
        logs: data.logs,
        students: data.students,
        participation: data.participation,
        lessons: new Map(data.lessons.map((l) => [l.id, l])),
        modules: moduleById,
        canDo: data.statements.map((s) => ({ statement: s, level: data.marks.find((m) => m.statementId === s.id && !m.studentId)?.level ?? null })),
        next: nextLabel,
        teacherName: settings.teacherName,
        includeNames,
        locale: dictionaries[lang].locale,
        rule,
      },
      lang,
    );
  }, [data, term, settings, group, includeNames, lang, rule]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast(t.summary.copied);
    } catch {
      toast(t.summary.copyFailed);
    }
  }

  async function exportCsv() {
    if (!data || !term) return;
    const h = t.summary.csv;
    const rows = progressRows(term, data.logs, data.students, data.participation, data.statements, data.marks, h, t.groupPage.levels, rule);
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    await shareOrDownload(blob, `${group.name.replace(/[^\p{L}\p{N}]+/gu, '-')}-${term.name.replace(/\s+/g, '')}-progress.csv`, isTouchPhone());
  }

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={t.summary.title(group.name)}
      footer={
        <>
          <Button icon={<Download size={16} />} onClick={exportCsv} className="mr-auto">
            {t.summary.spreadsheet}
          </Button>
          <Button onClick={onClose}>{t.common.close}</Button>
          <Button variant="primary" icon={<Copy size={16} />} onClick={copy} disabled={!text}>
            {t.summary.copy}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Select label={t.summary.term} value={termIndex ?? (current >= 0 ? current : 0)} onChange={(e) => setTermIndex(Number(e.target.value))}>
            {quarters.map((q, i) => (
              <option key={i} value={i}>
                {q.name}
              </option>
            ))}
          </Select>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t.summary.language}</p>
            <Segmented label={t.summary.language} value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ru', label: 'Русский' }]} />
          </div>
        </div>
        <Toggle label={t.summary.includeNames} hint={t.summary.includeNamesHint} checked={includeNames} onChange={setIncludeNames} />
        <textarea readOnly value={text} aria-label={t.summary.title(group.name)} rows={12} className="w-full rounded-xl border border-line bg-paper px-3 py-2 font-sans text-sm leading-relaxed" />
        <p className="text-sm text-ink-soft">{t.summary.hint}</p>
      </div>
    </Dialog>
  );
}
