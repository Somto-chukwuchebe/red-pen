import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ToolFrame } from '../../components/ToolFrame';
import { Button, EmptyState, LinkButton, cx } from '../../components/ui';
import { db } from '../../db/db';
import { useT } from '../../i18n';
import { frameworkFor, stagesFor } from '../../lib/framework';
import { beep, unlockSound } from '../../lib/sound';
import { formatClock, stageClock } from '../../lib/tools';
import { GroupSelect, useToolGroup } from './GroupSelect';

/** Walks through the lesson's planned stages with a countdown for each. */
export function StagesTool() {
  const t = useT();
  const [group, groups, choose] = useToolGroup();
  const plan = useLiveQuery(async () => {
    if (!group?.currentPlannedLessonId) return null;
    const lesson = await db.lessons.get(group.currentPlannedLessonId);
    if (!lesson) return null;
    const module = await db.modules.get(lesson.moduleId);
    const stages = lesson.stages.length
      ? lesson.stages
      : stagesFor(frameworkFor(await db.frameworks.toArray(), group.type, lesson.label), group.lessonLengthMin).map((s) => ({ name: s.name, minutes: s.minutes, notes: s.description }));
    return { lesson, module, stages };
  }, [group?.id, group?.currentPlannedLessonId]);

  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds in the current stage
  const [running, setRunning] = useState(false);
  const started = useRef<number>(0);
  const beeped = useRef(false);

  useEffect(() => {
    setIndex(0);
    setElapsed(0);
    setRunning(false);
  }, [plan?.lesson.id]);

  // Tick against the real clock.
  useEffect(() => {
    if (!running) return;
    started.current = Date.now() - elapsed * 1000;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const minutes = plan?.stages.map((s) => s.minutes) ?? [];
  const clock = stageClock(minutes, index, elapsed);

  // One double beep when a stage's time is up; it then shows overtime until you move on.
  useEffect(() => {
    if (running && clock.remaining <= 0 && !beeped.current) {
      beeped.current = true;
      beep(2, 'stage');
    }
  }, [running, clock.remaining]);

  const go = (d: -1 | 1) => {
    if (!plan) return;
    const next = Math.min(Math.max(0, index + d), plan.stages.length - 1);
    if (next === index) return;
    setIndex(next);
    setElapsed(0);
    beeped.current = false;
    started.current = Date.now();
  };
  const toggle = () => {
    unlockSound();
    setRunning((r) => !r);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stage = plan?.stages[clock.index];
  const over = clock.remaining < 0;
  return (
    <ToolFrame title={t.tools.stages.name} controls={<GroupSelect group={group} groups={groups} onChange={choose} />}>
      {plan === undefined ? null : !plan || !plan.stages.length ? (
        <div className="m-auto max-w-md p-6">
          <EmptyState title={t.tools.noStages} action={plan?.lesson && group && <LinkButton to={`/plan/${plan.lesson.id}?group=${group.id}`}>{t.planner.planIt}</LinkButton>}>
            {t.tools.noStagesHint}
          </EmptyState>
        </div>
      ) : (
        <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_22rem] lg:gap-6 lg:p-6">
          <section className="flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg text-ink-soft">
              {plan.module?.title} · {plan.lesson.label} · {t.tools.stageOf(clock.index + 1, plan.stages.length)}
            </p>
            <h2 className="font-serif leading-tight font-semibold" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
              {stage?.name}
            </h2>
            <p className={cx('leading-none font-semibold tabular-nums', over ? 'text-amber' : 'text-pen')} style={{ fontSize: 'clamp(5rem, 18vw, 16rem)' }} aria-live="off">
              {formatClock(clock.remaining)}
            </p>
            {over && <p className="text-lg font-semibold text-amber">{t.tools.overTime}</p>}
            {stage?.notes && <p className="max-w-3xl text-xl whitespace-pre-line text-ink-soft">{stage.notes}</p>}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button size="lg" icon={<ChevronLeft size={24} />} onClick={() => go(-1)} disabled={clock.index === 0} aria-label={t.tools.prevStage} />
              <Button variant="primary" size="lg" icon={running ? <Pause size={24} /> : <Play size={24} />} onClick={toggle} className="min-w-44 text-xl">
                {running ? t.tools.pause : t.tools.start}
              </Button>
              <Button size="lg" icon={<ChevronRight size={24} />} onClick={() => go(1)} disabled={clock.index === plan.stages.length - 1}>
                {t.tools.nextStage}
              </Button>
            </div>
          </section>
          <aside className="rounded-2xl border border-line bg-card p-4">
            <p className="mb-3 text-sm text-ink-soft">
              {t.tools.lessonLeft} <span className="font-semibold text-ink tabular-nums">{formatClock(clock.lessonRemaining)}</span>
            </p>
            <ol className="flex flex-col gap-1">
              {plan.stages.map((s, i) => (
                <li key={i}>
                  <button type="button" onClick={() => { setIndex(i); setElapsed(0); beeped.current = false; started.current = Date.now(); }} className={cx('flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left', i === clock.index ? 'bg-pen-soft font-semibold' : 'hover:bg-sunk', i < clock.index && 'text-ink-soft')}>
                    <span className="w-6 shrink-0">{i < clock.index ? <Check size={16} className="text-pen" aria-hidden /> : i + 1}</span>
                    <span className="flex-1">{s.name}</span>
                    <span className="tabular-nums">{s.minutes}′</span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </ToolFrame>
  );
}
