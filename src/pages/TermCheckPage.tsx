import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { LogSheet, type LogTarget } from '../components/LogSheet';
import { TermSummaryDialog } from '../components/TermSummary';
import { Button, Card, EmptyState, GroupDot, PageHeader, Select } from '../components/ui';
import { db } from '../db/db';
import { useScheduleData, useSettings } from '../db/hooks';
import type { Group } from '../domain/types';
import { useT } from '../i18n';
import { todayISO } from '../lib/dates';
import { shortDate } from '../lib/format';
import { defaultTermIndex, termCheck } from '../lib/termCheck';

/** Before the end of term: what's still missing in each group. */
export function TermCheckPage() {
  const t = useT();
  const settings = useSettings();
  const schedule = useScheduleData();
  const today = todayISO();
  const [termIndex, setTermIndex] = useState<number | null>(null);
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const [summaryFor, setSummaryFor] = useState<Group | null>(null);

  const data = useLiveQuery(async () => {
    const groups = (await db.groups.orderBy('order').toArray()).filter((g) => !g.archived);
    return {
      groups,
      logs: await db.logs.toArray(),
      participation: await db.participation.toArray(),
      students: await db.students.toArray(),
      lessons: new Map((await db.lessons.toArray()).map((l) => [l.id, l])),
      statements: await db.canDoStatements.toArray(),
      marks: await db.canDoMarks.toArray(),
    };
  }, []);

  if (!settings || !schedule || !data) return null;
  const quarters = settings.quarters;
  if (!data.groups.length || !quarters.length) return <EmptyState title={t.progress.noGroups} />;
  const index = termIndex ?? defaultTermIndex(quarters, today);
  const term = quarters[index];

  const rows = data.groups.map((g) => ({
    g,
    check: termCheck({
      groupId: g.id,
      tracksStudents: g.tracksStudents,
      term,
      today,
      schedule,
      logs: data.logs.filter((l) => l.groupId === g.id),
      participation: data.participation,
      students: data.students.filter((s) => s.groupId === g.id),
      lessons: data.lessons,
      statements: data.statements,
      marks: data.marks.filter((m) => m.groupId === g.id),
    }),
  }));
  // Groups with nothing logged and nothing scheduled this term (e.g. no timetable yet) are listed apart.
  const empty = rows.filter((r) => r.check.taught === 0 && r.check.unlogged.length === 0);
  const active = rows.filter((r) => !empty.includes(r));
  const ready = active.filter((r) => r.check.ready).length;

  return (
    <>
      <PageHeader title={t.termCheck.title} subtitle={t.termCheck.subtitle} />
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Select label={t.summary.term} value={index} onChange={(e) => setTermIndex(Number(e.target.value))}>
            {quarters.map((q, i) => (
              <option key={i} value={i}>
                {q.name}
              </option>
            ))}
          </Select>
        </div>
        <p className="pb-2 text-ink-soft">
          {shortDate(t.locale, term.start)} – {shortDate(t.locale, term.end)} · <span className="font-semibold text-ink">{t.termCheck.readyCount(ready, active.length)}</span>
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {active.map(({ g, check }) => (
          <li key={g.id}>
            <Card>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <GroupDot colour={g.colour} />
                <Link to={`/groups/${g.id}`} className="text-lg font-semibold hover:underline">
                  {g.name}
                </Link>
                {check.ready ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pen-soft px-2 py-0.5 text-sm font-semibold">
                    <CheckCircle2 size={15} className="text-pen" aria-hidden /> {t.termCheck.ready}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-sm font-semibold">
                    <AlertTriangle size={15} className="text-amber" aria-hidden /> {t.termCheck.toDo(check.unlogged.length + check.unrated.length + check.unmarked.length)}
                  </span>
                )}
                <span className="text-sm text-ink-soft">{t.termCheck.taught(check.taught)}</span>
                <Button size="sm" icon={<FileText size={15} />} onClick={() => setSummaryFor(g)} className="ml-auto">
                  {t.summary.button}
                </Button>
              </div>

              {!check.ready && (
                <div className="mt-3 flex flex-col gap-3 text-sm">
                  {check.unlogged.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-semibold">{t.termCheck.unlogged(check.unlogged.length)}</p>
                      <div className="flex flex-wrap gap-2">
                        {check.unlogged.map((o) => (
                          <Button key={o.key} size="sm" onClick={() => setLogTarget({ groupId: g.id, date: o.date, occurrenceKey: o.key, start: o.start })}>
                            <span className="first-letter:uppercase">{shortDate(t.locale, o.date)}</span> · {t.log.logIt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {check.unrated.length > 0 && (
                    <p>
                      <span className="font-semibold">{t.termCheck.unrated(check.unrated.length)}</span> <span className="text-ink-soft">{check.unrated.map((s) => s.name).join(', ')}</span>
                    </p>
                  )}
                  {check.unmarked.length > 0 && (
                    <p>
                      <span className="font-semibold">{t.termCheck.unmarked(check.unmarked.length)}</span>{' '}
                      <span className="text-ink-soft">{check.unmarked.map((s) => `${t.groupPage.iCan} ${s.text}`).join('; ')}</span>{' '}
                      <Link to={`/groups/${g.id}`} className="font-medium text-pen underline">
                        {t.termCheck.markThem}
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
      {empty.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">{t.termCheck.noLessons}</span>
          {empty.map(({ g }, i) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="text-ink-soft hover:underline">
              {g.name}
              {i < empty.length - 1 && ','}
            </Link>
          ))}
        </p>
      )}
      <p className="mt-4 text-sm text-ink-soft">{t.termCheck.hint}</p>

      {summaryFor && <TermSummaryDialog group={summaryFor} onClose={() => setSummaryFor(null)} />}
      <LogSheet target={logTarget} onClose={() => setLogTarget(null)} />
    </>
  );
}
