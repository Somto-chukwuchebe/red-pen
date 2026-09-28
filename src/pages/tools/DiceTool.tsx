import { Dices } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ToolFrame, useStored } from '../../components/ToolFrame';
import { Button, Segmented } from '../../components/ui';
import { useT } from '../../i18n';
import { rollDice } from '../../lib/tools';

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={`h-auto w-[min(30vw,15rem)] drop-shadow-md transition-transform ${rolling ? 'rotate-12' : ''}`} role="img" aria-label={String(value)}>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="var(--card)" stroke="var(--line)" strokeWidth="3" />
      {PIPS[value].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill={value === 1 ? 'var(--pen)' : 'var(--ink)'} />
      ))}
    </svg>
  );
}

/** 1–3 dice. Space to roll. */
export function DiceTool() {
  const t = useT();
  const [count, setCount] = useStored<number>('dice-count', 1);
  const [values, setValues] = useState<number[]>(() => rollDice(3));
  const [rolling, setRolling] = useState(false);
  const timer = useRef<number | null>(null);

  function roll() {
    // The ref (not state) guards against a quick double-tap starting two rolls.
    if (timer.current) return;
    setRolling(true);
    const until = Date.now() + 600;
    const id = window.setInterval(() => {
      setValues(rollDice(3));
      if (Date.now() >= until) {
        window.clearInterval(id);
        timer.current = null;
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
        roll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  // Stop the animation only when leaving the screen (not on every redraw).
  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const shown = values.slice(0, count);
  return (
    <ToolFrame title={t.tools.dice.name} controls={<Segmented<string> label={t.tools.dice.name} value={String(count)} onChange={(v) => setCount(Number(v))} options={['1', '2', '3'].map((v) => ({ value: v, label: t.tools.diceN(Number(v)) }))} />}>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {shown.map((v, i) => (
            <Die key={i} value={v} rolling={rolling} />
          ))}
        </div>
        <p className="text-3xl font-semibold tabular-nums" aria-live="polite">
          {!rolling && count > 1 ? t.tools.total(shown.reduce((s, v) => s + v, 0)) : ' '}
        </p>
        <Button variant="primary" size="lg" icon={<Dices size={24} />} onClick={roll} className="min-w-48 text-xl">
          {t.tools.roll}
        </Button>
      </div>
    </ToolFrame>
  );
}
