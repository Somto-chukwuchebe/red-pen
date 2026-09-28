import { AlertTriangle, Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ToolFrame, useStored } from '../../components/ToolFrame';
import { Banner, Button, Toggle, cx } from '../../components/ui';
import { useT } from '../../i18n';
import { beep, unlockSound } from '../../lib/sound';
import { noiseLevel } from '../../lib/tools';

type State = 'idle' | 'listening' | 'denied' | 'missing';

// How long the class must stay over (or under) the limit before the verdict changes,
// so one dropped book doesn't set it off.
const HOLD_MS = 1000;
const BEEP_EVERY_MS = 5000;

/** A noise meter: listens through the microphone and shows how loud the room is. Nothing is recorded. */
export function NoiseTool() {
  const t = useT();
  const [state, setState] = useState<State>('idle');
  const [level, setLevel] = useState(0);
  const [loud, setLoud] = useState(false);
  const [limit, setLimit] = useStored<number>('noise-limit', 70);
  const [beepOn, setBeepOn] = useStored<boolean>('noise-beep', false);
  const stop = useRef<(() => void) | null>(null);
  // The latest settings, read by the listening loop without restarting it.
  const live = useRef({ limit, beepOn });
  live.current = { limit, beepOn };

  async function start() {
    unlockSound();
    if (!navigator.mediaDevices?.getUserMedia) return setState('missing');
    let stream: MediaStream;
    try {
      // Turn off the phone's "voice call" processing, which would flatten a noisy room.
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      return setState((e as DOMException).name === 'NotFoundError' ? 'missing' : 'denied');
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    let shown = 0;
    let isLoud = false;
    let changeSince = 0;
    let lastBeep = 0;
    const id = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const x of samples) sum += x * x;
      const now = noiseLevel(Math.sqrt(sum / samples.length));
      // Rise quickly, fall slowly, so the bar is calm to watch.
      shown += (now - shown) * (now > shown ? 0.5 : 0.12);
      setLevel(shown);

      const over = shown >= live.current.limit;
      const t0 = Date.now();
      if (over !== isLoud) {
        changeSince ||= t0;
        if (t0 - changeSince >= HOLD_MS) {
          isLoud = over;
          changeSince = 0;
          setLoud(over);
        }
      } else changeSince = 0;
      if (isLoud && live.current.beepOn && t0 - lastBeep >= BEEP_EVERY_MS) {
        lastBeep = t0;
        beep(1, 'end');
      }
    }, 100);

    stop.current = () => {
      window.clearInterval(id);
      stream.getTracks().forEach((track) => track.stop());
      void ctx.close();
      stop.current = null;
    };
    setState('listening');
  }

  function end() {
    stop.current?.();
    setState('idle');
    setLevel(0);
    setLoud(false);
  }

  // Always let go of the microphone when leaving the screen.
  useEffect(() => () => stop.current?.(), []);

  const listening = state === 'listening';
  const verdict = loud ? t.tools.noiseLoud : level >= limit * 0.6 ? t.tools.noiseOk : t.tools.noiseQuiet;

  return (
    <ToolFrame title={t.tools.noise.name}>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
        {listening ? (
          <>
            <p className={cx('flex items-center gap-4 font-serif leading-none font-semibold', loud ? 'text-amber' : 'text-ink')} style={{ fontSize: 'clamp(2.5rem, 9vw, 8rem)' }} aria-live="polite">
              {loud && <AlertTriangle className="h-[0.8em] w-[0.8em] shrink-0" aria-hidden />}
              {verdict}
            </p>

            <div className="w-full max-w-5xl">
              <div className="relative h-16 overflow-hidden rounded-2xl border border-line bg-sunk sm:h-24" role="meter" aria-label={t.tools.noiseLevel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level)}>
                <div className={cx('absolute inset-y-0 left-0 rounded-r-2xl', loud ? 'bg-amber' : 'bg-ink/55')} style={{ width: `${level}%` }} />
                <div className="absolute inset-y-0 w-1 -translate-x-1/2 bg-pen" style={{ left: `${limit}%` }} aria-hidden />
              </div>
              <label className="mt-4 flex flex-wrap items-center justify-center gap-3 text-ink-soft">
                <span>{t.tools.limit}</span>
                <input type="range" min={20} max={95} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-64 accent-[var(--pen)]" />
                <span className="w-10 text-left tabular-nums">{limit}</span>
              </label>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-72">
                <Toggle label={t.tools.beepWhenLoud} checked={beepOn} onChange={setBeepOn} />
              </div>
              <Button size="lg" icon={<MicOff size={22} />} onClick={end}>
                {t.tools.stopListening}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Mic size={96} className="text-pen" aria-hidden />
            {state === 'denied' && <Banner tone="warn">{t.tools.micDenied}</Banner>}
            {state === 'missing' && <Banner tone="warn">{t.tools.micMissing}</Banner>}
            <Button variant="primary" size="lg" icon={<Mic size={22} />} onClick={() => void start()} className="min-w-56 text-xl">
              {t.tools.listen}
            </Button>
          </>
        )}
        <p className="max-w-xl text-sm text-ink-soft">{t.tools.noisePrivacy}</p>
      </div>
    </ToolFrame>
  );
}
