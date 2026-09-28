import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useParams } from 'react-router';
import { Dialog, EmptyState, GroupChip, PageHeader, cx } from '../components/ui';
import { db } from '../db/db';
import { useGroups } from '../db/hooks';
import type { Group, PlannedLesson } from '../domain/types';
import { useT } from '../i18n';

export function CurriculumPage() {
  const t = useT();
  const { key } = useParams();
  const curricula = useLiveQuery(() => db.curricula.orderBy('order').toArray(), []);
  const groups = useGroups();
  const active = curricula?.find((c) => c.key === key) ?? curricula?.find((c) => c.key === 'grade-2') ?? curricula?.[0];

  const content = useLiveQuery(async () => {
    if (!active) return null;
    const modules = await db.modules.where('curriculumKey').equals(active.key).sortBy('order');
    const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
    return { modules, lessons };
  }, [active?.key]);

  const [openLesson, setOpenLesson] = useState<PlannedLesson | null>(null);

  if (!curricula || !groups) return null;
  if (!curricula.length) return <EmptyState title={t.curriculum.empty} />;
  if (!active) return null;

  const followers = groups.filter((g) => g.curriculumKey === active.key);
  const here = (lessonId: string) => followers.filter((g) => g.currentPlannedLessonId === lessonId);
  const moduleHas = (moduleId: string) => followers.filter((g) => content?.lessons.some((l) => l.moduleId === moduleId && l.id === g.currentPlannedLessonId));

  return (
    <>
      <PageHeader title={t.curriculum.title} subtitle={active.title} />
      <nav aria-label={t.curriculum.choose} className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {curricula.map((c) => (
          <NavLink
            key={c.key}
            to={`/curriculum/${c.key}`}
            className={cx(
              'flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap',
              c.key === active.key ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : 'border-line bg-card hover:bg-sunk',
            )}
          >
            {c.title.replace(/ · Spotlight \d/, '').replace('Kindergarten · ', 'KG ')}
          </NavLink>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink-soft">{t.curriculum.followedBy}:</span>
        {followers.map((g) => (
          <GroupChip key={g.id} name={g.name} colour={g.colour} />
        ))}
        <span className="text-sm text-ink-soft">· {t.curriculum.modules(content?.modules.length ?? 0)}</span>
      </div>
      {active.intro && <p className="mb-5 max-w-3xl whitespace-pre-line text-ink-soft">{active.intro}</p>}

      <ol className="flex flex-col gap-3">
        {content?.modules.map((m) => {
          const lessons = content.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order);
          const inHere = moduleHas(m.id);
          return (
            <li key={m.id}>
              <details className="group rounded-2xl border border-line bg-card" open={inHere.length > 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold">{m.title}</h2>
                    <p className="text-sm text-ink-soft">
                      {m.months} · {t.common.lessons(lessons.length)}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {inHere.map((g) => (
                      <GroupChip key={g.id} name={g.name} colour={g.colour} />
                    ))}
                  </div>
                  <ChevronDown aria-hidden className="shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  {m.keyLanguage && (
                    <p className="mb-2">
                      <span className="font-medium">{t.curriculum.keyLanguage}:</span> {m.keyLanguage}
                    </p>
                  )}
                  {m.songs && (
                    <p className="mb-2 text-ink-soft">
                      <span className="font-medium text-ink">{t.curriculum.songs}:</span> {m.songs}
                    </p>
                  )}
                  {m.notes && <p className="mb-2 text-ink-soft">{m.notes}</p>}
                  {lessons.length === 0 ? (
                    <p className="text-ink-soft">{t.curriculum.noLessons}</p>
                  ) : (
                    <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                      {lessons.map((l) => (
                        <li key={l.id}>
                          <button type="button" onClick={() => setOpenLesson(l)} className="flex min-h-14 w-full flex-col rounded-xl border border-line bg-paper px-3 py-2 text-left hover:border-ink/30">
                            <span className="flex w-full items-center gap-2">
                              <span className="text-sm font-semibold text-pen">{l.label}</span>
                              <span className="ml-auto flex gap-1">
                                {here(l.id).map((g) => (
                                  <GroupChip key={g.id} name={g.name} colour={g.colour} />
                                ))}
                              </span>
                            </span>
                            <span>{l.focus}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-sm text-ink-soft">{t.curriculum.editLater}</p>

      {openLesson && <LessonDetail lesson={openLesson} groups={here(openLesson.id)} onClose={() => setOpenLesson(null)} />}
    </>
  );
}

function LessonDetail({ lesson, groups, onClose }: { lesson: PlannedLesson; groups: Group[]; onClose: () => void }) {
  const t = useT();
  const extra = useLiveQuery(async () => {
    const module = await db.modules.get(lesson.moduleId);
    const games = (await db.games.bulkGet(lesson.gameIds)).filter((g) => !!g);
    const resources = (await db.resources.bulkGet(lesson.resourceIds)).filter((r) => !!r);
    return { module, games, resources };
  }, [lesson.id]);

  return (
    <Dialog open onClose={onClose} title={`${lesson.label}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">{extra?.module?.title}</p>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g.id} className="rounded-full bg-pen-soft px-3 py-1 text-sm font-medium">
                {t.curriculum.here(g.name)}
              </span>
            ))}
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.focus}</h3>
          <p className="text-lg">{lesson.focus}</p>
        </div>
        {lesson.activities && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.activities}</h3>
            <p>{lesson.activities}</p>
          </div>
        )}
        {extra?.module?.keyLanguage && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.keyLanguage}</h3>
            <p>{extra.module.keyLanguage}</p>
          </div>
        )}
        {!!extra?.games.length && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.games}</h3>
            <ul className="mt-1 flex flex-col gap-2">
              {extra.games.map((g) => (
                <li key={g!.id} className="rounded-xl bg-sunk px-3 py-2">
                  <p className="font-semibold">{g!.name}</p>
                  <p className="text-sm text-ink-soft">{g!.howItWorks}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!extra?.resources.length && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.resources}</h3>
            <ul className="mt-1 flex flex-col gap-1">
              {extra.resources.map((r) => (
                <li key={r!.id}>
                  <a href={r!.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-pen underline underline-offset-2">
                    {r!.name} <ExternalLink size={14} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
