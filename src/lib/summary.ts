// Term summary for a group: a short message to copy (English or Russian)
// and a per-student spreadsheet.

import type { CanDoLevel, CanDoMark, CanDoStatement, DateRange, Group, LessonLog, Module, Participation, PlannedLesson, Student } from '../domain/types';
import { classAverages, studentHistory, studentStats } from './participation';

export interface SummaryInput {
  group: Pick<Group, 'name'>;
  term: DateRange;
  logs: LessonLog[];
  students: Student[];
  participation: Participation[];
  lessons: Map<string, Pick<PlannedLesson, 'label' | 'moduleId'>>;
  modules: Map<string, Pick<Module, 'title'>>;
  canDo: { statement: Pick<CanDoStatement, 'id' | 'text'>; level: CanDoLevel | null }[];
  next: string | null;
  teacherName?: string;
  includeNames: boolean;
  locale: string;
}

const fmt = (locale: string, d: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(`${d}T12:00:00`));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const one = (x: number, lang: 'en' | 'ru' = 'en') => {
  const s = x.toFixed(1).replace(/\.0$/, '');
  return lang === 'ru' ? s.replace('.', ',') : s;
};

export function termSummary(input: SummaryInput, lang: 'en' | 'ru'): string {
  const { group, term, students, participation, includeNames, locale } = input;
  const logs = input.logs.filter((l) => l.date >= term.start && l.date <= term.end);
  const taught = logs.filter((l) => l.status !== 'cancelled');
  const cancelled = logs.length - taught.length;
  const active = students.filter((s) => s.active);
  const stats = active.map((s) => ({ s, st: studentStats(studentHistory(s.id, taught, participation)) }));
  const attendance = stats.filter((x) => x.st.lessons).map((x) => x.st.attendance!);
  const avgAttendance = attendance.length ? attendance.reduce((a, b) => a + b, 0) / attendance.length : null;
  const classAvg = classAverages(taught, participation);
  const avgRating = classAvg.length ? classAvg.reduce((s, x) => s + x.average, 0) / classAvg.length : null;
  const modulesCovered = [...new Set(taught.map((l) => (l.plannedLessonId ? input.lessons.get(l.plannedLessonId)?.moduleId : undefined)).filter(Boolean))].map((id) => input.modules.get(id!)?.title).filter(Boolean) as string[];
  const strong = stats.filter((x) => x.st.average !== null && x.st.average >= 4 && x.st.rated >= 2).sort((a, b) => b.st.average! - a.st.average!);
  const needs = stats.filter((x) => x.st.flagged || (x.st.average !== null && x.st.average < 2.5 && x.st.rated >= 2));
  const secure = input.canDo.filter((c) => c.level === 'secure');
  const building = input.canDo.filter((c) => c.level && c.level !== 'secure');

  const L = lang === 'ru'
    ? {
        title: `${group.name}: итоги — ${term.name} (${fmt(locale, term.start)} – ${fmt(locale, term.end)})`,
        lessons: `Проведено уроков: ${taught.length}${cancelled ? `, отменено: ${cancelled}` : ''}.`,
        attendance: (p: string) => `Средняя посещаемость: ${p}.`,
        covered: (m: string) => `Пройдено: ${m}.`,
        participation: (a: string) => `Участие класса в заданиях: в среднем ${a} из 5.`,
        cando: (s: string) => `Умеют уверенно: ${s}.`,
        building: (s: string) => `Ещё отрабатываем: ${s}.`,
        strong: (s: string) => `Особенно активны: ${s}.`,
        strongCount: (n: number) => `Особенно активны ${n} учеников.`,
        needs: (s: string) => `Нужна поддержка: ${s}.`,
        needsCount: (n: number) => `Поддержка нужна ${n} ученикам (низкое участие на последних уроках).`,
        next: (n: string) => `Дальше: ${n}.`,
        sign: (t: string) => `— ${t}`,
      }
    : {
        title: `${group.name}: ${term.name} summary (${fmt(locale, term.start)} – ${fmt(locale, term.end)})`,
        lessons: `Lessons taught: ${taught.length}${cancelled ? ` (${cancelled} cancelled)` : ''}.`,
        attendance: (p: string) => `Average attendance: ${p}.`,
        covered: (m: string) => `Covered: ${m}.`,
        participation: (a: string) => `Class participation in activities: ${a} out of 5 on average.`,
        cando: (s: string) => `The class can confidently: ${s}.`,
        building: (s: string) => `Still building: ${s}.`,
        strong: (s: string) => `Especially active: ${s}.`,
        strongCount: (n: number) => `${n} students were especially active.`,
        needs: (s: string) => `Needs encouragement: ${s}.`,
        needsCount: (n: number) => `${n} student${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} encouragement (low participation in recent lessons).`,
        next: (n: string) => `Next: ${n}.`,
        sign: (t: string) => `— ${t}`,
      };

  const lines = [L.title, '', L.lessons];
  if (avgAttendance !== null) lines.push(L.attendance(pct(avgAttendance)));
  if (modulesCovered.length) lines.push(L.covered(modulesCovered.join('; ')));
  if (avgRating !== null) lines.push(L.participation(one(avgRating, lang)));
  if (secure.length) lines.push(L.cando(secure.map((c) => c.statement.text).join('; ')));
  if (building.length) lines.push(L.building(building.map((c) => c.statement.text).join('; ')));
  if (strong.length) lines.push(includeNames ? L.strong(strong.slice(0, 5).map((x) => x.s.name).join(', ')) : L.strongCount(strong.length));
  if (needs.length) lines.push(includeNames ? L.needs(needs.map((x) => x.s.name).join(', ')) : L.needsCount(needs.length));
  if (input.next) lines.push(L.next(input.next));
  if (input.teacherName) lines.push('', L.sign(input.teacherName));
  return lines.join('\n');
}

/** One row per student for the term: attendance, average participation, recent ratings, flag, can-do marks. */
export function progressRows(
  term: DateRange,
  logs: LessonLog[],
  students: Student[],
  participation: Participation[],
  statements: Pick<CanDoStatement, 'id' | 'text'>[],
  marks: Pick<CanDoMark, 'statementId' | 'studentId' | 'level'>[],
  headers: { student: string; lessons: string; attended: string; attendance: string; average: string; recent: string; flag: string },
  levelNames: Record<string, string>,
): unknown[][] {
  const inTerm = logs.filter((l) => l.date >= term.start && l.date <= term.end && l.status !== 'cancelled');
  const rows: unknown[][] = [[headers.student, headers.lessons, headers.attended, headers.attendance, headers.average, headers.recent, headers.flag, ...statements.map((s) => s.text)]];
  for (const s of students.filter((x) => x.active)) {
    const h = studentHistory(s.id, inTerm, participation);
    const st = studentStats(h);
    const recent = h.filter((x) => !x.absent && x.rating !== null).slice(-3).map((x) => x.rating);
    rows.push([
      s.name,
      st.lessons,
      st.attended,
      st.attendance === null ? '' : pct(st.attendance),
      st.average === null ? '' : one(st.average),
      recent.join(' '),
      st.flagged ? '!' : '',
      ...statements.map((c) => {
        const m = marks.find((x) => x.statementId === c.id && x.studentId === s.id);
        return m ? levelNames[m.level] : '';
      }),
    ]);
  }
  return rows;
}
