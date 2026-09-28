import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ToolFrame, useStored } from '../../components/ToolFrame';
import { BareInput, Button, cx } from '../../components/ui';
import { useT } from '../../i18n';
import { beep, unlockSound } from '../../lib/sound';
import { formatClock } from '../../lib/tools';

const PRESETS = [1, 2, 3, 5, 10];

/** Countdown timer with a sound at the end. Space = start/pause, R = reset. */
export function TimerTool() {
  const t = useT();
  const [total, setTotal] = useStored<number>('timer-total', 180);
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [custom, setCustom] = useState('');
  const endAt = useRef<number | null>(null);
  const done = left <= 0;

  // Count against the real clock, so it stays right even if the screen is busy.
  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current! - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        setRunning(false);
        beep(3, 'end');
      } else if (remaining <= 3) beep(1, 'tick');
    }, 250);
    return () => window.clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (seconds: number) => {
    setRunning(false);
    setTotal(seconds);
    setLeft(seconds);
  };
  const toggle = () => {
    unlockSound();
    if (done) setLeft(total);
    setRunning((r) => !r);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') set(total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fraction = total ? left / total : 0;
  return (
    <ToolFrame title={t.tools.timer.name}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map((m) => (
            <Button key={m} size="lg" variant={total === m * 60 ? 'primary' : 'secondary'} onClick={() => set(m * 60)}>
              {t.tools.minutes(m)}
            </Button>
          ))}
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const [m, s] = custom.split(/[:.]/).map(Number);
              const secs = (m || 0) * 60 + (s || 0);
              if (secs > 0) set(Math.min(secs, 99 * 60));
            }}
          >
            <BareInput value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="m:ss" aria-label={t.tools.customTime} inputMode="numeric" className="h-14 w-24 text-center text-lg" />
            <Button type="submit" size="lg">
              {t.tools.set}
            </Button>
          </form>
        </div>
        <p
          aria-live="off"
          className={cx('leading-none font-semibold tabular-nums', done ? 'animate-pulse text-pen' : left <= 10 && running ? 'text-amber' : 'text-ink')}
          style={{ fontSize: 'clamp(5rem, 24vw, 22rem)' }}
        >
          {done ? t.tools.timeUp : formatClock(left)}
        </p>
        <div className="h-3 w-full max-w-4xl overflow-hidden rounded-full bg-pen-soft" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={left} aria-label={t.tools.timer.name}>
          <div className="h-full rounded-full bg-pen transition-[width] duration-300" style={{ width: `${fraction * 100}%` }} />
        </div>
        <div className="flex gap-3">
          <Button variant="primary" size="lg" icon={running ? <Pause size={24} /> : <Play size={24} />} onClick={toggle} className="min-w-44 text-xl">
            {running ? t.tools.pause : done ? t.tools.again : t.tools.start}
          </Button>
          <Button size="lg" icon={<RotateCcw size={20} />} onClick={() => set(total)}>
            {t.tools.reset}
          </Button>
        </div>
      </div>
    </ToolFrame>
  );
}
