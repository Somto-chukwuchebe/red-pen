// The Red Pen data model. Every stored record has an `id` and an `updatedAt`
// timestamp (ms). `updatedAt` lets "Move my data" merge two devices safely:
// for each record, the newer copy wins.

export type ID = string;
/** A calendar date as "yyyy-MM-dd" (local, no time zone). */
export type ISODate = string;
/** A clock time as "HH:mm". */
export type HHMM = string;

export interface Stamped {
  id: ID;
  updatedAt: number;
}

// ─── Groups and timetable ──────────────────────────────────────────────

export type GroupType = 'kindergarten' | 'primary' | 'secondary';

export interface Group extends Stamped {
  name: string;
  type: GroupType;
  /** School grade (2–8); null for kindergarten. */
  grade: number | null;
  /** Which curriculum this group follows, e.g. "grade-2", "kg-older". Parallel groups share one. */
  curriculumKey: string;
  lessonsPerWeek: number;
  lessonLengthMin: number;
  textbook: string;
  studentCount: number;
  /** The next lesson to teach. The current module is derived from it. */
  currentPlannedLessonId: ID | null;
  colour: string;
  notes: string;
  archived: boolean;
  order: number;
  /** Kindergarten groups may skip individual students. */
  tracksStudents: boolean;
}

export interface TimetableVersion extends Stamped {
  name: string;
  effectiveFrom: ISODate;
  effectiveTo?: ISODate;
}

/** 1 = Monday … 6 = Saturday (ISO weekday). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6;

export interface TimetableSlot extends Stamped {
  timetableVersionId: ID;
  groupId: ID;
  weekday: Weekday;
  startTime: HHMM;
  endTime: HHMM;
  room: string;
}

export type ChangeType = 'cancel' | 'move' | 'swap' | 'extra';

/** A one-off change to a single date. */
export interface TimetableChange extends Stamped {
  /** The date the change applies to (for "move", the original date). */
  date: ISODate;
  type: ChangeType;
  /** cancel / move / swap: the regular slot affected. */
  slotId?: ID;
  /** swap: the other slot on the same date whose group trades places. */
  otherSlotId?: ID;
  /** extra: the group having the extra lesson. For others, copied from the slot for display. */
  groupId: ID;
  /** move: where it goes. */
  newDate?: ISODate;
  /** move / extra: the new start (end is computed from lesson length unless given). */
  newStartTime?: HHMM;
  newEndTime?: HHMM;
  room?: string;
  reason: string;
}

// ─── Curriculum ────────────────────────────────────────────────────────

export interface Module extends Stamped {
  curriculumKey: string;
  order: number;
  title: string;
  /** Human text as in the curriculum, e.g. "Sep–Oct". */
  months: string;
  /** Month numbers 1–12 covered, in school-year order, e.g. [9, 10]. */
  monthNums: number[];
  keyLanguage: string;
  songs: string;
  resources: string;
  notes: string;
}

export interface Stage {
  name: string;
  minutes: number;
  notes: string;
}

export interface PlannedLesson extends Stamped {
  moduleId: ID;
  order: number;
  /** e.g. "Week 2 · Lesson B" or "Lesson 3". */
  label: string;
  focus: string;
  activities: string;
  gameIds: ID[];
  resourceIds: ID[];
  /** Filled in with the lesson planner (Phase 3). Empty = use the framework defaults. */
  stages: Stage[];
}

export interface FrameworkStage {
  name: string;
  /** Minutes keyed by lesson length, e.g. { 15: 3, 20: 3, 30: 3 } or { 40: 5 }. */
  minutesByLength: Record<number, number>;
  description: string;
}

export interface LessonFramework extends Stamped {
  name: string;
  appliesTo: GroupType;
  /** For primary: which lesson labels use it ("A" / "B"); empty = all. */
  variant: string;
  stages: FrameworkStage[];
}

export interface Curriculum extends Stamped {
  /** Same as `id`; e.g. "grade-2". Kept for readability. */
  key: string;
  title: string;
  type: GroupType;
  grade: number | null;
  intro: string;
  order: number;
}

// ─── Lessons taught ─────────────────────────────────────────────────────

export type LogStatus = 'taught' | 'cancelled' | 'swapped' | 'review';

export interface LessonLog extends Stamped {
  groupId: ID;
  date: ISODate;
  /** Links the log to a timetable occurrence (see schedule.ts), if any. */
  occurrenceKey?: string;
  plannedLessonId: ID | null;
  status: LogStatus;
  stagesUsed: string[];
  whatWorked: string[];
  whatToChange: string;
  energy: number | null;
  /** Everyone is present by default, so only absences are stored. */
  absentStudentIds: ID[];
  gameIds: ID[];
  notes: string;
  /** Photos taken in the lesson (the board, students' work…), stored in `files`. */
  photoIds?: ID[];
}

// ─── Students and progress ──────────────────────────────────────────────

export interface Student extends Stamped {
  groupId: ID;
  name: string;
  notes: string;
  active: boolean;
}

export interface Participation extends Stamped {
  studentId: ID;
  lessonLogId: ID;
  /** Overall participation in the lesson's activities: 1 Not engaged … 5 Outstanding. */
  rating: number | null;
  /** Times the student spoke (older logs, before ratings). Kept for history. */
  spoke: number;
  volunteered: boolean;
  helpedOthers: boolean;
  note: string;
}

export interface CanDoStatement extends Stamped {
  moduleId: ID;
  order: number;
  text: string;
}

export type CanDoLevel = 'not-yet' | 'emerging' | 'secure';

export interface CanDoMark extends Stamped {
  statementId: ID;
  groupId: ID;
  /** Empty = a mark for the whole group. */
  studentId: ID | null;
  level: CanDoLevel;
}

// ─── Library ─────────────────────────────────────────────────────────────

export interface Game extends Stamped {
  name: string;
  /** As written, e.g. "KG–4". */
  levels: string;
  /** Expanded, e.g. ["KG", "2", "3", "4"]. */
  levelTags: string[];
  howItWorks: string;
  prep: string;
  skills: string[];
  energy: 'calm' | 'medium' | 'lively' | '';
  prepMinutes: number | null;
  needsProjector: boolean;
  link: string;
  fileId: ID | null;
  custom: boolean;
}

export interface Resource extends Stamped {
  name: string;
  useFor: string;
  levels: string;
  levelTags: string[];
  link: string;
  skills: string[];
  needsProjector: boolean;
  fileId: ID | null;
  custom: boolean;
}

export interface StoredFile extends Stamped {
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

export interface TeacherSync extends Stamped {
  groupId: ID;
  teacherName: string;
  date: ISODate;
  /** The module the class teacher is on (links to our curriculum), if known. */
  moduleId: ID | null;
  position: string;
  note: string;
}

// ─── Settings ──────────────────────────────────────────────────────────

export interface DateRange {
  name: string;
  start: ISODate;
  end: ISODate;
}

export interface Settings extends Stamped {
  /** Monday of week 1. */
  yearStart: ISODate;
  quarters: DateRange[];
  holidays: DateRange[];
  backupReminderDays: number;
  theme: 'system' | 'light' | 'dark';
  language: 'en' | 'ru';
  showSaturday: boolean;
  /** The subject this teacher teaches (e.g. "English"). Missing on devices set up before the wizard = English. */
  subject?: string;
  teacherName?: string;
  /** Participation flag: ratings at or below this are low (default 2). */
  flagLow?: number;
  /** Participation flag: this many low-rated lessons in a row (default 3). */
  flagStreak?: number;
}

/** Removed records are remembered so a merge doesn't bring them back. */
export interface Tombstone {
  id: string; // `${table}:${recordId}`
  table: string;
  recordId: ID;
  deletedAt: number;
}

/** Per-device facts. Never exported or merged. */
export interface LocalMeta {
  key: string;
  value: unknown;
}
