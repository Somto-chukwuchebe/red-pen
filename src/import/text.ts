// Small text helpers shared by the importer and the editors (no heavy dependencies).

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const monthNumber = (p: string) => {
  const k = p.trim().toLowerCase().slice(0, 3);
  const en = MONTHS.indexOf(k);
  if (en >= 0) return en + 1;
  const ru = MONTHS_RU.indexOf(k === 'мая' ? 'май' : k);
  return ru + 1;
};

export const DASH = /\s*[–—-]\s*/;

/** "Sep–Oct" → [9, 10]; "Nov–Dec" → [11, 12]; "Сен–Окт" → [9, 10]. School-year order. */
export function parseMonths(s: string): number[] {
  const parts = s.split(DASH).map(monthNumber);
  if (parts.some((n) => n === 0)) return [];
  if (parts.length === 1) return parts;
  const [a, b] = parts;
  const out: number[] = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b || out.length > 12) break;
  }
  return out;
}

/** Every level Red Pen knows, youngest first: kindergarten, then grades 1–11. */
export const ALL_LEVELS = ['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

const levelIndex = (p: string) => (/^(KG|ДС|д\/с)$/i.test(p.trim()) ? 0 : Number(p.trim()));

/** "KG–4" → ["KG","1","2","3","4"]; "5–8" → ["5","6","7","8"]; "KG" → ["KG"]. */
export function parseLevels(s: string): string[] {
  const parts = s.split(DASH).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return [];
  if (parts.length === 1) return [levelIndex(parts[0]) === 0 ? 'KG' : parts[0]];
  const [a, b] = parts.map(levelIndex);
  if (Number.isNaN(a) || Number.isNaN(b)) return parts;
  return ALL_LEVELS.slice(Math.max(0, a), Math.min(ALL_LEVELS.length - 1, b) + 1);
}

/**
 * Widen a level range written for grades 2–8 to the full KG–11 school range:
 * a range ending at grade 8 now runs to 11, and one starting at grade 2 now starts at 1.
 * "5–8" → "5–11", "2–4" → "1–4", "2–8" → "1–11"; "KG–2", "KG" and "4–6" stay as they are.
 */
export function widenLevels(levels: string): string {
  const parts = levels.split(DASH).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return levels;
  let [a, b] = parts;
  if (levelIndex(a) === 2) a = '1';
  if (levelIndex(b) === 8) b = '11';
  return `${a}–${b}`;
}

/**
 * The one-time "KG–11" upgrade of a library item (database v2): imported items are
 * widened with widenLevels; every item's tags are recomputed so ranges include grade 1.
 * Returns the changes to apply, or null if nothing changes.
 */
export function upgradeLibraryLevels(item: { levels?: string; levelTags?: string[]; custom?: boolean }): { levels: string; levelTags: string[] } | null {
  const before = item.levels ?? '';
  const levels = item.custom ? before : widenLevels(before);
  const levelTags = levels.trim() ? parseLevels(levels) : [];
  if (levels === before && levelTags.join() === (item.levelTags ?? []).join()) return null;
  return { levels, levelTags };
}
