// Works out which device and browser Red Pen is running in, so the
// install page can show the right steps.

export type InstallPlatform =
  | 'ios-safari'
  | 'ios-other' // Chrome/Firefox on iPhone: can also Add to Home Screen via Share on iOS 16.4+
  | 'mac-safari'
  | 'mac-safari-old' // before Safari 17 / macOS Sonoma: no Add to Dock
  | 'android-chrome'
  | 'android-other'
  | 'desktop-chromium' // Chrome or Edge on Mac / Windows / Linux
  | 'desktop-firefox'
  | 'unknown';

export interface Env {
  userAgent: string;
  maxTouchPoints: number;
  standalone: boolean;
}

export function currentEnv(): Env {
  if (typeof navigator === 'undefined') return { userAgent: '', maxTouchPoints: 0, standalone: false };
  const standalone =
    (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0, standalone };
}

export function detectPlatform(env: Env = currentEnv()): InstallPlatform {
  const ua = env.userAgent;
  const isIPhone = /iPhone|iPod/.test(ua);
  // iPadOS reports itself as a Mac but has a touch screen.
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && env.maxTouchPoints > 1);
  if (isIPhone || isIPad) return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  if (/Android/.test(ua)) return /Chrome\//.test(ua) && !/SamsungBrowser|Firefox/.test(ua) ? 'android-chrome' : 'android-other';
  if (/Firefox\//.test(ua)) return 'desktop-firefox';
  if (/Chrome\/|Edg\//.test(ua)) return 'desktop-chromium';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) {
    const v = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
    return v >= 17 ? 'mac-safari' : 'mac-safari-old';
  }
  return 'unknown';
}

export function isTouchPhone(env: Env = currentEnv()): boolean {
  const p = detectPlatform(env);
  return p === 'ios-safari' || p === 'ios-other' || p === 'android-chrome' || p === 'android-other';
}

export function guessDeviceName(env: Env = currentEnv()): string {
  const ua = env.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && env.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Macintosh/.test(ua)) return 'MacBook';
  if (/Windows/.test(ua)) return 'Windows laptop';
  return 'This device';
}
