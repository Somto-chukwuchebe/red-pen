import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, Check, Clock, MapPin, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BackupReminder } from '../components/BackupReminder';
import { LogSheet, type LogTarget } from '../components/LogSheet';
import { Banner, Button, Card, EmptyState, GroupChip, LinkButton, PageHeader, cx } from '../components/ui';
import { db } from '../db/db';
import { useGroups, useScheduleData, useSettings } from '../db/hooks';
import { isEnglish } from '../db/seed';
import type { Group, ISODate, LessonLog } from '../domain/types';
import { useT } from '../i18n';
import { holidayFor, quarterFor, weekNumber } from '../lib/calendar';
import { addDaysISO, todayISO, toMinutes } from '../lib/dates';
import { dayMonth, longDate, shortDate } from '../lib/format';
import { lessonsForDate, type Occurrence } from '../lib/schedule';

export function TodayPage() {
  const t = useT();
  const settings = useSettings();
  const data = useScheduleData();
  const groups = useGroups(true);
  const today = todayISO();
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const logs = useLiveQuery(() => db.logs.where('date').equals(today).toArray(), [today]);

  const lessons = useMemo(() => (data ? lessonsForDate(data, today) : []), [data, today]);
  const hasTimetable = (data?.slots.length ?? 0) > 0;

  // The next school day with lessons, shown when today has none left to teach.
  const upcoming = useMemo(() => {
    if (!data || lessons.some((l) => l.status === 'scheduled')) return null;
    for (let i = 1; i <= 21; i++) {
      const d = addDaysISO(today, i);
      const l = lessonsForDate(data, d).filter((o) => o.status === 'scheduled');
      if (l.length) return { date: d, lessons: l };
    }
    return null;
  }, [data, lessons, today]);

  if (!settings || !data || !groups || !logs) return null;
  const week = weekNumber(settings, today);
  const quarter = quarterFor(settings, today);
  const holiday = holidayFor(settings, today);
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const logByKey = new Map(logs.filter((l) => l.occurrenceKey).map((l) => [l.occurrenceKey!, l]));
  const teachable = lessons.filter((l) => l.status === 'scheduled');
  const done = teachable.filter((l) => logByKey.has(l.key)).length;
  // The first lesson that isn't logged and hasn't finished yet is "next".
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nextKey = teachable.find((l) => !logByKey.has(l.key) && toMinutes(l.end) > nowMin)?.key;

  return (
    <>
      <PageHeader
        title={<span className="first-letter:uppercase">{longDate(t.locale, today)}</span>}
        subtitle={
          <>
            {week ? t.today.weekOf(week, quarter?.name ?? null) : t.today.beforeYear}
            {teachable.length > 0 && <> · {t.today.progress(done, teachable.length)}</>}
          </>
        }
      />
      <div className="flex flex-col gap-4">
        <BackupReminder />

        {!hasTimetable ? (
          <EmptyState
            icon={<CalendarPlus size={40} />}
            title={t.today.noLessons}
            action={
              <LinkButton to={groups.length ? '/timetable' : '/groups'} variant="primary">
                {groups.length ? t.today.setUpTimetable : t.groups.add}
              </LinkButton>
            }
          >
            {groups.length ? t.today.noTimetable : t.today.noGroups}
          </EmptyState>
        ) : lessons.length === 0 ? (
          <Banner tone="info">{holiday ? t.today.holiday(holiday.name) : quarter ? t.today.noLessons : t.today.noSchool}</Banner>
        ) : (
          <ol className="flex flex-col gap-3">
            {lessons.map((o) => (
              <li key={o.key}>
                <LessonCard
                  occ={o}
                  group={groupById.get(o.groupId)}
                  log={logByKey.get(o.key)}
                  isNext={o.key === nextKey}
                  english={isEnglish(settings.subject)}
                  onLog={() => setLogTarget({ groupId: o.groupId, date: o.date, occurrenceKey: o.key, start: o.start, logId: logByKey.get(o.key)?.id })}
                />
              </li>
            ))}
          </ol>
        )}

        {upcoming && (
          <section className="mt-2">
            <h2 className="mb-3 text-xl font-semibold">
              {t.today.upNext}: <span className="first-letter:uppercase">{shortDate(t.locale, upcoming.date)}</span>
            </h2>
            <ol className="flex flex-col gap-2">
              {upcoming.lessons.map((o) => {
                const g = groupById.get(o.groupId);
                return (
                  <li key={o.key} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-2.5">
                    <span className="w-24 shrink-0 tabular-nums text-ink-soft">
                      {o.start}–{o.end}
                    </span>
                    {g && <GroupChip name={g.name} colour={g.colour} />}
                    {o.room && <span className="text-sm text-ink-soft">{t.common.roomLabel(o.room)}</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
      <LogSheet target={logTarget} onClose={() => setLogTarget(null)} />
    </>
  );
}

function LessonCard({ occ, group, log, isNext, english, onLog }: { occ: Occurrence; group?: Group; log?: LessonLog; isNext: boolean; english: boolean; onLog: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const lessonId = log ? log.plannedLessonId : group?.currentPlannedLessonId;
  const plan = useLiveQuery(async () => {
    if (!lessonId) return null;
    const lesson = await db.lessons.get(lessonId);
    if (!lesson) return null;
    const module = await db.modules.get(lesson.moduleId);
    const games = (await db.games.bulkGet(lesson.gameIds)).filter(Boolean);
    return { lesson, module, games };
  }, [lessonId]);

  if (!group) return null;
  const inactive = occ.status !== 'scheduled';
  const statusText =
    occ.status === 'cancelled'
      ? t.today.cancelled
      : occ.status === 'moved-away'
        ? t.today.movedTo(occ.movedTo ? dayMonth(t.locale, occ.movedTo as ISODate) : '')
        : occ.kind === 'moved' && occ.movedFrom
          ? t.today.movedFrom(dayMonth(t.locale, occ.movedFrom))
          : occ.kind === 'swapped'
            ? t.today.swapped
            : occ.kind === 'extra'
              ? t.today.extra
              : null;
  const start = () => navigate(`/lesson/${group.id}?date=${occ.date}&key=${encodeURIComponent(occ.key)}&start=${occ.start}`);

  return (
    <Card as="article" className={cx('relative overflow-hidden pl-5 sm:pl-6', inactive && 'opacity-60', isNext && 'ring-2 ring-pen/40')}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: group.colour }} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className={cx('text-2xl font-semibold', inactive && 'line-through')}>{group.name}</h2>
        <span className="inline-flex items-center gap-1 tabular-nums text-ink-soft">
          <Clock size={16} aria-hidden /> {occ.start}–{occ.end}
        </span>
        {occ.room && (
          <span className="inline-flex items-center gap-1 text-ink-soft">
            <MapPin size={16} aria-hidden /> {t.common.roomLabel(occ.room)}
          </span>
        )}
        {statusText && (
          <span className={cx('rounded-full px-2.5 py-0.5 text-sm font-medium', inactive ? 'bg-sunk text-ink-soft' : 'bg-amber-soft text-ink')}>
            {statusText}
            {occ.note && ` · ${occ.note}`}
          </span>
        )}
        {log && (
          <span className="inline-flex items-center gap-1 rounded-full bg-pen-soft px-2.5 py-0.5 text-sm font-semibold text-pen">
            <Check size={15} aria-hidden /> {t.log.statuses[log.status]}
          </span>
        )}
        {isNext && !log && <span className="rounded-full bg-pen px-2.5 py-0.5 text-sm font-semibold text-white dark:text-[#1b0f0e]">{t.today.next}</span>}
      </div>

      {!inactive && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-soft">{log ? t.today.taught : t.today.nextLesson}</p>
            {plan ? (
              <>
                <p className="mt-0.5 font-medium">
                  {plan.module?.title} · <span className="text-pen">{plan.lesson.label}</span>
                </p>
                <p className="mt-1 text-lg">{plan.lesson.focus}</p>
                {!log && plan.module?.keyLanguage && (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-medium">{english ? t.today.keyLanguage : t.lessonView.keyContent}:</span> {plan.module.keyLanguage}
                  </p>
                )}
                {!log && plan.games.length > 0 && (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-medium">{t.today.games}:</span> {plan.games.map((g) => g!.name).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-ink-soft">{t.today.noPlan}</p>
            )}
          </div>
          <div className="flex gap-2 sm:flex-col sm:items-stretch">
            {log ? (
              <Button onClick={onLog} className="flex-1">
                {t.common.edit}
              </Button>
            ) : (
              <>
                <Button variant="primary" size="lg" icon={<Play size={18} />} onClick={start} className="flex-1">
                  {t.today.startLesson}
                </Button>
                <Button onClick={onLog} className="flex-1" icon={<Check size={18} />}>
                  {t.log.logIt}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
