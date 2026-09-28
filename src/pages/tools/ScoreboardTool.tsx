import { Minus, Plus, RotateCcw, UserX } from 'lucide-react';
import { useEffect } from 'react';
import { ToolFrame, useStored } from '../../components/ToolFrame';
import { Button, Segmented } from '../../components/ui';
import { useT } from '../../i18n';

// Team colours: blue, orange, aqua, violet — checked for colour-blind separation on
// both backgrounds. Red (progress) and yellow/amber (warnings) are left out on purpose.
// The team name is always shown too, so colour is never the only way to tell teams apart.
export const TEAM_COLOURS = ['var(--team-1)', 'var(--team-2)', 'var(--team-3)', 'var(--team-4)'];

export interface Team {
  name: string;
  score: number;
  /** Names of the children in the team, when it came from the team maker. */
  members?: string[];
}

export function ScoreboardTool() {
  const t = useT();
  const [count, setCount] = useStored<number>('teams-count', 2);
  const [teams, setTeams] = useStored<Team[]>('teams', t.tools.teamNames.map((name) => ({ name, score: 0 })));
  const shown = teams.slice(0, count);
  const top = Math.max(...shown.map((x) => x.score));
  const hasMembers = shown.some((x) => x.members?.length);
  const change = (i: number, d: number) => setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, score: Math.max(0, x.score + d) } : x)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      // Keys 1–4 add a point to that team; with Shift they take one away.
      // (Physical key position, so it works on English and Russian keyboards alike.)
      const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      const i = m ? Number(m[1]) - 1 : -1;
      if (i >= 0 && i < count) change(i, e.shiftKey ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <ToolFrame
      title={t.tools.scoreboard.name}
      controls={
        <>
          <Segmented<string> label={t.tools.teams} value={String(count)} onChange={(v) => setCount(Number(v))} options={['2', '3', '4'].map((v) => ({ value: v, label: t.tools.teamsN(Number(v)) }))} />
          {hasMembers && (
            <Button variant="ghost" icon={<UserX size={18} />} onClick={() => setTeams((ts) => ts.map((x) => ({ ...x, members: undefined })))}>
              <span className="hidden sm:inline">{t.tools.clearMembers}</span>
            </Button>
          )}
          <Button variant="ghost" icon={<RotateCcw size={18} />} onClick={() => confirm(t.tools.confirmReset) && setTeams((ts) => ts.map((x) => ({ ...x, score: 0 })))}>
            <span className="hidden sm:inline">{t.tools.reset}</span>
          </Button>
        </>
      }
    >
      <div className="grid flex-1 gap-3 p-3 sm:gap-4 sm:p-5" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${count > 2 ? 14 : 18}rem), 1fr))` }}>
        {shown.map((team, i) => {
          const leading = team.score === top && top > 0;
          return (
            <section key={i} className="relative flex flex-col items-center justify-between gap-3 overflow-hidden rounded-3xl border-2 bg-card p-4" style={{ borderColor: TEAM_COLOURS[i] }} aria-label={team.name}>
              <span aria-hidden className="absolute inset-x-0 top-0 h-3" style={{ background: TEAM_COLOURS[i] }} />
              <input
                value={team.name}
                onChange={(e) => setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                aria-label={t.tools.teamName(i + 1)}
                className="mt-2 w-full bg-transparent text-center font-serif text-2xl font-semibold sm:text-3xl"
              />
              {!!team.members?.length && <p className="-mt-1 text-center text-ink-soft sm:text-lg">{team.members.join(', ')}</p>}
              <p className="leading-none font-semibold tabular-nums" style={{ fontSize: 'clamp(4rem, 12vw, 11rem)' }} aria-live="polite">
                {team.score}
              </p>
              <p className="h-6 text-sm font-semibold text-ink-soft">{leading ? `★ ${t.tools.leading}` : ''}</p>
              <div className="flex w-full gap-2">
                <Button size="lg" aria-label={`${t.tools.minus} ${team.name}`} onClick={() => change(i, -1)} className="w-20">
                  <Minus size={24} />
                </Button>
                <Button size="lg" variant="primary" aria-label={`${t.tools.plus} ${team.name}`} onClick={() => change(i, 1)} className="flex-1 text-2xl">
                  <Plus size={28} /> 1
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </ToolFrame>
  );
}
