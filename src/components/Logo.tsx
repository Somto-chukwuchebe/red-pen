/** The Red Pen nib mark (same drawing as the app icon). */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="112" fill="#FBF5E9" />
      <path d="M92 404 C118 400 138 390 152 364" fill="none" stroke="#C8332B" strokeWidth="18" strokeLinecap="round" />
      <g transform="rotate(45 256 256) translate(0 -20)">
        <path d="M190 128 Q256 96 322 128 L322 236 C322 292 292 346 256 420 C220 346 190 292 190 236 Z" fill="#C8332B" />
        <rect x="190" y="118" width="132" height="30" rx="10" fill="#1F2A44" />
        <circle cx="256" cy="262" r="17" fill="#FBF5E9" />
        <path d="M256 279 L256 412" stroke="#FBF5E9" strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
