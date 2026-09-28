// The number on the app icon: lessons still to log.
//
// The icon can only change while Red Pen is open (phones don't let web apps wake up
// in the background), so the count includes all of today's lessons, not just the ones
// that have started. That way it stays right until you log them, even with the app closed.

import type { ISODate } from '../domain/types';
import { addDaysISO } from './dates';
import { lessonsForDate, type ScheduleData } from './schedule';

/** How far back an unlogged lesson still counts (a missed Friday still shows on Monday). */
export const BADGE_LOOKBACK_DAYS = 7;

/** Today's lessons not logged yet, plus any from the past week that were never logged. */
export function lessonsToLog(data: ScheduleData, loggedKeys: Set<string>, today: ISODate, lookback = BADGE_LOOKBACK_DAYS): number {
  let n = 0;
  for (let i = lookback - 1; i >= 0; i--) {
    for (const o of lessonsForDate(data, addDaysISO(today, -i))) {
      if (o.status === 'scheduled' && !loggedKeys.has(o.key)) n++;
    }
  }
  return n;
}

// ─── The device side ─────────────────────────────────────────────────────

type BadgeNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

export type BadgeSupport =
  | 'yes' // works now
  | 'needs-permission' // works once notifications are allowed (iPhone, iPad, Safari on Mac)
  | 'blocked' // notifications were refused for this app
  | 'home-screen-only' // iPhone/iPad in the browser: works only from the home-screen icon
  | 'no'; // this browser can't show badges

const isAppleWebKit = () => /iPhone|iPad|Macintosh/.test(navigator.userAgent) && !/Chrome|CriOS|Edg|Firefox|FxiOS/.test(navigator.userAgent);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function badgeSupport(): BadgeSupport {
  const nav = navigator as BadgeNavigator;
  const iOS = /iPhone|iPad/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (typeof nav.setAppBadge !== 'function') return iOS && !isStandalone() ? 'home-screen-only' : 'no';
  // Apple only shows badges for web apps that are allowed to send notifications.
  if (isAppleWebKit() && typeof Notification !== 'undefined') {
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission !== 'granted') return 'needs-permission';
  }
  return 'yes';
}

/** Ask for the permission the badge needs (only where it's needed). Must run from a tap. */
export async function allowBadge(): Promise<BadgeSupport> {
  if (badgeSupport() === 'needs-permission') {
    try {
      await Notification.requestPermission();
    } catch {
      /* older Safari: callback-style only */
    }
  }
  return badgeSupport();
}

export async function showBadge(count: number) {
  const nav = navigator as BadgeNavigator;
  try {
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch {
    /* not allowed here: nothing to do */
  }
}
