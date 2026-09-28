import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { LogSheet, type LogTarget } from '../components/LogSheet';
import { Button, Card, EmptyState } from '../components/ui';
import { db } from '../db/db';
import { useSettings } from '../db/hooks';
import { isEnglish } from '../db/seed';
import { useT } from '../i18n';
import { todayISO } from '../lib/dates';
import { longDate } from '../lib/format';
import { frameworkFor, stagesFor } from '../lib/framework';

/** "Start lesson": the plan in big type (good on a projector), then Done → log. */
export function LessonPage() {
  const t = useT();
  const navigate = useNavigate();
  const { groupId = '' } = useParams();
  const [params] = useSearchParams();
  const date = params.get('date') ?? todayISO();
  const occurrenceKey = params.get('key') ?? undefined;
  const start = params.get('start') ?? undefined;
  const settings = useSettings();
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);

  const data = useLiveQuery(async () => {
    const group = await db.groups.get(groupId);
    if (!group) return null;
    const logged = occurrenceKey ? await db.logs.where('occurrenceKey').equals(occurrenceKey).first() : undefined;
    // Once logged, show the lesson that was taught (the group has already moved on).
    const lessonId = logged ? logged.plannedLessonId : group.currentPlannedLessonId;
    const lesson = lessonId ? await db.lessons.get(lessonId) : undefined;
    const module = lesson ? await db.modules.get(lesson.moduleId) : undefined;
    const games = lesson ? (await db.games.bulkGet(lesson.gameIds)).filter((g) => !!g) : [];
    const resources = lesson ? (await db.resources.bulkGet(lesson.resourceIds)).filter((r) => !!r) : [];
    const framework = frameworkFor(await db.frameworks.toArray(), group.type, lesson?.label);
    return { group, lesson, module, games, resources, framework, logged };
  }, [groupId, occurrenceKey]);

  const openLog = () => setLogTarget({ groupId, date, occurrenceKey, start, logId: data?.logged?.id });

  // D opens the log from here too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select') || logTarget) return;
      if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        e.preventDefault();
        openLog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (data === undefined || !settings) return null;
  if (data === null) return <EmptyState title={t.errors.generic} />;
  const { group, lesson, module, games, resources, framework, logged } = data;
  const stages = lesson?.stages.length ? lesson.stages.map((s) => ({ ...s, description: s.notes })) : stagesFor(framework, group.lessonLengthMin);
  const keyLabel = isEnglish(settings.subject) ? t.today.keyLanguage : t.lessonView.keyContent;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
          {t.common.back}
        </Button>
        <span className="text-ink-soft first-letter:uppercase">
          {longDate(t.locale, date)}
          {start && ` · ${start}`}
        </span>
      </div>

      <header className="relative overflow-hidden rounded-2xl border border-line bg-card p-5 pl-7 sm:p-8 sm:pl-10">
        <span aria-hidden className="absolute inset-y-0 left-0 w-2" style={{ background: group.colour }} />
        <p className="font-serif text-4xl font-semibold sm:text-5xl">{group.name}</p>
        {lesson ? (
          <>
            <p className="mt-2 text-lg text-ink-soft">
              {module?.title} · <span className="font-medium text-pen">{lesson.label}</span>
            </p>
            <p className="mt-3 text-2xl leading-snug sm:text-4xl">{lesson.focus}</p>
          </>
        ) : (
          <p className="mt-3 text-xl text-ink-soft">
            {t.today.noPlan}.{' '}
            <Link to={`/groups/${group.id}`} className="font-medium text-pen underline">
              {t.lessonView.choosePlan}
            </Link>
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-5">
          {module?.keyLanguage && (
            <Card>
              <h2 className="mb-2 text-xl font-semibold">{keyLabel}</h2>
              <p className="text-xl leading-relaxed sm:text-2xl">{module.keyLanguage}</p>
            </Card>
          )}
          {(lesson?.activities || module?.songs) && (
            <Card>
              {lesson?.activities && (
                <>
                  <h2 className="mb-2 text-xl font-semibold">{t.curriculum.activities}</h2>
                  <p className="mb-3 text-lg">{lesson.activities}</p>
                </>
              )}
              {module?.songs && (
                <>
                  <h2 className="mb-2 text-xl font-semibold">{t.curriculum.songs}</h2>
                  <p className="text-lg">{module.songs}</p>
                </>
              )}
            </Card>
          )}
          {games.length > 0 && (
            <Card>
              <h2 className="mb-3 text-xl font-semibold">{t.today.games}</h2>
              <ul className="flex flex-col gap-3">
                {games.map((g) => (
                  <li key={g!.id}>
                    <p className="text-lg font-semibold">{g!.name}</p>
                    <p className="text-ink-soft">{g!.howItWorks}</p>
                    {g!.prep && g!.prep !== 'None' && <p className="text-sm text-ink-soft">{t.lessonView.prep}: {g!.prep}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {resources.length > 0 && (
            <Card>
              <h2 className="mb-2 text-xl font-semibold">{t.today.resources}</h2>
              <ul className="flex flex-col gap-1">
                {resources.map((r) => (
                  <li key={r!.id}>
                    <a href={r!.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-pen underline underline-offset-2">
                      {r!.name} <ExternalLink size={14} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {stages.length > 0 && (
          <Card>
            <h2 className="mb-3 text-xl font-semibold">
              {t.lessonView.stages} <span className="font-normal text-ink-soft">· {group.lessonLengthMin} {t.common.minutes}</span>
            </h2>
            <ol className="flex flex-col gap-3">
              {stages.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-12 shrink-0 pt-0.5 text-right font-semibold tabular-nums text-pen">{s.minutes}′</span>
                  <span>
                    <span className="font-semibold">{s.name}</span>
                    {s.description && <span className="block text-sm text-ink-soft">{s.description}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-6">
        <Button variant="primary" size="lg" icon={<Check size={22} />} onClick={openLog} className="shadow-lg">
          {logged ? t.lessonView.editLog : t.lessonView.done}
          <kbd className="hidden rounded border border-white/40 px-1.5 text-xs sm:inline">D</kbd>
        </Button>
      </div>

      <LogSheet target={logTarget} onClose={() => setLogTarget(null)} onSaved={() => navigate('/today')} />
    </div>
  );
}
