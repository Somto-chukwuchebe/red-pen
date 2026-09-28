// Timetable checks (clashes, lesson counts) and the "paste your timetable" parser.

import type { Group, HHMM, TimetableSlot, Weekday } from '../domain/types';
import { addMinutes, normaliseTime, toMinutes } from './dates';

export interface Clash {
  a: TimetableSlot;
  b: TimetableSlot;
}

export function findClashes(slots: TimetableSlot[]): Clash[] {
  const out: Clash[] = [];
  const sorted = [...slots].sort((x, y) => x.weekday - y.weekday || toMinutes(x.startTime) - toMinutes(y.startTime));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (b.weekday !== a.weekday) break;
      if (toMinutes(b.startTime) < toMinutes(a.endTime)) out.push({ a, b });
    }
  }
  return out;
}

export interface CountMismatch {
  group: Pick<Group, 'id' | 'name' | 'lessonsPerWeek'>;
  actual: number;
}

export function countMismatches(
  slots: TimetableSlot[],
  groups: Pick<Group, 'id' | 'name' | 'lessonsPerWeek' | 'archived'>[],
): CountMismatch[] {
  return groups
    .filter((g) => !g.archived)
    .map((g) => ({ group: g, actual: slots.filter((s) => s.groupId === g.id).length }))
    .filter((m) => m.actual !== m.group.lessonsPerWeek);
}

// ─── Paste parser ─────────────────────────────────────────────────────

const DAY_WORDS: [RegExp, Weekday][] = [
  [/^(mon(day)?|пн|пон(едельник)?)$/i, 1],
  [/^(tue(s(day)?)?|вт|вторник)$/i, 2],
  [/^(wed(nesday)?|ср|среда)$/i, 3],
  [/^(thu(rs(day)?)?|чт|четверг)$/i, 4],
  [/^(fri(day)?|пт|пятница)$/i, 5],
  [/^(sat(urday)?|сб|суббота)$/i, 6],
];

export function parseWeekday(word: string): Weekday | null {
  const w = word.trim().replace(/[.,]$/, '');
  for (const [re, n] of DAY_WORDS) if (re.test(w)) return n;
  return null;
}

export interface PastedRow {
  line: number;
  text: string;
  weekday?: Weekday;
  startTime?: HHMM;
  endTime?: HHMM;
  groupId?: string;
  groupName?: string;
  room: string;
  error?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, '');

/**
 * Reads lines like:
 *   Mon 09:00 2a room 12
 *   Tue 10:00-10:40 KG Little 5
 *   Wed,08:30,3b,14          (CSV)
 *   Пн 9.00 5а каб. 12        (Russian day names)
 * The end time is optional; without it the group's lesson length is used.
 */
export function parseTimetableText(
  input: string,
  groups: Pick<Group, 'id' | 'name' | 'lessonLengthMin'>[],
): PastedRow[] {
  // Longest names first so "KG Older 1" wins over "KG Older".
  const byName = [...groups].sort((a, b) => b.name.length - a.name.length);
  // Cyrillic lookalikes teachers often type (а/б/в for a/b/v).
  const latinise = (s: string) => s.replace(/а/gi, 'a').replace(/б/gi, 'b').replace(/в/gi, 'v');

  return input
    .split(/\r?\n/)
    .map((raw, i) => ({ raw: raw.trim(), line: i + 1 }))
    .filter(({ raw }) => raw && !/^(day|weekday|день)\b/i.test(raw)) // skip blank and header rows
    .map(({ raw, line }) => {
      const row: PastedRow = { line, text: raw, room: '' };
      const parts = raw.includes(',') || raw.includes(';') || raw.includes('\t')
        ? raw.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean)
        : raw.split(/\s+/);
      if (!parts.length) return { ...row, error: 'Empty line' };

      const weekday = parseWeekday(parts[0]);
      if (!weekday) return { ...row, error: `"${parts[0]}" isn't a day of the week` };
      row.weekday = weekday;

      const timeToken = parts[1] ?? '';
      const [startRaw, endRaw] = timeToken.split(/[–—-]/);
      const start = normaliseTime(startRaw ?? '');
      if (!start) return { ...row, error: `"${timeToken}" isn't a time` };
      row.startTime = start;
      if (endRaw) {
        const end = normaliseTime(endRaw);
        if (!end) return { ...row, error: `"${endRaw}" isn't an end time` };
        row.endTime = end;
      }

      const rest = parts.slice(2).join(' ');
      const restNorm = norm(latinise(rest));
      const group = byName.find((g) => restNorm.startsWith(norm(latinise(g.name))));
      if (!group) return { ...row, error: `No group matches "${rest || '(nothing)'}"` };
      row.groupId = group.id;
      row.groupName = group.name;
      row.endTime ??= addMinutes(start, group.lessonLengthMin);

      // Whatever follows the group name is the room.
      const words = rest.split(/\s+/);
      let consumed = '';
      let k = 0;
      while (k < words.length && norm(latinise(consumed)) !== norm(latinise(group.name))) {
        consumed += words[k];
        k++;
      }
      row.room = words
        .slice(k)
        .join(' ')
        .replace(/^(room|rm\.?|каб\.?|кабинет)\s*/i, '')
        .trim();
      return row;
    });
}
