import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { LowFlag, ratingStyle } from '../components/Rating';
import { Card, EmptyState, GroupDot, PageHeader, SectionTitle, cx } from '../components/ui';
import { db } from '../db/db';
import { useFlagRule, useSettings } from '../db/hooks';
import { useT } from '../i18n';
import { todayISO } from '../lib/dates';
import { dayMonth } from '../lib/format';
import { studentHistory, studentStats } from '../lib/participation';
import { orderedLessons } from '../lib/pointer';
import { groupProgress, type GroupProgress } from '../lib/progress';

/** Every group at a glance: curriculum coverage vs plan, and students who need attention. */
export function ProgressPage() {
  const t = useT();
  const settings = useSettings();
  const rule = useFlagRule();
  const today = todayISO();

  const data = useLiveQuery(async () => {
    const groups = (await db.groups.orderBy('order').toArray()).filter((g) => !g.archived);
    const modules = await db.modules.toArray();
    const lessons = await db.lessons.toArray();
    const logs = await db.logs.toArray();
    const students = (await db.students.toArray()).filter((s) => s.active);
    const participation = await db.participation.toArray();
    return { groups, modules, lessons, logs, students, participation };
  }, []);

  if (!data || !settings) return null;
  if (!data.groups.length) return <EmptyState title={t.progress.noGroups} />;

  const rows = data.groups.map((g) => {
    const mods = data.modules.filter((m) => m.curriculumKey === g.curriculumKey);
    const ls = data.lessons.filter((l) => mods.some((m) => m.id === l.moduleId));
    const prog = groupProgress(settings, mods, orderedLessons(mods, ls), new Map(ls.map((l) => [l.id, l.moduleId])), g.currentPlannedLessonId, today);
    const logs = data.logs.filter((l) => l.groupId === g.id);
    const students = data.students.filter((s) => s.groupId === g.id);
    const stats = students.map((s) => ({ s, h: studentHistory(s.id, logs, data.participation) })).map(({ s, h }) => ({ s, st: studentStats(h, rule), recent: h.filter((x) => !x.absent && x.rating !== null).slice(-Math.max(3, rule.streak)) }));
    return { g, prog, stats, logs };
  });
  const flagged = rows.flatMap((r) => r.stats.filter((x) => x.st.flagged).map((x) => ({ ...x, g: r.g })));
  const count = (s: GroupProgress['state']) => rows.filter((r) => r.prog.state === s).length;

  return (
    <>
      <PageHeader title={t.progress.title} subtitle={t.progress.subtitle} />

      {/* Headline numbers */}
      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t.progress.onTrack, value: count('on-track'), icon: <CheckCircle2 size={18} className="text-pen" aria-hidden /> },
          { label: t.progress.behind, value: count('behind'), icon: <TrendingDown size={18} className="text-amber" aria-hidden /> },
          { label: t.progress.ahead, value: count('ahead'), icon: <TrendingUp size={18} className="text-ink-soft" aria-hidden /> },
          { label: t.progress.needAttention, value: flagged.length, icon: <AlertTriangle size={18} className="text-amber" aria-hidden /> },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-card p-4">
            <dt className="flex items-center gap-1.5 text-sm text-ink-soft">
              {k.icon} {k.label}
            </dt>
            <dd className="mt-1 text-3xl font-semibold">{k.value}</dd>
          </div>
        ))}
      </dl>

      {/* Students who need attention */}
      <Card className="mb-6">
        <SectionTitle>{t.progress.attentionTitle}</SectionTitle>
        <p className="mb-3 text-sm text-ink-soft">{t.progress.attentionHint(rule.low, rule.streak)}</p>
        {flagged.length === 0 ? (
          <p className="text-ink-soft">{t.progress.noneFlagged}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {flagged.map(({ s, g, st, recent }) => (
              <li key={s.id}>
                <Link to={`/groups/${g.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:bg-sunk">
                  <GroupDot colour={g.colour} />
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-sm text-ink-soft">{g.name}</span>
                  <LowFlag streak={st.streak} />
                  <span className="ml-auto flex gap-1" aria-label={t.progress.lastRatings}>
                    {recent.map((r) => (
                      <span key={r.logId} title={dayMonth(t.locale, r.date)} className="grid h-7 w-7 place-items-center rounded text-xs font-bold" style={ratingStyle(r.rating!)}>
                        {r.rating}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Groups */}
      <Card>
        <SectionTitle>{t.progress.groupsTitle}</SectionTitle>
        <p className="mb-4 text-sm text-ink-soft">{t.progress.groupsHint}</p>
        <ul className="flex flex-col gap-4">
          {rows.map(({ g, prog, stats }) => {
            const avg = stats.filter((x) => x.st.average !== null);
            const classAvg = avg.length ? avg.reduce((s, x) => s + x.st.average!, 0) / avg.length : null;
            const coveredPct = prog.total ? (prog.covered / prog.total) * 100 : 0;
            const expectedPct = prog.total ? (prog.expected / prog.total) * 100 : 0;
            return (
              <li key={g.id}>
                <Link to={`/groups/${g.id}`} className="block rounded-xl p-2 hover:bg-sunk">
                  <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <GroupDot colour={g.colour} />
                    <span className="font-semibold">{g.name}</span>
                    {prog.state === 'none' ? (
                      <span className="text-sm text-ink-soft">{t.progress.noCurriculum}</span>
                    ) : (
                      <>
                        <span className="text-sm text-ink-soft tabular-nums">{t.progress.covered(prog.covered, prog.total)}</span>
                        <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', prog.state === 'behind' ? 'bg-amber-soft' : prog.state === 'on-track' ? 'bg-pen-soft' : 'bg-sunk')}>
                          {prog.state === 'behind' ? <TrendingDown size={13} className="text-amber" aria-hidden /> : prog.state === 'ahead' ? <TrendingUp size={13} aria-hidden /> : <CheckCircle2 size={13} className="text-pen" aria-hidden />}
                          {prog.state === 'behind' ? t.progress.behindBy(-prog.diff) : prog.state === 'ahead' ? t.progress.aheadBy(prog.diff) : t.progress.onTrack}
                        </span>
                      </>
                    )}
                    {classAvg !== null && <span className="ml-auto text-sm text-ink-soft">{t.progress.participationAvg(classAvg.toFixed(1))}</span>}
                    {stats.some((x) => x.st.flagged) && <LowFlag streak={rule.streak} compact />}
                  </div>
                  {prog.state !== 'none' && (
                    // A meter: covered so far on a lighter track of the same hue; the tick marks where the plan says the group should be.
                    <div className="relative h-3 rounded-full bg-pen-soft" role="img" aria-label={`${t.progress.covered(prog.covered, prog.total)}; ${t.progress.expected(Math.round(prog.expected))}`}>
                      <div className="h-full rounded-full bg-pen" style={{ width: `${coveredPct}%` }} />
                      <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink" style={{ left: `calc(${expectedPct}% - 1px)` }} title={t.progress.expected(Math.round(prog.expected))} />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
          <span className="inline-block h-3 w-6 rounded-full bg-pen" aria-hidden /> {t.progress.legendCovered}
          <span className="ml-3 inline-block h-4 w-0.5 rounded bg-ink" aria-hidden /> {t.progress.legendExpected}
        </p>
      </Card>
    </>
  );
}
