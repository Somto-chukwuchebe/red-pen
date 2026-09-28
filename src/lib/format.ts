// Locale-aware date formatting for the UI.

import type { ISODate } from '../domain/types';
import { fromISODate } from './dates';

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: string, opts: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.DateTimeFormat(locale, opts)));
  return f;
}

export const longDate = (locale: string, d: ISODate) =>
  fmt(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(fromISODate(d));
export const shortDate = (locale: string, d: ISODate) =>
  fmt(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(fromISODate(d));
export const dayMonth = (locale: string, d: ISODate) => fmt(locale, { day: 'numeric', month: 'short' }).format(fromISODate(d));
export const dateTime = (locale: string, ms: number) =>
  fmt(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

export function daysAgo(ms: number, now = Date.now()) {
  return Math.floor((now - ms) / 86_400_000);
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}
