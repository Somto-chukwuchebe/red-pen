import type { ReactNode } from 'react';

// Simple drawings of the browser controls used to install Red Pen.
// The control to tap is circled in red ink.

const ink = 'var(--ink)';
const soft = 'var(--ink-soft)';
const card = 'var(--card)';
const line = 'var(--line)';
const pen = 'var(--pen)';

function Frame({ children, label, w = 260, h = 170 }: { children: ReactNode; label: string; w?: number; h?: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="h-auto w-full max-w-xs rounded-xl border border-line bg-sunk">
      {children}
    </svg>
  );
}

/** A hand-drawn-looking red ink ring around the thing to tap. */
const Circle = ({ cx, cy, r = 17, rx }: { cx: number; cy: number; r?: number; rx?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx ?? r + 2} ry={r} fill="none" stroke={pen} strokeWidth="3" transform={`rotate(${rx ? -3 : -8} ${cx} ${cy})`} />
);

const ShareIcon = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M-7 -2 V9 H7 V-2" />
    <path d="M0 4 V-11 M-5 -6 L0 -11 L5 -6" />
  </g>
);

export function IosShareArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <rect x="70" y="8" width="120" height="175" rx="18" fill={card} stroke={line} strokeWidth="2" />
      <rect x="84" y="28" width="92" height="10" rx="5" fill={line} />
      <rect x="84" y="48" width="70" height="7" rx="3" fill={line} />
      <rect x="84" y="62" width="80" height="7" rx="3" fill={line} />
      <rect x="84" y="76" width="60" height="7" rx="3" fill={line} />
      <line x1="70" y1="128" x2="190" y2="128" stroke={line} strokeWidth="2" />
      <text x="88" y="148" fontSize="14" fill={soft}>‹  ›</text>
      <ShareIcon x={130} y={146} />
      <Circle cx={130} cy={144} />
      <rect x="156" y="138" width="14" height="12" rx="2" fill="none" stroke={soft} strokeWidth="2" />
    </Frame>
  );
}

export function IosAddArt({ label, rows }: { label: string; rows: string[] }) {
  return (
    <Frame label={label}>
      <rect x="30" y="14" width="200" height="142" rx="14" fill={card} stroke={line} strokeWidth="2" />
      {rows.map((r, i) => (
        <g key={r} transform={`translate(30 ${20 + i * 34})`}>
          {i > 0 && <line x1="14" y1="0" x2="186" y2="0" stroke={line} />}
          <text x="16" y="22" fontSize="13" fill={i === 2 ? ink : soft} fontWeight={i === 2 ? 600 : 400}>
            {r}
          </text>
          {i === 2 && (
            <g transform="translate(168 16)" fill="none" stroke={ink} strokeWidth="2">
              <rect x="-8" y="-8" width="16" height="16" rx="4" />
              <path d="M0 -4 V4 M-4 0 H4" strokeLinecap="round" />
            </g>
          )}
        </g>
      ))}
      <Circle cx={118} cy={104} r={16} rx={86} />
    </Frame>
  );
}

export function MacDockArt({ label, items, menu }: { label: string; items: string[]; menu: string[] }) {
  return (
    <Frame label={label}>
      <rect x="0" y="0" width="260" height="22" fill={card} />
      <text x="12" y="15" fontSize="12" fill={ink}>

      </text>
      <text x="32" y="15" fontSize="12" fill={ink} fontWeight={700}>
        Safari
      </text>
      <rect x="76" y="3" width="34" height="17" rx="4" fill={pen} opacity="0.18" />
      <text x="82" y="15" fontSize="12" fill={ink}>
        {menu[0]}
      </text>
      <text x="120" y="15" fontSize="12" fill={soft}>
        {menu[1]}
      </text>
      <rect x="76" y="24" width="150" height="136" rx="8" fill={card} stroke={line} strokeWidth="2" />
      {items.map((it, i) => (
        <text key={it} x="90" y={48 + i * 25} fontSize="12.5" fill={i === 3 ? ink : soft} fontWeight={i === 3 ? 600 : 400}>
          {it}
        </text>
      ))}
      <Circle cx={133} cy={115} r={14} rx={52} />
    </Frame>
  );
}

export function ChromeInstallArt({ label }: { label: string }) {
  return (
    <Frame label={label} h={110}>
      <rect x="12" y="34" width="236" height="36" rx="18" fill={card} stroke={line} strokeWidth="2" />
      <text x="30" y="57" fontSize="12.5" fill={soft}>
        somto-chukwuchebe.github.io/red-pen
      </text>
      <g transform="translate(222 52)" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="-9" y="-8" width="18" height="12" rx="2" />
        <path d="M-4 8 H4 M0 -5 V1 M-3 -2 L0 1 L3 -2" />
      </g>
      <Circle cx={222} cy={52} />
    </Frame>
  );
}

export function AndroidMenuArt({ label, items }: { label: string; items: string[] }) {
  return (
    <Frame label={label}>
      <rect x="10" y="8" width="240" height="30" rx="15" fill={card} stroke={line} strokeWidth="2" />
      <text x="232" y="29" fontSize="18" fill={ink} fontWeight={700}>
        ⋮
      </text>
      <Circle cx={235} cy={23} r={13} />
      <rect x="110" y="44" width="140" height="118" rx="8" fill={card} stroke={line} strokeWidth="2" />
      {items.map((it, i) => (
        <text key={it} x="124" y={66 + i * 22} fontSize="12.5" fill={i === 3 ? ink : soft} fontWeight={i === 3 ? 600 : 400}>
          {it}
        </text>
      ))}
      <Circle cx={160} cy={127} r={13} rx={44} />
    </Frame>
  );
}
