import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, Clock, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { BackupReminder } from '../components/BackupReminder';
import { Banner, Button, Card, EmptyState, GroupChip, LinkButton, PageHeader, cx } from '../components/ui';
import { db } from '../db/db';
import { useGroups, useScheduleData, useSettings } from '../db/hooks';
import type { Group, ISODate } from '../domain/types';
import { useT } from '../i18n';
import { holidayFor, quarterFor, weekNumber } from '../lib/calendar';
import { addDaysISO, todayISO } from '../lib/dates';
import { dayMonth, longDate, shortDate } from '../lib/format';
import { lessonsForDate, type Occurrence } from '../lib/schedule';

export function TodayPage() {
  const t = useT();
  const settings = useSettings();
  const data = useScheduleData();
  const groups = useGroups(true);
  const today = todayISO();

  const lessons = useMemo(() => (data ? lessonsForDate(data, today) : []), [data, today]);
  const hasTimetable = (data?.slots.length ?? 0) > 0;

  // The next school day with lessons, shown when today is empty.
  const upcoming = useMemo(() => {
    if (!data || lessons.some((l) => l.status === 'scheduled')) return null;
    for (let i = 1; i <= 21; i++) {
      const d = addDaysISO(today, i);
      const l = lessonsForDate(data, d).filter((o) => o.status === 'scheduled');
      if (l.length) return { date: d, lessons: l };
    }
    return null;
  }, [data, lessons, today]);

  if (!settings || !data || !groups) return null;
  const week = weekNumber(settings, today);
  const quarter = quarterFor(settings, today);
  const holiday = holidayFor(settings, today);
  const groupById = new Map(groups.map((g) => [g.id, g]));

  return (
    <>
      <PageHeader
        title={<span className="first-letter:uppercase">{longDate(t.locale, today)}</span>}
        subtitle={week ? t.today.weekOf(week, quarter?.name ?? null) : t.today.beforeYear}
      />
      <div className="flex flex-col gap-4">
        <BackupReminder />

        {!hasTimetable ? (
          <EmptyState
            icon={<CalendarPlus size={40} />}
            title={t.today.noLessons}
            action={
              <LinkButton to="/timetable" variant="primary">
                {t.today.setUpTimetable}
              </LinkButton>
            }
          >
            {t.today.noTimetable}
          </EmptyState>
        ) : lessons.length === 0 ? (
          <Banner tone="info">{holiday ? t.today.holiday(holiday.name) : quarter ? t.today.noLessons : t.today.noSchool}</Banner>
        ) : (
          <ol className="flex flex-col gap-3">
            {lessons.map((o) => (
              <li key={o.key}>
                <LessonCard occ={o} group={groupById.get(o.groupId)} />
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
                    <span className="w-24 shrink-0 tabular-nums text-ink-soft">{o.start}–{o.end}</span>
                    {g && <GroupChip name={g.name} colour={g.colour} />}
                    {o.room && <span className="text-sm text-ink-soft">{t.common.roomLabel(o.room)}</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </>
  );
}

function LessonCard({ occ, group }: { occ: Occurrence; group?: Group }) {
  const t = useT();
  const plan = useLiveQuery(async () => {
    if (!group?.currentPlannedLessonId) return null;
    const lesson = await db.lessons.get(group.currentPlannedLessonId);
    if (!lesson) return null;
    const module = await db.modules.get(lesson.moduleId);
    const games = (await db.games.bulkGet(lesson.gameIds)).filter(Boolean);
    return { lesson, module, games };
  }, [group?.currentPlannedLessonId]);

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

  return (
    <Card as="article" className={cx('relative overflow-hidden pl-5 sm:pl-6', inactive && 'opacity-60')}>
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
      </div>

      {!inactive && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-soft">{t.today.nextLesson}</p>
            {plan ? (
              <>
                <p className="mt-0.5 font-medium">
                  {plan.module?.title} · <span className="text-pen">{plan.lesson.label}</span>
                </p>
                <p className="mt-1 text-lg">{plan.lesson.focus}</p>
                {plan.module?.keyLanguage && (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-medium">{t.today.keyLanguage}:</span> {plan.module.keyLanguage}
                  </p>
                )}
                {plan.games.length > 0 && (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-medium">{t.today.games}:</span> {plan.games.map((g) => g!.name).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-ink-soft">{t.today.noPlan}</p>
            )}
          </div>
          <Button variant="primary" size="lg" disabled title={t.today.startLessonSoon}>
            {t.today.startLesson}
          </Button>
        </div>
      )}
    </Card>
  );
}
