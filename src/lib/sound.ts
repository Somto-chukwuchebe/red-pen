// Beeps for timers, generated in the browser (no sound files, works offline).
// Phones only allow sound after a tap, so call unlockSound() from a button press.

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockSound() {
  const c = context();
  if (c?.state === 'suspended') void c.resume();
}

/** Play `count` short tones. `kind` "end" is lower and longer than "tick". */
export function beep(count = 1, kind: 'end' | 'tick' | 'stage' = 'end') {
  const c = context();
  if (!c) return;
  const freq = kind === 'tick' ? 880 : kind === 'stage' ? 660 : 523;
  const length = kind === 'tick' ? 0.08 : 0.35;
  for (let i = 0; i < count; i++) {
    const start = c.currentTime + i * (length + 0.15);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }
}
