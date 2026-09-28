import { useLiveQuery } from 'dexie-react-hooks';
import { Disc3, ListRestart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ToolFrame, useStored } from '../../components/ToolFrame';
import { Button, TextArea, Toggle } from '../../components/ui';
import { db } from '../../db/db';
import { useT } from '../../i18n';
import { extractContent } from '../../lib/ideas/content';
import { spinTo } from '../../lib/tools';
import { GroupSelect, useToolGroup } from './GroupSelect';

// Segments are not data, so they alternate three calm fills; the text inside is always ink.
const FILLS = ['var(--pen-soft)', 'var(--sunk)', 'var(--card)'];

/** Spinner wheel with your own items, the group's names, or the lesson's key words. */
export function WheelTool() {
  const t = useT();
  const [group, groups, choose] = useToolGroup();
  const [text, setText] = useStored<string>('wheel-items', t.tools.wheelExample);
  const [removePicked, setRemovePicked] = useStored<boolean>('wheel-remove', false);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const target = useRef<number>(0);
  const items = text.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 40);

  const sources = useLiveQuery(async () => {
    if (!group) return null;
    const students = (await db.students.where('groupId').equals(group.id).toArray()).filter((s) => s.active).map((s) => s.name);
    const lesson = group.currentPlannedLessonId ? await db.lessons.get(group.currentPlannedLessonId) : undefined;
    const module = lesson ? await db.modules.get(lesson.moduleId) : undefined;
    const words = module ? extractContent(module.keyLanguage, lesson!.focus).words : [];
    return { students, words };
  }, [group?.id, group?.currentPlannedLessonId]);

  function spin() {
    if (spinning || items.length < 2) return;
    target.current = Math.floor(Math.random() * items.length);
    setResult(null);
    setSpinning(true);
    setAngle((a) => spinTo(a, items.length, target.current));
  }

  function landed() {
    setSpinning(false);
    const picked = items[target.current];
    setResult(picked);
    if (removePicked) setText(items.filter((_, i) => i !== target.current).join('\n'));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        spin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const n = items.length;
  const seg = 360 / Math.max(1, n);
  const r = 48;
  const point = (deg: number, radius = r) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [50 + radius * Math.cos(rad), 50 + radius * Math.sin(rad)];
  };
  const fontSize = Math.max(2.4, Math.min(6, 60 / Math.max(n, 1)));

  return (
    <ToolFrame title={t.tools.wheel.name} controls={<GroupSelect group={group} groups={groups} onChange={choose} />}>
      <div className="flex flex-1 flex-col items-center gap-4 p-4 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
        <div className="relative w-[min(88vw,70vh)] shrink-0">
          {/* Pointer */}
          <svg viewBox="0 0 20 20" className="absolute -top-1 left-1/2 z-10 w-10 -translate-x-1/2" aria-hidden>
            <path d="M10 18 L3 3 L17 3 Z" fill="var(--pen)" stroke="var(--paper)" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={t.tools.wheel.name}
            className="w-full"
            style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none' }}
            onTransitionEnd={landed}
          >
            <circle cx="50" cy="50" r="49.5" fill="var(--card)" stroke="var(--line)" strokeWidth="1" />
            {n >= 2 &&
              items.map((item, i) => {
                const [x1, y1] = point(i * seg);
                const [x2, y2] = point((i + 1) * seg);
                const mid = (i + 0.5) * seg;
                const [tx, ty] = point(mid, r * 0.62);
                const fill = FILLS[n % 3 === 1 && i === n - 1 ? 1 : i % 3];
                return (
                  <g key={i}>
                    <path d={`M50 50 L${x1} ${y1} A${r} ${r} 0 ${seg > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={fill} stroke="var(--paper)" strokeWidth="0.6" />
                    <text x={tx} y={ty} fill="var(--ink)" fontSize={fontSize} fontWeight={600} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid - 90} ${tx} ${ty})`}>
                      {item.length > 16 ? `${item.slice(0, 15)}…` : item}
                    </text>
                  </g>
                );
              })}
            <circle cx="50" cy="50" r="5" fill="var(--pen)" stroke="var(--paper)" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <p aria-live="polite" className="min-h-[1.2em] font-serif leading-tight font-semibold text-pen" style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)' }}>
            {result ?? (n < 2 ? t.tools.wheelNeedsTwo : '')}
          </p>
          <Button variant="primary" size="lg" icon={<Disc3 size={24} />} onClick={spin} disabled={spinning || n < 2} className="min-w-48 text-xl">
            {t.tools.spin}
          </Button>
          <Toggle label={t.tools.removePicked} checked={removePicked} onChange={setRemovePicked} />
          <div className="flex flex-wrap justify-center gap-2">
            {!!sources?.students.length && (
              <Button size="sm" onClick={() => setText(sources.students.join('\n'))}>
                {t.tools.useNames(group?.name ?? '')}
              </Button>
            )}
            {!!sources?.words.length && (
              <Button size="sm" onClick={() => setText(sources.words.join('\n'))}>
                {t.tools.useWords}
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={<ListRestart size={16} />} onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              {t.tools.editItems(n)}
            </Button>
          </div>
          {editing && <TextArea label={t.tools.itemsLabel} hint={t.tools.itemsHint} rows={8} value={text} onChange={(e) => setText(e.target.value)} className="text-left" />}
        </div>
      </div>
    </ToolFrame>
  );
}
