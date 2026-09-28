import { Plus, Trash2 } from 'lucide-react';
import type { DateRange, Settings } from '../domain/types';
import { useT } from '../i18n';
import { checkCalendar, totalTeachingWeeks } from '../lib/calendar';
import { BareInput, Banner, Button, TextInput } from './ui';

export type CalendarValue = Pick<Settings, 'yearStart' | 'quarters' | 'holidays'>;

/** Tidy a calendar before saving: drop unnamed holidays, sort by date. */
export const cleanCalendar = (c: CalendarValue): CalendarValue => ({
  ...c,
  quarters: [...c.quarters].sort((a, b) => a.start.localeCompare(b.start)),
  holidays: c.holidays.filter((h) => h.name.trim()).sort((a, b) => a.start.localeCompare(b.start)),
});

/** Edits the school year: week 1, the terms (quarters or trimesters) and holidays. */
export function CalendarFields({ value: c, onChange }: { value: CalendarValue; onChange: (c: CalendarValue) => void }) {
  const t = useT();
  const problems = checkCalendar(c);
  const editRange = (key: 'quarters' | 'holidays', i: number, p: Partial<DateRange>) => onChange({ ...c, [key]: c[key].map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const removeRange = (key: 'quarters' | 'holidays', i: number) => onChange({ ...c, [key]: c[key].filter((_, j) => j !== i) });

  const rangeRow = (key: 'quarters' | 'holidays', r: DateRange, i: number) => (
    <li key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-sunk p-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center sm:bg-transparent sm:p-0">
      <BareInput aria-label={t.settings.holidayName} value={r.name} onChange={(e) => editRange(key, i, { name: e.target.value })} className={key === 'quarters' ? 'font-semibold' : ''} />
      <div className="col-span-2 row-start-2 grid grid-cols-2 gap-2 sm:col-span-2 sm:row-start-auto">
        <BareInput aria-label={`${r.name} ${t.settings.from}`} type="date" value={r.start} onChange={(e) => editRange(key, i, { start: e.target.value })} />
        <BareInput aria-label={`${r.name} ${t.settings.to}`} type="date" value={r.end} onChange={(e) => editRange(key, i, { end: e.target.value })} />
      </div>
      <Button variant="ghost" size="sm" aria-label={`${t.common.delete} ${r.name}`} onClick={() => removeRange(key, i)} className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto" disabled={key === 'quarters' && c.quarters.length <= 1}>
        <Trash2 size={18} />
      </Button>
    </li>
  );

  const lastEnd = (list: DateRange[]) => list.reduce((m, r) => (r.end > m ? r.end : m), c.yearStart);

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-xs">
        <TextInput label={t.settings.yearStart} type="date" value={c.yearStart} onChange={(e) => onChange({ ...c, yearStart: e.target.value })} />
      </div>
      <div>
        <h3 className="mb-2 font-semibold">
          {t.settings.quarters} <span className="font-normal text-ink-soft">· {t.settings.teachingWeeks(totalTeachingWeeks(c))}</span>
        </h3>
        <ul className="flex flex-col gap-2">{c.quarters.map((r, i) => rangeRow('quarters', r, i))}</ul>
        <Button size="sm" variant="ghost" icon={<Plus size={16} />} className="mt-2" onClick={() => onChange({ ...c, quarters: [...c.quarters, { name: `${t.settings.termShort}${c.quarters.length + 1}`, start: lastEnd(c.quarters), end: lastEnd(c.quarters) }] })}>
          {t.settings.addTerm}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{t.settings.holidays}</h3>
        <ul className="flex flex-col gap-2">{c.holidays.map((r, i) => rangeRow('holidays', r, i))}</ul>
        <Button size="sm" variant="ghost" icon={<Plus size={16} />} className="mt-2" onClick={() => onChange({ ...c, holidays: [...c.holidays, { name: '', start: c.yearStart, end: c.yearStart }] })}>
          {t.settings.addHoliday}
        </Button>
      </div>
      {problems.length > 0 && <Banner tone="warn">{problems.map((p) => <div key={p.message}>{p.message}</div>)}</Banner>}
    </div>
  );
}
