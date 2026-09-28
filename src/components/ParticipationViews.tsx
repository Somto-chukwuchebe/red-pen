// Participation displays: the student × lesson grid, the class trend line, and the flag list.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LessonLog, Participation, Student } from '../domain/types';
import { useT } from '../i18n';
import { dayMonth } from '../lib/format';
import { classAverages, LOW_STREAK, studentHistory, studentStats } from '../lib/participation';
import { LowFlag, ratingStyle } from './Rating';
import { cx } from './ui';

/** Students × their last lessons. Each cell shows the rating (number + shade) or "abs". */
export function ParticipationGrid({ students, logs, participation, lessons = 8 }: { students: Student[]; logs: LessonLog[]; participation: Participation[]; lessons?: number }) {
  const t = useT();
  const recent = logs
    .filter((l) => l.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt - b.updatedAt)
    .slice(-lessons);
  const rating = new Map(participation.map((p) => [`${p.lessonLogId}:${p.studentId}`, p.rating]));
  if (!recent.length) return <p className="text-ink-soft">{t.progress.noRatings}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5 text-sm">
        <caption className="sr-only">{t.progress.gridCaption}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-card px-2 py-1 text-left font-medium text-ink-soft">{t.common.name}</th>
            {recent.map((l) => (
              <th key={l.id} scope="col" className="min-w-10 px-1 py-1 text-center text-xs font-medium whitespace-nowrap text-ink-soft tabular-nums">
                {dayMonth(t.locale, l.date)}
              </th>
            ))}
            <th scope="col" className="px-2 py-1 text-right text-xs font-medium text-ink-soft">{t.progress.average}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const st = studentStats(studentHistory(s.id, logs, participation));
            return (
              <tr key={s.id}>
                <th scope="row" className="sticky left-0 bg-card px-2 py-1 text-left font-medium">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    {s.name}
                    {st.streak >= LOW_STREAK && <LowFlag streak={st.streak} compact />}
                  </span>
                </th>
                {recent.map((l) => {
                  const absent = l.absentStudentIds.includes(s.id);
                  const r = rating.get(`${l.id}:${s.id}`) ?? null;
                  const label = absent ? t.progress.absent : r ? `${r} · ${t.rating.levels[r - 1]}` : t.progress.unrated;
                  return (
                    <td key={l.id} className="p-0 text-center">
                      <span
                        title={`${dayMonth(t.locale, l.date)}: ${label}`}
                        aria-label={`${s.name}, ${dayMonth(t.locale, l.date)}: ${label}`}
                        className={cx('grid h-9 min-w-10 place-items-center rounded-md text-sm font-semibold tabular-nums', !r && 'text-ink-soft', absent && 'text-xs font-normal')}
                        style={r && !absent ? ratingStyle(r) : undefined}
                      >
                        {absent ? t.progress.absShort : r ?? '·'}
                      </span>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right font-semibold tabular-nums">{st.average === null ? '–' : st.average.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <RatingLegend />
    </div>
  );
}

export function RatingLegend() {
  const t = useT();
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft" aria-label={t.progress.legend}>
      {[1, 2, 3, 4, 5].map((r) => (
        <li key={r} className="flex items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded text-[11px] font-bold" style={ratingStyle(r)}>
            {r}
          </span>
          {t.rating.levels[r - 1]}
        </li>
      ))}
    </ul>
  );
}

/** Average participation of the class, lesson by lesson (one series, so no legend box). */
export function ClassTrend({ logs, participation }: { logs: LessonLog[]; participation: Participation[] }) {
  const t = useT();
  const data = classAverages(logs, participation).map((x) => ({ date: dayMonth(t.locale, x.date), average: Math.round(x.average * 10) / 10, rated: x.rated }));
  if (data.length < 2) return <p className="text-sm text-ink-soft">{t.progress.trendNeedsMore}</p>;
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-medium text-ink-soft">{t.progress.trendTitle}</figcaption>
      <div className="h-48 w-full" role="img" aria-label={`${t.progress.trendTitle}: ${data.map((d) => `${d.date} ${d.average}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="var(--line)" strokeWidth={1} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} minTickGap={16} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: 'var(--ink-soft)', strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-line bg-card px-3 py-2 text-sm shadow-lg">
                    <p className="text-base font-semibold tabular-nums">{String(payload[0].value)}</p>
                    <p className="flex items-center gap-1.5 text-ink-soft">
                      <span aria-hidden className="inline-block h-0.5 w-3 rounded bg-pen" />
                      {t.progress.average} · {label} · {t.progress.ratedCount(payload[0].payload.rated)}
                    </p>
                  </div>
                ) : null
              }
            />
            <Line type="monotone" dataKey="average" stroke="var(--pen)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={{ r: 4, fill: 'var(--pen)', stroke: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--pen)', stroke: 'var(--card)', strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
