import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { LogSheet, type LogTarget } from '../components/LogSheet';
import { Button, EmptyState, GroupDot, PageHeader, cx } from '../components/ui';
import { db } from '../db/db';
import { useGroups, useScheduleData, useSettings } from '../db/hooks';
import type { LessonLog } from '../domain/types';
import { useT } from '../i18n';
import { holidayFor, quarterFor, weekNumber } from '../lib/calendar';
import { addDaysISO, mondayOf, todayISO } from '../lib/dates';
import { dayMonth } from '../lib/format';
import { lessonsForDate, type Occurrence } from '../lib/schedule';

type Status = 'taught' | 'planned' | 'unlogged' | 'cancelled';

export function WeekPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const monday = mondayOf(params.get('start') ?? today);
  const settings = useSettings();
  const data = useScheduleData();
  const groups = useGroups(true);
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const days = settings?.showSaturday ? 6 : 5;
  const dates = Array.from({ length: days }, (_, i) => addDaysISO(monday, i));
  const logs = useLiveQuery(() => db.logs.where('date').between(monday, addDaysISO(monday, 6), true, true).toArray(), [monday]);

  const byDay = useMemo(() => (data ? dates.map((d) => ({ date: d, lessons: lessonsForDate(data, d) })) : []), [data, monday, days]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!settings || !data || !groups || !logs) return null;
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const logByKey = new Map<string, LessonLog>(logs.filter((l) => l.occurrenceKey).map((l) => [l.occurrenceKey!, l]));
  const statusOf = (o: Occurrence): Status => {
    if (o.status !== 'scheduled') return 'cancelled';
    const log = logByKey.get(o.key);
    if (log) return log.status === 'cancelled' ? 'cancelled' : 'taught';
    return o.date < today ? 'unlogged' : 'planned';
  };
  const all = byDay.flatMap((d) => d.lessons).filter((o) => o.status === 'scheduled');
  const taught = all.filter((o) => statusOf(o) === 'taught').length;
  const week = weekNumber(settings, monday);
  const quarter = quarterFor(settings, monday) ?? quarterFor(settings, addDaysISO(monday, 4));
  const go = (d: string) => setParams(d === mondayOf(today) ? {} : { start: d }, { replace: true });

  function open(o: Occurrence) {
    const log = logByKey.get(o.key);
    if (o.status !== 'scheduled' && !log) return;
    if (log || o.date <= today) setLogTarget({ groupId: o.groupId, date: o.date, occurrenceKey: o.key, start: o.start, logId: log?.id });
    else navigate(`/lesson/${o.groupId}?date=${o.date}&key=${encodeURIComponent(o.key)}&start=${o.start}`);
  }

  return (
    <>
      <PageHeader
        title={week ? `${t.common.week} ${week}` : t.nav.week}
        subtitle={`${dayMonth(t.locale, monday)} – ${dayMonth(t.locale, dates[dates.length - 1])}${quarter ? ` · ${quarter.name}` : ''} · ${t.week.taughtOf(taught, all.length)}`}
        actions={
          <div className="flex gap-1">
            <Button aria-label={t.week.prev} onClick={() => go(addDaysISO(monday, -7))} className="w-11 !px-0">
              <ChevronLeft size={20} />
            </Button>
            <Button onClick={() => go(mondayOf(today))} disabled={monday === mondayOf(today)}>
              {t.week.thisWeek}
            </Button>
            <Button aria-label={t.week.next} onClick={() => go(addDaysISO(monday, 7))} className="w-11 !px-0">
              <ChevronRight size={20} />
            </Button>
          </div>
        }
      />

      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft" aria-label={t.week.legend}>
        {(['planned', 'taught', 'unlogged', 'cancelled'] as Status[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cx('inline-block h-3 w-3 rounded-sm border', swatch[s])} /> {t.week.status[s]}
          </li>
        ))}
      </ul>

      {data.slots.length === 0 ? (
        <EmptyState title={t.today.noTimetable} />
      ) : (
        <div className="grid gap-3 md:gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 11rem), 1fr))` }}>
          {byDay.map(({ date, lessons }) => {
            const holiday = holidayFor(settings, date);
            return (
              <section key={date} className={cx('rounded-2xl border bg-card p-2', date === today ? 'border-pen/60' : 'border-line')}>
                <h2 className={cx('px-1.5 pt-1 pb-2 font-sans text-sm font-semibold', date === today && 'text-pen')}>
                  {t.weekdaysShort[dates.indexOf(date)]} {dayMonth(t.locale, date)}
                </h2>
                {holiday && <p className="px-1.5 pb-2 text-sm text-ink-soft">{holiday.name}</p>}
                <ol className="flex flex-col gap-1.5">
                  {lessons.map((o) => {
                    const g = groupById.get(o.groupId);
                    const st = statusOf(o);
                    return (
                      <li key={o.key}>
                        <button
                          type="button"
                          onClick={() => open(o)}
                          className={cx('flex min-h-12 w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-sm', swatch[st])}
                          aria-label={`${g?.name} ${o.start} · ${t.week.status[st]}`}
                        >
                          {g && <GroupDot colour={g.colour} />}
                          <span className="min-w-0 flex-1">
                            <span className={cx('block font-semibold', st === 'cancelled' && 'line-through')}>{g?.name}</span>
                            <span className="block tabular-nums text-ink-soft">{o.start}</span>
                          </span>
                          {st === 'taught' && <Check size={18} className="shrink-0 text-pen" aria-hidden />}
                          {st === 'unlogged' && <span className="shrink-0 text-xs font-semibold text-amber">{t.log.logIt}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
      <LogSheet target={logTarget} onClose={() => setLogTarget(null)} />
    </>
  );
}

const swatch: Record<Status, string> = {
  planned: 'border-line bg-paper',
  taught: 'border-pen/40 bg-pen-soft',
  unlogged: 'border-amber/60 bg-amber-soft',
  cancelled: 'border-dashed border-line bg-sunk text-ink-soft',
};
