import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowLeft, ArrowUp, Lightbulb, Plus, Printer, RefreshCw, Trash2, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import { BareInput, BareSelect, Banner, Button, Card, EmptyState, GroupChip, SectionTitle, TextArea, cx } from '../components/ui';
import { db } from '../db/db';
import { useSettings } from '../db/hooks';
import { patch } from '../db/repo';
import { isEnglish } from '../db/seed';
import type { Group, PlannedLesson, Stage } from '../domain/types';
import { useT } from '../i18n';
import { frameworkFor, stagesFor } from '../lib/framework';
import { generateIdeas, type Idea } from '../lib/ideas/generate';
import type { Band, StageHint } from '../lib/ideas/patterns';
import { checkStages, fitStages } from '../lib/stages';
import { recentGameIds } from '../lib/usage';

const bandOf = (g?: Group): Band => (g?.type === 'kindergarten' ? 'kg' : g?.type === 'secondary' ? 'secondary' : 'primary');
const levelTagOf = (g?: Group) => (g?.type === 'kindergarten' ? 'KG' : g?.grade ? String(g.grade) : undefined);

/** Which stage an idea belongs in, by the stage's name. */
function stageFor(stages: Stage[], hint: StageHint): number {
  const patterns: Record<StageHint, RegExp> = {
    'warm-up': /warm|hello|hook|recall|разминк|привет/i,
    practice: /practi|game|activate|words|recall|игр|практи/i,
    main: /main|big|task|speaking|perform|show|основн|задани/i,
    review: /report|wrap|review|goodbye|итог|повтор/i,
  };
  const i = stages.findIndex((s) => patterns[hint].test(s.name));
  if (i >= 0) return i;
  return stages.reduce((best, s, j) => (s.minutes > stages[best].minutes ? j : best), 0);
}

export function PlannerPage() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { lessonId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const settings = useSettings();

  const data = useLiveQuery(async () => {
    const lesson = await db.lessons.get(lessonId);
    if (!lesson) return null;
    const module = await db.modules.get(lesson.moduleId);
    const groups = module ? (await db.groups.where('curriculumKey').equals(module.curriculumKey).toArray()).filter((g) => !g.archived).sort((a, b) => a.order - b.order) : [];
    const pointers = await db.lessons.bulkGet(groups.map((g) => g.currentPlannedLessonId ?? ''));
    const frameworks = await db.frameworks.toArray();
    const games = await db.games.toArray();
    const resources = await db.resources.toArray();
    const logs = await db.logs.where('groupId').anyOf(groups.map((g) => g.id)).toArray();
    return { lesson, module, groups, pointers, frameworks, games, resources, logs };
  }, [lessonId]);

  const [draft, setDraft] = useState<PlannedLesson | null>(null);
  const [variant, setVariant] = useState(0);
  useEffect(() => {
    if (data?.lesson && (!draft || draft.id !== data.lesson.id)) setDraft(data.lesson);
  }, [data?.lesson, draft]);

  const groupId = params.get('group') ?? data?.groups[0]?.id ?? '';
  const group = data?.groups.find((g) => g.id === groupId) ?? data?.groups[0];
  const length = group?.lessonLengthMin ?? 40;
  const framework = data ? frameworkFor(data.frameworks, group?.type ?? 'primary', data.lesson.label) : null;

  const ideas: Idea[] = useMemo(() => {
    if (!data || !draft || !settings) return [];
    return generateIdeas({
      lessonId: draft.id,
      keyLanguage: data.module?.keyLanguage ?? '',
      focus: draft.focus,
      moduleTitle: data.module?.title,
      band: bandOf(group),
      levelTag: levelTagOf(group),
      languageSubject: isEnglish(settings.subject) || /language|язык/i.test(settings.subject ?? ''),
      library: data.games,
      lessonGameIds: draft.gameIds,
      recentGameIds: group ? recentGameIds(data.logs, group.id) : [],
      lang: settings.language,
      variant,
    });
  }, [data, draft?.id, draft?.focus, draft?.gameIds, group, settings, variant]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data === undefined || !settings) return null;
  if (data === null || !draft) return <EmptyState title={t.planner.notFound} />;
  const { lesson, module, groups, pointers, games, resources } = data;
  const stages = draft.stages;
  const check = checkStages(stages, length);
  const editable = (l: PlannedLesson) => JSON.stringify([l.focus, l.activities, l.stages, l.gameIds, l.resourceIds]);
  const dirty = editable(draft) !== editable(lesson);
  const set = (p: Partial<PlannedLesson>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setStage = (i: number, p: Partial<Stage>) => set({ stages: stages.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const move = (i: number, d: -1 | 1) => {
    const next = [...stages];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set({ stages: next });
  };

  async function onSave() {
    if (!draft) return;
    await patch<PlannedLesson>('lessons', draft.id, { focus: draft.focus, activities: draft.activities, stages: draft.stages, gameIds: draft.gameIds, resourceIds: draft.resourceIds });
    toast(t.common.saved);
  }

  function addIdea(idea: Idea, stageIndex: number) {
    if (!stages.length) {
      set({ activities: [draft!.activities, `${idea.title}: ${idea.text}`].filter(Boolean).join('\n') });
    } else {
      setStage(stageIndex, { notes: [stages[stageIndex].notes, `${idea.title}: ${idea.text}`].filter(Boolean).join('\n') });
    }
    if (idea.gameId && !draft!.gameIds.includes(idea.gameId)) set({ gameIds: [...draft!.gameIds, idea.gameId] });
    toast(t.planner.ideaAdded);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
          {t.common.back}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Link to={`/print/${lesson.id}${group ? `?group=${group.id}` : ''}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 font-medium hover:bg-sunk" onClick={async (e) => { if (dirty) { e.preventDefault(); await onSave(); navigate(`/print/${lesson.id}${group ? `?group=${group.id}` : ''}`); } }}>
            <Printer size={18} aria-hidden /> {t.planner.print}
          </Link>
          <Button variant="primary" onClick={onSave} disabled={!dirty}>
            {dirty ? t.common.save : t.common.saved}
          </Button>
        </div>
      </div>

      <header className="rounded-2xl border border-line bg-card p-5">
        <p className="text-ink-soft">{module?.title} {module?.months && `· ${module.months}`}</p>
        <h1 className="text-3xl font-semibold">{lesson.label}</h1>
        {groups.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-soft">{t.planner.planningFor}</span>
            {groups.map((g) => (
              <button key={g.id} type="button" onClick={() => setParams({ group: g.id }, { replace: true })} aria-pressed={g.id === group?.id} className={cx('rounded-full', g.id === group?.id && 'ring-2 ring-pen')}>
                <GroupChip name={`${g.name} · ${g.lessonLengthMin}′`} colour={g.colour} />
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex flex-col gap-4">
              <TextArea label={t.curriculum.focus} rows={2} value={draft.focus} onChange={(e) => set({ focus: e.target.value })} />
              {module?.keyLanguage && (
                <p className="text-sm">
                  <span className="font-medium">{isEnglish(settings.subject) ? t.curriculum.keyLanguage : t.lessonView.keyContent}:</span> <span className="text-ink-soft">{module.keyLanguage}</span>
                </p>
              )}
              <TextArea label={t.curriculum.activities} rows={3} value={draft.activities} onChange={(e) => set({ activities: e.target.value })} />
              <LinkPicker label={t.today.games} all={games} ids={draft.gameIds} onChange={(gameIds) => set({ gameIds })} />
              <LinkPicker label={t.today.resources} all={resources} ids={draft.resourceIds} onChange={(resourceIds) => set({ resourceIds })} />
            </div>
          </Card>

          {/* Stages */}
          <Card>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <SectionTitle className="!mb-0">{t.lessonView.stages}</SectionTitle>
              <span className={cx('text-sm font-semibold tabular-nums', check.ok ? 'text-pen' : stages.length ? 'text-amber' : 'text-ink-soft')}>{t.planner.total(check.total, length)}</span>
            </div>
            {stages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-ink-soft">{t.planner.noStages}</p>
                <div className="flex flex-wrap gap-2">
                  {framework && (
                    <Button variant="primary" icon={<Wand2 size={18} />} onClick={() => set({ stages: stagesFor(framework, length).map((s) => ({ name: s.name, minutes: s.minutes, notes: '' })) })}>
                      {t.planner.fromFramework(framework.name)}
                    </Button>
                  )}
                  <Button icon={<Plus size={18} />} onClick={() => set({ stages: [{ name: '', minutes: 5, notes: '' }] })}>
                    {t.planner.blank}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {!check.ok && (
                  <div className="mb-3">
                    <Banner
                      tone="warn"
                      action={
                        check.total > 0 && (
                          <Button size="sm" onClick={() => set({ stages: fitStages(stages, length) })}>
                            {t.planner.fit(length)}
                          </Button>
                        )
                      }
                    >
                      {check.diff > 0 ? t.planner.over(check.diff) : t.planner.under(-check.diff)}
                    </Banner>
                  </div>
                )}
                <ol className="flex flex-col gap-3">
                  {stages.map((s, i) => (
                    <li key={i} className={cx('rounded-xl border p-3', check.incomplete.includes(i) ? 'border-amber/60' : 'border-line')}>
                      <div className="flex flex-wrap items-center gap-2">
                        <BareInput aria-label={t.planner.stageName} placeholder={t.planner.stageName} value={s.name} onChange={(e) => setStage(i, { name: e.target.value })} className="min-w-0 flex-1 font-semibold" />
                        <label className="flex items-center gap-1 text-sm text-ink-soft">
                          <BareInput aria-label={t.planner.minutes} type="number" inputMode="numeric" min={0} max={120} value={s.minutes} onChange={(e) => setStage(i, { minutes: Math.max(0, Number(e.target.value) || 0) })} className="w-16 text-right tabular-nums" />
                          {t.common.minutes}
                        </label>
                        <div className="flex">
                          <Button variant="ghost" size="sm" aria-label={t.planner.up} disabled={i === 0} onClick={() => move(i, -1)} className="h-9 w-9 !px-0">
                            <ArrowUp size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label={t.planner.down} disabled={i === stages.length - 1} onClick={() => move(i, 1)} className="h-9 w-9 !px-0">
                            <ArrowDown size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label={t.common.delete} onClick={() => set({ stages: stages.filter((_, j) => j !== i) })} className="h-9 w-9 !px-0">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <textarea aria-label={`${s.name} ${t.common.notes}`} placeholder={t.planner.stageNotes} value={s.notes} onChange={(e) => setStage(i, { notes: e.target.value })} rows={Math.min(6, Math.max(2, s.notes.split('\n').length))} className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" icon={<Plus size={16} />} onClick={() => set({ stages: [...stages, { name: '', minutes: Math.max(0, length - check.total) || 5, notes: '' }] })}>
                    {t.planner.addStage}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm(t.planner.confirmClear) && set({ stages: [] })}>
                    {t.planner.clear}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          {/* Ideas */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <SectionTitle className="!mb-0 flex items-center gap-2">
                <Lightbulb size={20} className="text-pen" aria-hidden /> {t.planner.ideas}
              </SectionTitle>
              <Button size="sm" variant="ghost" icon={<RefreshCw size={16} />} onClick={() => setVariant((v) => v + 1)}>
                {t.planner.moreIdeas}
              </Button>
            </div>
            <p className="mb-3 text-sm text-ink-soft">{t.planner.ideasHint}</p>
            <ul className="flex flex-col gap-3">
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} stages={stages} onAdd={(i) => addIdea(idea, i)} />
              ))}
            </ul>
          </Card>

          {/* Parallel groups */}
          {groups.length > 1 && (
            <Card>
              <SectionTitle>{t.planner.parallel}</SectionTitle>
              <p className="mb-3 text-sm text-ink-soft">{t.planner.parallelHint}</p>
              <ul className="flex flex-col gap-2">
                {groups.map((g, i) => {
                  const p = pointers[i];
                  const here = p?.id === lesson.id;
                  return (
                    <li key={g.id} className="flex flex-wrap items-center gap-2">
                      <GroupChip name={g.name} colour={g.colour} />
                      <span className="min-w-0 flex-1 text-sm text-ink-soft">{here ? t.planner.nextHere : p ? t.planner.nextIs(p.label) : t.groups.noPointer}</span>
                      {!here && (
                        <Button size="sm" onClick={async () => { await patch<Group>('groups', g.id, { currentPlannedLessonId: lesson.id }); toast(t.planner.movedGroup(g.name)); }}>
                          {t.planner.teachNext}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function IdeaCard({ idea, stages, onAdd }: { idea: Idea; stages: Stage[]; onAdd: (stageIndex: number) => void }) {
  const t = useT();
  const [target, setTarget] = useState(() => (stages.length ? stageFor(stages, idea.stage) : 0));
  useEffect(() => {
    if (stages.length) setTarget(stageFor(stages, idea.stage));
  }, [stages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <li className="rounded-xl border border-line bg-paper p-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="font-semibold">{idea.title}</p>
        <span className="text-xs text-ink-soft">
          {t.planner.hints[idea.stage]}
          {idea.source !== 'pattern' && ` · ${idea.source === 'lesson' ? t.planner.fromLesson : t.planner.fromLibrary}`}
        </span>
      </div>
      <p className="mt-1 text-sm">{idea.text}</p>
      {idea.recentlyUsed && <p className="mt-1 text-xs font-medium text-amber">{t.planner.recentlyUsed}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {stages.length > 0 && (
          <BareSelect aria-label={t.planner.addTo} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="max-w-48 text-sm">
            {stages.map((s, i) => (
              <option key={i} value={i}>
                {s.name || `${t.planner.stage} ${i + 1}`}
              </option>
            ))}
          </BareSelect>
        )}
        <Button size="sm" icon={<Plus size={16} />} onClick={() => onAdd(target)}>
          {stages.length ? t.planner.addToStage : t.planner.addToActivities}
        </Button>
      </div>
    </li>
  );
}

/** Chips for linked games/resources, with a picker to add more from the library. */
function LinkPicker({ label, all, ids, onChange }: { label: string; all: { id: string; name: string }[]; ids: string[]; onChange: (ids: string[]) => void }) {
  const t = useT();
  const linked = ids.map((id) => all.find((x) => x.id === id)).filter((x) => !!x);
  const available = all.filter((x) => !ids.includes(x.id)).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {linked.map((x) => (
          <span key={x!.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-sunk py-1 pr-1 pl-3 text-sm">
            {x!.name}
            <button type="button" aria-label={`${t.common.delete} ${x!.name}`} onClick={() => onChange(ids.filter((i) => i !== x!.id))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-line">
              <X size={14} />
            </button>
          </span>
        ))}
        {available.length > 0 && (
          <BareSelect aria-label={`${t.common.add}: ${label}`} value="" onChange={(e) => e.target.value && onChange([...ids, e.target.value])} className="max-w-56 text-sm">
            <option value="">+ {t.common.add}…</option>
            {available.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </BareSelect>
        )}
        {!all.length && <span className="text-sm text-ink-soft">{t.planner.libraryEmpty}</span>}
      </div>
    </div>
  );
}
