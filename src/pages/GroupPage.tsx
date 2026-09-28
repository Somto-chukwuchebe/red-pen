import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Check, Download, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { LogSheet, type LogTarget } from '../components/LogSheet';
import { ClassTrend, ParticipationGrid } from '../components/ParticipationViews';
import { LowFlag } from '../components/Rating';
import { TermSummaryDialog } from '../components/TermSummary';
import { useToast } from '../components/Toast';
import { BareInput, Button, Card, Dialog, EmptyState, LinkButton, SectionTitle, Segmented, Select, TextArea, TextInput, Toggle, cx } from '../components/ui';
import { shareOrDownload } from '../db/backup';
import { db } from '../db/db';
import { useFlagRule, useSettings } from '../db/hooks';
import { curriculumOrder } from '../db/logs';
import { newId, patch, remove, save } from '../db/repo';
import type { CanDoLevel, CanDoMark, CanDoStatement, Group, ID, Student } from '../domain/types';
import { useT } from '../i18n';
import { attendanceRows, toCsv } from '../lib/csv';
import { todayISO } from '../lib/dates';
import { shortDate } from '../lib/format';
import { isTouchPhone } from '../lib/platform';
import { isFlagged, studentHistory } from '../lib/participation';
import { progressFraction } from '../lib/pointer';
import { GroupEditor } from './GroupsPage';

export function GroupPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const settings = useSettings();
  const rule = useFlagRule();
  const [editing, setEditing] = useState(false);
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const group = await db.groups.get(id);
    if (!group) return null;
    const modules = group.curriculumKey ? await db.modules.where('curriculumKey').equals(group.curriculumKey).sortBy('order') : [];
    const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
    const students = (await db.students.where('groupId').equals(id).toArray()).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    const logs = (await db.logs.where('groupId').equals(id).toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
    const ordered = await curriculumOrder(group.curriculumKey);
    const participation = await db.participation.where('lessonLogId').anyOf(logs.map((l) => l.id)).toArray();
    return { group, modules, lessons, students, logs, ordered, participation };
  }, [id]);

  if (data === undefined || !settings) return null;
  if (data === null) return <EmptyState title={t.groupPage.notFound} />;
  const { group, modules, lessons, students, logs, ordered, participation } = data;
  const flaggedCount = students.filter((s) => s.active && isFlagged(studentHistory(s.id, logs, participation), rule)).length;
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const pointer = group.currentPlannedLessonId ? lessonById.get(group.currentPlannedLessonId) : undefined;
  const pointerModule = pointer ? moduleById.get(pointer.moduleId) : undefined;
  const pct = Math.round(progressFraction(ordered, group.currentPlannedLessonId) * 100);
  const label = (lessonId: ID | null) => {
    const l = lessonId ? lessonById.get(lessonId) : undefined;
    return l ? `${moduleById.get(l.moduleId)?.title ?? ''} · ${l.label}` : '—';
  };

  async function exportCsv() {
    const parts = await db.participation.where('lessonLogId').anyOf(logs.map((l) => l.id)).toArray();
    const rows = attendanceRows(group, logs, students, parts, lessonById, moduleById, t.groupPage.csvHeaders);
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    await shareOrDownload(blob, `${group.name.replace(/[^\p{L}\p{N}]+/gu, '-')}-attendance-${todayISO()}.csv`, isTouchPhone());
  }

  return (
    <>
      <div className="mb-3">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate('/groups')}>
          {t.nav.groups}
        </Button>
      </div>
      <header className="relative mb-5 overflow-hidden rounded-2xl border border-line bg-card p-5 pl-7">
        <span aria-hidden className="absolute inset-y-0 left-0 w-2" style={{ background: group.colour }} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-4xl font-semibold">{group.name}</h1>
            <p className="mt-1 text-ink-soft">
              {t.groupTypes[group.type]} · {t.groups.perWeek(group.lessonsPerWeek)} · {group.lessonLengthMin} {t.common.minutes}
              {group.textbook && ` · ${group.textbook}`}
            </p>
            {group.notes && <p className="mt-1 text-ink-soft">{group.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<Check size={18} />} onClick={() => setLogTarget({ groupId: group.id, date: todayISO() })}>
              {t.groupPage.logLesson}
            </Button>
            <Button icon={<FileText size={16} />} onClick={() => setSummaryOpen(true)}>
              {t.summary.button}
            </Button>
            <Button icon={<Pencil size={16} />} onClick={() => setEditing(true)}>
              {t.common.edit}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Progress */}
        <Card className="lg:col-span-2">
          <SectionTitle>{t.groupPage.progress}</SectionTitle>
          {ordered.length === 0 ? (
            <p className="text-ink-soft">{t.groupPage.noCurriculum}</p>
          ) : (
            <>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <p>
                  <span className="text-ink-soft">{t.groups.nextUp}: </span>
                  <span className="font-semibold">{label(group.currentPlannedLessonId)}</span>
                </p>
                <span className="text-sm text-ink-soft">{t.groupPage.covered(pct)}</span>
              </div>
              {pointer && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-ink-soft">{pointer.focus}</p>
                  <LinkButton to={`/plan/${pointer.id}?group=${group.id}`} size="sm">
                    <Pencil size={14} aria-hidden /> {t.planner.planNext}
                  </LinkButton>
                </div>
              )}
              <div className="h-3 overflow-hidden rounded-full bg-sunk" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t.groupPage.progress}>
                <div className="h-full rounded-full bg-pen" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-4 max-w-xl">
                <Select label={t.groupPage.setNext} value={group.currentPlannedLessonId ?? ''} onChange={(e) => patch<Group>('groups', group.id, { currentPlannedLessonId: e.target.value || null })}>
                  {modules.map((m) => (
                    <optgroup key={m.id} label={`${m.title} (${m.months})`}>
                      {lessons
                        .filter((l) => l.moduleId === m.id)
                        .sort((a, b) => a.order - b.order)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label} — {l.focus.slice(0, 50)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
            </>
          )}
        </Card>

        {/* Roster */}
        {group.tracksStudents && <Roster group={group} students={students} />}

        {/* Can-do */}
        {pointerModule && <CanDo group={group} moduleId={pointerModule.id} moduleTitle={pointerModule.title} students={students.filter((s) => s.active)} />}

        {/* Participation */}
        {group.tracksStudents && students.some((s) => s.active) && (
          <Card className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle className="!mb-0">{t.log.participation}</SectionTitle>
              {flaggedCount > 0 && <LowFlag streak={rule.streak} />}
            </div>
            <div className="flex flex-col gap-5">
              <ClassTrend logs={logs} participation={participation} />
              <ParticipationGrid students={students.filter((s) => s.active)} logs={logs} participation={participation} />
            </div>
          </Card>
        )}

        {/* History */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle className="!mb-0">
              {t.groupPage.history} <span className="font-sans text-base font-normal text-ink-soft">· {t.common.lessons(logs.length)}</span>
            </SectionTitle>
            {logs.length > 0 && (
              <Button size="sm" icon={<Download size={16} />} onClick={exportCsv}>
                {t.groupPage.exportCsv}
              </Button>
            )}
          </div>
          {logs.length === 0 ? (
            <p className="text-ink-soft">{t.groupPage.noHistory}</p>
          ) : (
            <ol className="flex flex-col divide-y divide-line">
              {logs.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => setLogTarget({ groupId: group.id, date: l.date, logId: l.id, occurrenceKey: l.occurrenceKey })} className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-left hover:bg-sunk">
                    <span className="w-28 shrink-0 font-medium first-letter:uppercase">{shortDate(t.locale, l.date)}</span>
                    <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', l.status === 'taught' ? 'bg-pen-soft text-pen' : 'bg-sunk text-ink-soft')}>{t.log.statuses[l.status]}</span>
                    <span className="min-w-0 flex-1">{label(l.plannedLessonId)}</span>
                    {students.length > 0 && l.status !== 'cancelled' && (
                      <span className="text-sm text-ink-soft">{t.log.present(students.filter((s) => s.active).length - l.absentStudentIds.length, students.filter((s) => s.active).length)}</span>
                    )}
                    {l.whatWorked.length > 0 && <span className="w-full pl-0 text-sm text-ink-soft sm:pl-31">✓ {l.whatWorked.join(' · ')}</span>}
                    {l.notes && <span className="w-full text-sm text-ink-soft sm:pl-31">{l.notes}</span>}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {summaryOpen && <TermSummaryDialog group={group} onClose={() => setSummaryOpen(false)} />}
      {editing && <GroupEditor group={group} onClose={() => setEditing(false)} onDeleted={() => navigate('/groups')} />}
      <LogSheet target={logTarget} onClose={() => setLogTarget(null)} />
    </>
  );
}

// ─── Roster ────────────────────────────────────────────────────────────

function Roster({ group, students }: { group: Group; students: Student[] }) {
  const t = useT();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [names, setNames] = useState('');
  const [editing, setEditing] = useState<Student | null>(null);
  const active = students.filter((s) => s.active);

  async function addAll() {
    const list = names
      .split(/\r?\n|,/)
      .map((n) => n.trim())
      .filter(Boolean);
    const now = Date.now();
    await db.students.bulkPut(list.map((name) => ({ id: newId('st'), groupId: group.id, name, notes: '', active: true, updatedAt: now })));
    await patch<Group>('groups', group.id, { studentCount: active.length + list.length });
    toast(t.groupPage.added(list.length));
    setNames('');
    setAdding(false);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionTitle className="!mb-0">
          {t.groupPage.students} <span className="font-sans text-base font-normal text-ink-soft">· {active.length}</span>
        </SectionTitle>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
          {t.common.add}
        </Button>
      </div>
      {students.length === 0 ? (
        <p className="text-ink-soft">{t.groupPage.noStudents}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {students.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setEditing(s)} className={cx('min-h-11 w-full truncate rounded-xl border border-line bg-paper px-3 text-left hover:bg-sunk', !s.active && 'text-ink-soft line-through')} title={s.notes}>
                {s.name}
                {s.notes && ' •'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-soft">{t.groupPage.privacy}</p>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title={t.groupPage.addStudents}
        footer={
          <>
            <Button onClick={() => setAdding(false)}>{t.common.cancel}</Button>
            <Button variant="primary" onClick={addAll} disabled={!names.trim()}>
              {t.common.add}
            </Button>
          </>
        }
      >
        <TextArea label={t.groupPage.namesLabel} hint={t.groupPage.namesHint} rows={8} value={names} onChange={(e) => setNames(e.target.value)} autoFocus />
      </Dialog>

      {editing && <StudentEditor student={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function StudentEditor({ student, onClose }: { student: Student; onClose: () => void }) {
  const t = useT();
  const [s, setS] = useState(student);
  return (
    <Dialog
      open
      onClose={onClose}
      title={student.name}
      footer={
        <>
          <Button variant="quiet-danger" className="mr-auto" icon={<Trash2 size={16} />} onClick={async () => { if (confirm(t.groupPage.confirmDeleteStudent)) { await remove('students', s.id); onClose(); } }}>
            {t.common.delete}
          </Button>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={async () => { await save<Student>('students', { ...s, name: s.name.trim() || student.name }); onClose(); }}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextInput label={t.common.name} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        <TextArea label={t.common.notes} rows={3} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} />
        <Toggle label={t.groupPage.activeStudent} hint={t.groupPage.activeHint} checked={s.active} onChange={(active) => setS({ ...s, active })} />
      </div>
    </Dialog>
  );
}

// ─── Can-do checklist (group level; per-student comes with progress tracking) ──

const LEVELS: CanDoLevel[] = ['not-yet', 'emerging', 'secure'];

function CanDo({ group, moduleId, moduleTitle, students }: { group: Group; moduleId: ID; moduleTitle: string; students: Student[] }) {
  const t = useT();
  const [text, setText] = useState('');
  const [view, setView] = useState<'group' | 'students'>('group');
  const statements = useLiveQuery(() => db.canDoStatements.where('moduleId').equals(moduleId).sortBy('order'), [moduleId]);
  const marks = useLiveQuery(() => db.canDoMarks.where('groupId').equals(group.id).toArray(), [group.id]);
  const groupMark = useMemo(() => new Map((marks ?? []).filter((m) => !m.studentId).map((m) => [m.statementId, m])), [marks]);
  if (!statements || !marks) return null;

  async function add() {
    const v = text.trim();
    if (!v) return;
    await save<CanDoStatement>('canDoStatements', { id: newId('cando'), moduleId, order: statements!.length + 1, text: v.replace(/^I can\s*/i, '') });
    setText('');
  }

  async function mark(statementId: ID, level: CanDoLevel) {
    const existing = groupMark.get(statementId);
    await save<CanDoMark>('canDoMarks', { id: existing?.id ?? newId('mark'), statementId, groupId: group.id, studentId: null, level });
  }

  // Each student: tap a cell to go not yet → emerging → secure → (blank).
  async function cycle(statementId: ID, studentId: ID) {
    const existing = marks!.find((m) => m.statementId === statementId && m.studentId === studentId);
    const next = !existing ? 'not-yet' : existing.level === 'not-yet' ? 'emerging' : existing.level === 'emerging' ? 'secure' : null;
    if (!next) await remove('canDoMarks', existing!.id);
    else await save<CanDoMark>('canDoMarks', { id: existing?.id ?? newId('mark'), statementId, groupId: group.id, studentId, level: next });
  }

  return (
    <Card className={view === 'students' ? 'lg:col-span-2' : ''}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle className="!mb-0">{t.groupPage.canDo}</SectionTitle>
        {students.length > 0 && statements.length > 0 && (
          <Segmented label={t.groupPage.canDo} value={view} onChange={setView} options={[{ value: 'group', label: t.groupPage.canDoGroup }, { value: 'students', label: t.groupPage.canDoStudents }]} />
        )}
      </div>
      <p className="mb-3 text-sm text-ink-soft">{moduleTitle}</p>
      {statements.length === 0 && <p className="mb-3 text-ink-soft">{t.groupPage.canDoHint}</p>}
      {view === 'students' && statements.length > 0 ? (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm text-ink-soft">{t.groupPage.canDoCycleHint}</p>
          <table className="w-full border-separate border-spacing-0.5 text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-card px-2 py-1 text-left font-medium text-ink-soft">{t.common.name}</th>
                {statements.map((s) => (
                  <th key={s.id} scope="col" className="min-w-28 px-1 py-1 text-left align-bottom text-xs font-medium text-ink-soft">
                    {t.groupPage.iCan} {s.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id}>
                  <th scope="row" className="sticky left-0 bg-card px-2 py-1 text-left font-medium whitespace-nowrap">{st.name}</th>
                  {statements.map((s) => {
                    const lv = marks.find((m) => m.statementId === s.id && m.studentId === st.id)?.level;
                    return (
                      <td key={s.id} className="p-0">
                        <button
                          type="button"
                          onClick={() => cycle(s.id, st.id)}
                          aria-label={`${st.name}, ${s.text}: ${lv ? t.groupPage.levels[lv] : t.groupPage.notMarked}`}
                          className={cx('h-9 w-full rounded-md border px-2 text-xs font-medium', lv === 'secure' ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : lv === 'emerging' ? 'border-pen/50 bg-pen-soft' : lv === 'not-yet' ? 'border-ink/30 bg-sunk' : 'border-dashed border-line text-ink-soft')}
                        >
                          {lv ? t.groupPage.levels[lv] : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <ul className="flex flex-col gap-3">
        {statements.map((s) => {
          const level = groupMark.get(s.id)?.level;
          return (
            <li key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {t.groupPage.iCan} {s.text}
                </p>
                <Button variant="ghost" size="sm" aria-label={t.common.delete} onClick={() => remove('canDoStatements', s.id)} className="h-9 w-9 shrink-0 !px-0 text-ink-soft">
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="mt-1 flex gap-1" role="radiogroup" aria-label={s.text}>
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    role="radio"
                    aria-checked={level === lv}
                    onClick={() => mark(s.id, lv)}
                    className={cx('min-h-9 flex-1 rounded-lg border px-2 text-sm font-medium', level === lv ? (lv === 'secure' ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : lv === 'emerging' ? 'border-pen/50 bg-pen-soft' : 'border-ink/30 bg-sunk') : 'border-line bg-paper text-ink-soft')}
                  >
                    {t.groupPage.levels[lv]}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      )}
      {statements.length < 6 && view === 'group' && (
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <span className="self-center text-ink-soft">{t.groupPage.iCan}</span>
          <BareInput value={text} onChange={(e) => setText(e.target.value)} placeholder={t.groupPage.canDoPlaceholder} aria-label={t.groupPage.canDoAdd} />
          <Button type="submit" size="sm" disabled={!text.trim()}>
            {t.common.add}
          </Button>
        </form>
      )}
    </Card>
  );
}
