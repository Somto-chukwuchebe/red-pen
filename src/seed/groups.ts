// Starting data for a fresh install. Everything here is editable in the app.

import type { DateRange, Group } from '../domain/types';

type SeedGroup = Omit<Group, 'updatedAt' | 'currentPlannedLessonId'> & {
  /** Where the lesson pointer starts on a fresh install. */
  startAt: { module: 'first' | 'module-1'; label?: string };
};

const primary = (grade: number, letter: string, colour: string, order: number): SeedGroup => ({
  id: `g-${grade}${letter}`,
  name: `${grade}${letter}`,
  type: 'primary',
  grade,
  curriculumKey: `grade-${grade}`,
  lessonsPerWeek: 2,
  lessonLengthMin: 40,
  textbook: `Spotlight ${grade}`,
  studentCount: 18,
  colour,
  notes: grade === 2 ? 'Starts from the Starter (no alphabet block).' : '',
  archived: false,
  order,
  tracksStudents: true,
  startAt: { module: 'first', label: 'Week 2 · Lesson A' },
});

const secondary = (grade: number, letter: string, colour: string, order: number): SeedGroup => ({
  id: `g-${grade}${letter}`,
  name: `${grade}${letter}`,
  type: 'secondary',
  grade,
  curriculumKey: `grade-${grade}`,
  lessonsPerWeek: 1,
  lessonLengthMin: 40,
  textbook: `Spotlight ${grade}`,
  studentCount: 18,
  colour,
  notes: grade <= 7 ? "Follows the class teacher's plan." : '',
  archived: false,
  order,
  tracksStudents: true,
  startAt: { module: 'module-1' },
});

const kg = (id: string, name: string, key: string, length: number, colour: string, order: number): SeedGroup => ({
  id,
  name,
  type: 'kindergarten',
  grade: null,
  curriculumKey: key,
  lessonsPerWeek: 2,
  lessonLengthMin: length,
  textbook: 'Own themes',
  studentCount: 9,
  colour,
  notes: '',
  archived: false,
  order,
  tracksStudents: key !== 'kg-little',
  startAt: { module: 'first', label: 'Week 2 · Lesson A' },
});

// Parallel groups share a hue; the "b" group is a lighter shade.
// Red is left out on purpose: it's the app's own accent colour.
export const SEED_GROUPS: SeedGroup[] = [
  primary(2, 'a', '#0E7C86', 1),
  primary(2, 'b', '#35A3AC', 2),
  primary(3, 'a', '#2F6FB5', 3),
  primary(3, 'b', '#6495D6', 4),
  primary(4, 'a', '#6B4FB3', 5),
  primary(4, 'b', '#9780D4', 6),
  secondary(5, 'a', '#A8458A', 7),
  secondary(5, 'b', '#C979B2', 8),
  secondary(6, 'a', '#9A5B24', 9),
  secondary(6, 'b', '#C38B55', 10),
  secondary(7, 'a', '#3D7A38', 11),
  secondary(8, 'a', '#4F5D6E', 12),
  kg('g-kg-little', 'KG Little', 'kg-little', 15, '#D19A00', 13),
  kg('g-kg-middle', 'KG Middle', 'kg-middle', 20, '#6E9B2F', 14),
  kg('g-kg-older-1', 'KG Older 1', 'kg-older', 30, '#D2742A', 15),
  kg('g-kg-older-2', 'KG Older 2', 'kg-older', 30, '#B08A2E', 16),
];

// ─── School calendar 2026–27 ──────────────────────────────────────────
// Week 1 starts Monday 31 Aug 2026. Week numbers run through holidays.

export const SEED_YEAR_START = '2026-08-31';

export const SEED_QUARTERS: DateRange[] = [
  { name: 'Q1', start: '2026-08-31', end: '2026-10-23' },
  { name: 'Q2', start: '2026-11-02', end: '2026-12-25' },
  { name: 'Q3', start: '2027-01-11', end: '2027-03-19' },
  { name: 'Q4', start: '2027-03-29', end: '2027-05-21' },
];

export const SEED_HOLIDAYS: DateRange[] = [
  { name: 'Autumn break', start: '2026-10-26', end: '2026-11-01' },
  { name: 'National Unity Day', start: '2026-11-04', end: '2026-11-04' },
  { name: 'Winter break', start: '2026-12-28', end: '2027-01-10' },
  { name: 'Defender of the Fatherland Day', start: '2027-02-23', end: '2027-02-23' },
  { name: "International Women's Day", start: '2027-03-08', end: '2027-03-08' },
  { name: 'Spring break', start: '2027-03-22', end: '2027-03-28' },
  { name: 'Spring and Labour Day (observed)', start: '2027-05-03', end: '2027-05-03' },
  { name: 'Victory Day (observed)', start: '2027-05-10', end: '2027-05-10' },
];
