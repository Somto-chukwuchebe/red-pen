import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../i18n';
import { Button } from './ui';

/** Reads a value a tool saved on this device (see useStored). */
export function readStored<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(`rp-tool-${key}`);
    return raw ? (JSON.parse(raw) as T) : initial;
  } catch {
    return initial;
  }
}

/** Saves a value for another tool to pick up (e.g. the team maker filling the scoreboard). */
export function writeStored<T>(key: string, value: T) {
  try {
    localStorage.setItem(`rp-tool-${key}`, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

/** Remembers a value on this device (e.g. scores), so a reload or a trip to another screen keeps it. */
export function useStored<T>(key: string, initial: T): [T, (v: T | ((old: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, initial));
  useEffect(() => {
    try {
      localStorage.setItem(`rp-tool-${key}`, JSON.stringify(value));
    } catch {
      /* private mode */
    }
  }, [key, value]);
  return [value, setValue];
}

/**
 * A classroom tool, covering the whole screen with big type for the projector.
 * "Full screen" also hides the browser's own toolbars where the browser allows it.
 */
export function ToolFrame({ title, controls, children }: { title: string; controls?: ReactNode; children: ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const [full, setFull] = useState(!!document.fullscreenElement);
  const canFull = typeof document.documentElement.requestFullscreen === 'function';

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement && !(e.target as HTMLElement).closest('input, textarea, dialog')) navigate('/tools');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [navigate]);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper text-ink safe-top safe-bottom safe-x">
      <header className="no-print flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 sm:px-5">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate('/tools')}>
          {t.tools.all}
        </Button>
        <h1 className="mr-auto font-serif text-xl font-semibold sm:text-2xl">{title}</h1>
        {controls}
        {canFull && (
          <Button variant="ghost" icon={full ? <Minimize size={18} /> : <Maximize size={18} />} onClick={toggleFull} aria-pressed={full}>
            <span className="hidden sm:inline">{full ? t.tools.exitFull : t.tools.full}</span>
          </Button>
        )}
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
