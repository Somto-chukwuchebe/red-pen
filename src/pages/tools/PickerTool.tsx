import { useLiveQuery } from 'dexie-react-hooks';
import { RotateCcw, Shuffle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ToolFrame, useStored } from '../../components/ToolFrame';
import { Button, EmptyState, LinkButton } from '../../components/ui';
import { db } from '../../db/db';
import { useT } from '../../i18n';
import { draw, newBag, type Bag } from '../../lib/tools';
import { GroupSelect, useToolGroup } from './GroupSelect';

/** Random student picker: nobody is picked twice until everyone has had a turn. */
export function PickerTool() {
  const t = useT();
  const [group, groups, choose] = useToolGroup();
  const students = useLiveQuery(async () => (group ? (await db.students.where('groupId').equals(group.id).toArray()).filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name)) : []), [group?.id]);
  const [bags, setBags] = useStored<Record<string, Bag>>('picker-bags', {});
  const [shown, setShown] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<number | null>(null);

  const names = students?.map((s) => s.name) ?? [];
  const bag = (group && bags[group.id]) || newBag([]);

  function pick() {
    // The ref (not state) guards against a quick double-tap starting two shuffles.
    if (!group || !names.length || timer.current) return;
    const result = draw(bag, names);
    setBags((b) => ({ ...b, [group.id]: result.bag }));
    // A short shuffle so the class can watch the names flicker.
    setRolling(true);
    const until = Date.now() + 900; // by the clock, so a slow device never drags it out
    const id = window.setInterval(() => {
      setShown(names[Math.floor(Math.random() * names.length)]);
      if (Date.now() >= until) {
        window.clearInterval(id);
        timer.current = null;
        setShown(result.item);
        setRolling(false);
      }
    }, 70);
    timer.current = id;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        pick();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  // Stop the animation only when leaving the screen (not on every redraw).
  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const pickedCount = bag.picked.length;
  return (
    <ToolFrame title={t.tools.picker.name} controls={<GroupSelect group={group} groups={groups} onChange={(id) => { choose(id); setShown(null); }} />}>
      {!students ? null : names.length === 0 ? (
        <div className="m-auto max-w-md p-6">
          <EmptyState title={t.tools.noStudents} action={group && <LinkButton to={`/groups/${group.id}`}>{t.log.addStudents}</LinkButton>} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
          <p className="text-lg text-ink-soft">{t.tools.pickedOf(pickedCount, names.length)}</p>
          <p aria-live="polite" className={`font-serif leading-none font-semibold break-words ${rolling ? 'text-ink-soft' : 'text-pen'}`} style={{ fontSize: 'clamp(3rem, 14vw, 12rem)' }}>
            {shown ?? '?'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" icon={<Shuffle size={22} />} onClick={pick} disabled={rolling} className="min-w-48 text-xl">
              {t.tools.pick}
            </Button>
            <Button size="lg" icon={<RotateCcw size={20} />} onClick={() => { if (group) setBags((b) => ({ ...b, [group.id]: newBag(names) })); setShown(null); }}>
              {t.tools.newRound}
            </Button>
          </div>
          {pickedCount > 0 && (
            <p className="max-w-3xl text-ink-soft">
              {t.tools.already}: {bag.picked.join(', ')}
            </p>
          )}
        </div>
      )}
    </ToolFrame>
  );
}
