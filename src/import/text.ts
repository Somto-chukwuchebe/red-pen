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

/** "KG–4" → ["KG","2","3","4"]; "5–8" → ["5","6","7","8"]; "KG" → ["KG"]. */
export function parseLevels(s: string): string[] {
  const parts = s.split(DASH).map((p) => p.trim());
  const toNum = (p: string) => (/^KG$/i.test(p) ? 1 : Number(p));
  if (parts.length === 1) return [/^KG$/i.test(parts[0]) ? 'KG' : parts[0]];
  const [a, b] = parts.map(toNum);
  if (Number.isNaN(a) || Number.isNaN(b)) return parts;
  const out: string[] = [];
  for (let n = a; n <= b; n++) {
    if (n === 1) out.push('KG');
    else out.push(String(n));
  }
  return out;
}
