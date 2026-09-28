import { AudioLines, Dices, Disc3, ListOrdered, Timer, Trophy, UserRound, UsersRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { PageHeader } from '../../components/ui';
import { useT } from '../../i18n';

/** The classroom tools, for the projector. */
export function ToolsHome() {
  const t = useT();
  const [params] = useSearchParams();
  const group = params.get('group');
  const q = group ? `?group=${group}` : '';
  const tools = [
    { to: `/tools/picker${q}`, icon: <UserRound size={36} />, ...t.tools.picker },
    { to: `/tools/teams${q}`, icon: <UsersRound size={36} />, ...t.tools.teamMaker },
    { to: '/tools/scoreboard', icon: <Trophy size={36} />, ...t.tools.scoreboard },
    { to: '/tools/timer', icon: <Timer size={36} />, ...t.tools.timer },
    { to: '/tools/dice', icon: <Dices size={36} />, ...t.tools.dice },
    { to: `/tools/wheel${q}`, icon: <Disc3 size={36} />, ...t.tools.wheel },
    { to: `/tools/stages${q}`, icon: <ListOrdered size={36} />, ...t.tools.stages },
    { to: '/tools/noise', icon: <AudioLines size={36} />, ...t.tools.noise },
  ];
  return (
    <>
      <PageHeader title={t.tools.title} subtitle={t.tools.subtitle} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.to}>
            <Link to={tool.to} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-card p-5 transition-shadow hover:shadow-md">
              <span className="text-pen">{tool.icon}</span>
              <span className="font-serif text-2xl font-semibold">{tool.name}</span>
              <span className="text-ink-soft">{tool.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-soft">{t.tools.keys}</p>
    </>
  );
}
