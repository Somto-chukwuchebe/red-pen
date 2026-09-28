import { useLiveQuery } from 'dexie-react-hooks';
import { Shuffle, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ToolFrame, readStored, useStored, writeStored } from '../../components/ToolFrame';
import { Button, EmptyState, LinkButton, Segmented, cx } from '../../components/ui';
import { db } from '../../db/db';
import { useT } from '../../i18n';
import { makeTeams } from '../../lib/tools';
import { GroupSelect, useToolGroup } from './GroupSelect';
import { TEAM_COLOURS, type Team } from './ScoreboardTool';

interface Split {
  groupId: string;
  /** Student ids per team. */
  teams: string[][];
}

/** Splits the group into random teams (leaving out anyone who's away), ready for the scoreboard. */
export function TeamsTool() {
  const t = useT();
  const navigate = useNavigate();
  const [group, groups, choose] = useToolGroup();
  const students = useLiveQuery(async () => (group ? (await db.students.where('groupId').equals(group.id).toArray()).filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name)) : []), [group?.id]);
  const [count, setCount] = useStored<number>('maker-count', 2);
  const [split, setSplit] = useStored<Split | null>('team-split', null);
  const [away, setAway] = useState<string[]>([]);

  useEffect(() => setAway([]), [group?.id]);

  const here = (students ?? []).filter((s) => !away.includes(s.id));
  const nameOf = (id: string) => students?.find((s) => s.id === id)?.name;
  const teams = split && split.groupId === group?.id ? split.teams.map((ids) => ids.map(nameOf).filter((n): n is string => !!n)) : null;
  const canMake = here.length >= 2;

  function make() {
    if (!group || !canMake) return;
    setSplit({ groupId: group.id, teams: makeTeams(here.map((s) => s.id), Math.min(count, here.length)) });
  }

  function toScoreboard() {
    if (!teams) return;
    const current = readStored<Team[]>('teams', []);
    if (current.some((x) => x.score > 0) && !confirm(t.tools.confirmNewTeams)) return;
    const next: Team[] = t.tools.teamNames.map((name, i) => (i < teams.length ? { name, score: 0, members: teams[i] } : { name: current[i]?.name ?? name, score: 0 }));
    writeStored('teams', next);
    writeStored('teams-count', teams.length);
    navigate('/tools/scoreboard');
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, button')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        make();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <ToolFrame
      title={t.tools.teamMaker.name}
      controls={
        <>
          <GroupSelect group={group} groups={groups} onChange={choose} />
          <Segmented<string> label={t.tools.teams} value={String(count)} onChange={(v) => setCount(Number(v))} options={['2', '3', '4'].map((v) => ({ value: v, label: t.tools.teamsN(Number(v)) }))} />
        </>
      }
    >
      {!students ? null : students.length === 0 ? (
        <div className="m-auto max-w-md p-6">
          <EmptyState title={t.tools.noStudents} action={group && <LinkButton to={`/groups/${group.id}`}>{t.log.addStudents}</LinkButton>} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5 p-3 sm:p-5">
          {teams && (
            <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${teams.length > 2 ? 14 : 18}rem), 1fr))` }}>
              {teams.map((members, i) => (
                <section key={i} className="relative overflow-hidden rounded-3xl border-2 bg-card p-4 pt-6" style={{ borderColor: TEAM_COLOURS[i] }} aria-label={t.tools.teamNames[i]}>
                  <span aria-hidden className="absolute inset-x-0 top-0 h-3" style={{ background: TEAM_COLOURS[i] }} />
                  <h2 className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">{t.tools.teamNames[i]}</h2>
                  <ul className="flex flex-col gap-1 font-semibold" style={{ fontSize: 'clamp(1.25rem, 2.6vw, 2.25rem)' }}>
                    {members.map((name, j) => (
                      <li key={j}>{name}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" icon={<Shuffle size={22} />} onClick={make} disabled={!canMake} className="min-w-48 text-xl">
              {teams ? t.tools.mixAgain : t.tools.makeTeams}
            </Button>
            {teams && (
              <Button size="lg" icon={<Trophy size={20} />} onClick={toScoreboard}>
                {t.tools.useOnScoreboard}
              </Button>
            )}
          </div>
          {!canMake && <p className="text-center text-ink-soft">{t.tools.tooFewForTeams}</p>}

          <section className="mx-auto w-full max-w-4xl">
            <p className="mb-2 text-sm text-ink-soft">
              {t.tools.hereOf(here.length, students.length)} · {t.tools.awayHint}
            </p>
            <ul className="flex flex-wrap gap-2">
              {students.map((s) => {
                const isAway = away.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={!isAway}
                      onClick={() => setAway((a) => (isAway ? a.filter((x) => x !== s.id) : [...a, s.id]))}
                      className={cx('min-h-11 rounded-full border px-4 text-sm', isAway ? 'border-line bg-sunk text-ink-soft line-through' : 'border-ink/30 bg-card font-medium')}
                    >
                      {s.name}
                      {isAway && <span className="sr-only"> ({t.tools.away})</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </ToolFrame>
  );
}
