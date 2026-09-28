import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Logo } from '../components/Logo';
import { Button, EmptyState } from '../components/ui';
import { db } from '../db/db';
import { useSettings } from '../db/hooks';
import { isEnglish } from '../db/seed';
import { useT } from '../i18n';
import { frameworkFor, stagesFor } from '../lib/framework';

/** A one-page lesson card, laid out for A4 printing (or "Save as PDF"). */
export function PrintCardPage() {
  const t = useT();
  const navigate = useNavigate();
  const { lessonId = '' } = useParams();
  const [params] = useSearchParams();
  const settings = useSettings();
  const data = useLiveQuery(async () => {
    const lesson = await db.lessons.get(lessonId);
    if (!lesson) return null;
    const module = await db.modules.get(lesson.moduleId);
    const group = params.get('group') ? await db.groups.get(params.get('group')!) : undefined;
    const games = (await db.games.bulkGet(lesson.gameIds)).filter((g) => !!g);
    const resources = (await db.resources.bulkGet(lesson.resourceIds)).filter((r) => !!r);
    const framework = frameworkFor(await db.frameworks.toArray(), group?.type ?? 'primary', lesson.label);
    return { lesson, module, group, games, resources, framework };
  }, [lessonId, params.get('group')]);

  if (data === undefined || !settings) return null;
  if (data === null) return <EmptyState title={t.planner.notFound} />;
  const { lesson, module, group, games, resources, framework } = data;
  const length = group?.lessonLengthMin ?? 40;
  const stages = lesson.stages.length ? lesson.stages : stagesFor(framework, length).map((s) => ({ name: s.name, minutes: s.minutes, notes: s.description }));
  const prep = games.map((g) => g!.prep).filter((p) => p && !/^(none|нет)$/i.test(p.trim()));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap justify-between gap-2">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
          {t.common.back}
        </Button>
        <Button variant="primary" icon={<Printer size={18} />} onClick={() => window.print()}>
          {t.planner.printNow}
        </Button>
      </div>
      <p className="no-print mb-4 text-sm text-ink-soft">{t.planner.printHint}</p>

      <article className="print-card rounded-2xl border border-line bg-white p-6 text-[#1f2a44] print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#c8332b] pb-3">
          <div>
            <p className="text-sm text-[#56607a]">
              {module?.title} {module?.months && `· ${module.months}`}
            </p>
            <h1 className="text-2xl font-semibold">{lesson.label}</h1>
            <p className="mt-1 text-lg">{lesson.focus}</p>
          </div>
          <div className="shrink-0 text-right text-sm">
            <Logo size={28} />
            <p className="mt-1 font-semibold">{group?.name ?? ''}</p>
            <p className="text-[#56607a]">{length} {t.common.minutes}</p>
            <p className="mt-1 text-[#56607a]">{t.planner.dateLine}</p>
          </div>
        </header>

        {module?.keyLanguage && (
          <section className="mt-3">
            <h2 className="text-sm font-semibold tracking-wide text-[#c8332b] uppercase">{isEnglish(settings.subject) ? t.curriculum.keyLanguage : t.lessonView.keyContent}</h2>
            <p>{module.keyLanguage}</p>
          </section>
        )}

        {stages.length > 0 && (
          <section className="mt-3">
            <h2 className="text-sm font-semibold tracking-wide text-[#c8332b] uppercase">{t.lessonView.stages}</h2>
            <table className="mt-1 w-full border-collapse text-sm">
              <tbody>
                {stages.map((s, i) => (
                  <tr key={i} className="border-b border-[#e4dac6] align-top">
                    <td className="w-12 py-1.5 pr-2 font-semibold tabular-nums">{s.minutes}′</td>
                    <td className="w-40 py-1.5 pr-2 font-semibold">{s.name}</td>
                    <td className="py-1.5 whitespace-pre-line text-[#33405e]">{s.notes}</td>
                    <td className="w-8 py-1.5 text-right text-[#9aa1b2]">☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {lesson.activities && (
          <section className="mt-3">
            <h2 className="text-sm font-semibold tracking-wide text-[#c8332b] uppercase">{t.curriculum.activities}</h2>
            <p className="whitespace-pre-line">{lesson.activities}</p>
          </section>
        )}

        {games.length > 0 && (
          <section className="mt-3">
            <h2 className="text-sm font-semibold tracking-wide text-[#c8332b] uppercase">{t.today.games}</h2>
            <ul className="text-sm">
              {games.map((g) => (
                <li key={g!.id} className="mt-1">
                  <span className="font-semibold">{/[.!?…]$/.test(g!.name) ? g!.name : `${g!.name}.`}</span> {g!.howItWorks}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          {(prep.length > 0 || resources.length > 0) && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide text-[#c8332b] uppercase">{t.planner.bring}</h2>
              <ul className="list-inside list-disc text-sm">
                {prep.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
                {resources.map((r) => (
                  <li key={r!.id}>
                    {r!.name}
                    {r!.link && <span className="text-[#56607a]"> — {r!.link.replace(/^https?:\/\//, '')}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="text-sm font-semibold tracking-wide text-[#c8332b] uppercase">{t.planner.afterLesson}</h2>
            <div className="mt-1 h-16 rounded border border-dashed border-[#c9c1ae]" />
          </section>
        </div>
      </article>
    </div>
  );
}
