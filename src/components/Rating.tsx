import { AlertTriangle } from 'lucide-react';
import { useT } from '../i18n';
import { RATINGS } from '../lib/participation';
import { cx } from './ui';

/** Background + text colour for a 1–5 rating (one red ramp, contrast-checked). */
export const ratingStyle = (r: number) => ({ background: `var(--rate-${r})`, color: `var(--rate-ink-${r})` });

/** Five buttons: tap to rate, tap the same number again to clear. */
export function RatingPicker({ value, onChange, label, disabled }: { value: number | null; onChange: (v: number | null) => void; label: string; disabled?: boolean }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex gap-1', disabled && 'pointer-events-none opacity-40')}>
      {RATINGS.map((r) => {
        const on = value === r;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${r} · ${t.rating.levels[r - 1]}`}
            title={t.rating.levels[r - 1]}
            onClick={() => onChange(on ? null : r)}
            className={cx('h-10 w-10 shrink-0 rounded-lg border text-sm font-bold tabular-nums transition-transform', on ? 'scale-105 border-transparent shadow-sm' : 'border-line bg-paper text-ink-soft hover:bg-sunk')}
            style={on ? ratingStyle(r) : undefined}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}

/** The reserved warning mark for "low participation in the last N lessons" — icon + words, never colour alone. */
export function LowFlag({ streak, compact }: { streak: number; compact?: boolean }) {
  const t = useT();
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-semibold text-ink" title={t.rating.flagLong(streak)}>
      <AlertTriangle size={13} className="text-amber" aria-hidden />
      {compact ? t.rating.flagShort : t.rating.flagLong(streak)}
    </span>
  );
}
