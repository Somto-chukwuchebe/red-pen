import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useToast } from '../components/Toast';
import { Button, Dialog, EmptyState, GroupChip, LinkButton, PageHeader, Select, TextArea, TextInput, cx } from '../components/ui';
import { createCurriculum, deleteCurriculum, deleteLesson, deleteModule, moveItem, saveLesson, saveModule } from '../db/curriculumEdit';
import { db } from '../db/db';
import { useGroups, useSettings } from '../db/hooks';
import { save } from '../db/repo';
import { isEnglish } from '../db/seed';
import type { Curriculum, Group, GroupType, Module, PlannedLesson } from '../domain/types';
import { useT } from '../i18n';

export function CurriculumPage() {
  const t = useT();
  const navigate = useNavigate();
  const { key } = useParams();
  const settings = useSettings();
  const curricula = useLiveQuery(() => db.curricula.orderBy('order').toArray(), []);
  const groups = useGroups();
  const active = curricula?.find((c) => c.key === key) ?? curricula?.[0];
  const [editing, setEditing] = useState(false);
  const [curriculumDialog, setCurriculumDialog] = useState<Curriculum | 'new' | null>(null);
  const [moduleDialog, setModuleDialog] = useState<Partial<Module> | null>(null);
  const [lessonDialog, setLessonDialog] = useState<Partial<PlannedLesson> | null>(null);
  const [openLesson, setOpenLesson] = useState<PlannedLesson | null>(null);

  const content = useLiveQuery(async () => {
    if (!active) return null;
    const modules = await db.modules.where('curriculumKey').equals(active.key).sortBy('order');
    const lessons = await db.lessons.where('moduleId').anyOf(modules.map((m) => m.id)).toArray();
    return { modules, lessons };
  }, [active?.key]);

  if (!curricula || !groups || !settings) return null;
  const dialogs = (
    <>
      {curriculumDialog && (
        <CurriculumDialog
          curriculum={curriculumDialog === 'new' ? null : curriculumDialog}
          onClose={() => setCurriculumDialog(null)}
          onCreated={(c) => {
            navigate(`/curriculum/${c.key}`);
            setEditing(true);
          }}
        />
      )}
      {moduleDialog && <ModuleDialog module={moduleDialog} onClose={() => setModuleDialog(null)} english={isEnglish(settings.subject)} />}
      {lessonDialog && <LessonDialog lesson={lessonDialog} onClose={() => setLessonDialog(null)} />}
    </>
  );

  if (!curricula.length)
    return (
      <>
        <PageHeader title={t.curriculum.title} />
        <EmptyState
          title={t.curriculum.empty}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton to="/settings" variant="primary">
                {t.curriculum.importCta}
              </LinkButton>
              <Button onClick={() => setCurriculumDialog('new')}>{t.curriculumEdit.buildByHand}</Button>
            </div>
          }
        >
          {t.curriculum.emptyHint}
        </EmptyState>
        {dialogs}
      </>
    );
  if (!active) return null;

  const followers = groups.filter((g) => g.curriculumKey === active.key);
  const here = (lessonId: string) => followers.filter((g) => g.currentPlannedLessonId === lessonId);
  const moduleHas = (moduleId: string) => followers.filter((g) => content?.lessons.some((l) => l.moduleId === moduleId && l.id === g.currentPlannedLessonId));
  const english = isEnglish(settings.subject);

  return (
    <>
      <PageHeader
        title={t.curriculum.title}
        subtitle={active.title}
        actions={
          <>
            <Button icon={<Plus size={18} />} onClick={() => setCurriculumDialog('new')}>
              {t.curriculumEdit.newCurriculum}
            </Button>
            <Button variant={editing ? 'primary' : 'secondary'} icon={<Pencil size={16} />} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
              {editing ? t.common.done : t.common.edit}
            </Button>
          </>
        }
      />
      <nav aria-label={t.curriculum.choose} className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {curricula.map((c) => (
          <NavLink
            key={c.key}
            to={`/curriculum/${c.key}`}
            className={cx(
              'flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap',
              c.key === active.key ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : 'border-line bg-card hover:bg-sunk',
            )}
          >
            {c.title.replace(/ · Spotlight \d/, '').replace('Kindergarten · ', 'KG ')}
          </NavLink>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink-soft">{t.curriculum.followedBy}:</span>
        {followers.length ? followers.map((g) => <GroupChip key={g.id} name={g.name} colour={g.colour} />) : <span className="text-sm text-ink-soft">{t.curriculumEdit.noGroups}</span>}
        <span className="text-sm text-ink-soft">· {t.curriculum.modules(content?.modules.length ?? 0)}</span>
        {editing && (
          <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => setCurriculumDialog(active)} className="ml-auto">
            {t.curriculumEdit.renameOrDelete}
          </Button>
        )}
      </div>
      {editing && <p className="mb-4 rounded-xl bg-sunk px-4 py-2 text-sm text-ink-soft">{t.curriculumEdit.editHint}</p>}
      {active.intro && <p className="mb-5 max-w-3xl whitespace-pre-line text-ink-soft">{active.intro}</p>}

      {content && content.modules.length === 0 && (
        <EmptyState title={t.curriculumEdit.noModules} action={<Button variant="primary" icon={<Plus size={18} />} onClick={() => setModuleDialog({ curriculumKey: active.key })}>{t.curriculumEdit.addModule}</Button>} />
      )}

      <ol className="flex flex-col gap-3">
        {content?.modules.map((m, mi) => {
          const lessons = content.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order);
          const inHere = moduleHas(m.id);
          return (
            <li key={m.id}>
              <details className="group rounded-2xl border border-line bg-card" open={editing || inHere.length > 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold">{m.title}</h2>
                    <p className="text-sm text-ink-soft">
                      {m.months && `${m.months} · `}
                      {t.common.lessons(lessons.length)}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {inHere.map((g) => (
                      <GroupChip key={g.id} name={g.name} colour={g.colour} />
                    ))}
                  </div>
                  {editing && (
                    <span className="flex" onClick={(e) => e.preventDefault()}>
                      <IconBtn label={t.planner.up} disabled={mi === 0} onClick={() => moveItem('modules', m.id, -1)} icon={<ArrowUp size={16} />} />
                      <IconBtn label={t.planner.down} disabled={mi === content.modules.length - 1} onClick={() => moveItem('modules', m.id, 1)} icon={<ArrowDown size={16} />} />
                      <IconBtn label={t.common.edit} onClick={() => setModuleDialog(m)} icon={<Pencil size={16} />} />
                    </span>
                  )}
                  <ChevronDown aria-hidden className="shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  {m.keyLanguage && (
                    <p className="mb-2">
                      <span className="font-medium">{english ? t.curriculum.keyLanguage : t.lessonView.keyContent}:</span> {m.keyLanguage}
                    </p>
                  )}
                  {m.songs && (
                    <p className="mb-2 text-ink-soft">
                      <span className="font-medium text-ink">{t.curriculum.songs}:</span> {m.songs}
                    </p>
                  )}
                  {m.notes && <p className="mb-2 whitespace-pre-line text-ink-soft">{m.notes}</p>}
                  {lessons.length === 0 && <p className="text-ink-soft">{t.curriculum.noLessons}</p>}
                  <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                    {lessons.map((l, li) => (
                      <li key={l.id} className="flex items-stretch gap-1">
                        <button type="button" onClick={() => (editing ? setLessonDialog(l) : setOpenLesson(l))} className="flex min-h-14 min-w-0 flex-1 flex-col rounded-xl border border-line bg-paper px-3 py-2 text-left hover:border-ink/30">
                          <span className="flex w-full items-center gap-2">
                            <span className="text-sm font-semibold text-pen">{l.label}</span>
                            {l.stages.length > 0 && <span className="rounded-full bg-pen-soft px-2 text-xs font-medium">{t.curriculumEdit.planned}</span>}
                            <span className="ml-auto flex gap-1">
                              {here(l.id).map((g) => (
                                <GroupChip key={g.id} name={g.name} colour={g.colour} />
                              ))}
                            </span>
                          </span>
                          <span>{l.focus}</span>
                        </button>
                        {editing && (
                          <span className="flex flex-col">
                            <IconBtn label={t.planner.up} disabled={li === 0} onClick={() => moveItem('lessons', l.id, -1)} icon={<ArrowUp size={14} />} />
                            <IconBtn label={t.planner.down} disabled={li === lessons.length - 1} onClick={() => moveItem('lessons', l.id, 1)} icon={<ArrowDown size={14} />} />
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                  {editing && (
                    <Button size="sm" className="mt-3" icon={<Plus size={16} />} onClick={() => setLessonDialog({ moduleId: m.id, label: t.curriculumEdit.defaultLessonLabel(lessons.length + 1) })}>
                      {t.curriculumEdit.addLesson}
                    </Button>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      {editing && content && content.modules.length > 0 && (
        <Button className="mt-4" icon={<Plus size={18} />} onClick={() => setModuleDialog({ curriculumKey: active.key })}>
          {t.curriculumEdit.addModule}
        </Button>
      )}

      {openLesson && <LessonDetail lesson={openLesson} groups={here(openLesson.id)} planGroup={followers[0]} onEdit={() => { setLessonDialog(openLesson); setOpenLesson(null); }} onClose={() => setOpenLesson(null)} />}
      {dialogs}
    </>
  );
}

function IconBtn({ label, onClick, icon, disabled }: { label: string; onClick: () => void; icon: ReactNode; disabled?: boolean }) {
  return (
    <Button variant="ghost" size="sm" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="h-9 w-9 !px-0">
      {icon}
    </Button>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────────────

function CurriculumDialog({ curriculum, onClose, onCreated }: { curriculum: Curriculum | null; onClose: () => void; onCreated: (c: Curriculum) => void }) {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState(curriculum?.title ?? '');
  const [type, setType] = useState<GroupType>(curriculum?.type ?? 'primary');
  const [grade, setGrade] = useState<string>(curriculum?.grade ? String(curriculum.grade) : '');
  async function onSave() {
    if (!title.trim()) return;
    const g = grade ? Number(grade) : null;
    if (curriculum) {
      await save<Curriculum>('curricula', { ...curriculum, title: title.trim(), type, grade: g });
      toast(t.common.saved);
    } else {
      onCreated(await createCurriculum(title, type, g));
    }
    onClose();
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={curriculum ? curriculum.title : t.curriculumEdit.newCurriculum}
      footer={
        <>
          {curriculum && (
            <Button
              variant="quiet-danger"
              className="mr-auto"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                if (!confirm(t.curriculumEdit.confirmDeleteCurriculum(curriculum.title))) return;
                await deleteCurriculum(curriculum.key);
                onClose();
              }}
            >
              {t.common.delete}
            </Button>
          )}
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave} disabled={!title.trim()}>
            {curriculum ? t.common.save : t.curriculumEdit.create}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextInput label={t.common.name} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.curriculumEdit.namePlaceholder} autoFocus />
        </div>
        <Select label={t.groups.fields.type} value={type} onChange={(e) => setType(e.target.value as GroupType)}>
          {(['kindergarten', 'primary', 'secondary'] as const).map((ty) => (
            <option key={ty} value={ty}>
              {t.groupTypes[ty]}
            </option>
          ))}
        </Select>
        <TextInput label={`${t.groups.fields.grade} (${t.common.optional})`} type="number" inputMode="numeric" min={1} max={11} value={grade} onChange={(e) => setGrade(e.target.value)} />
        {!curriculum && <p className="text-sm text-ink-soft sm:col-span-2">{t.curriculumEdit.newHint}</p>}
      </div>
    </Dialog>
  );
}

function ModuleDialog({ module, onClose, english }: { module: Partial<Module>; onClose: () => void; english: boolean }) {
  const t = useT();
  const [m, setM] = useState({ title: module.title ?? '', months: module.months ?? '', keyLanguage: module.keyLanguage ?? '', songs: module.songs ?? '', notes: module.notes ?? '' });
  const set = (p: Partial<typeof m>) => setM((x) => ({ ...x, ...p }));
  async function onSave() {
    if (!m.title.trim()) return;
    await saveModule({ ...m, title: m.title.trim(), resources: module.resources ?? '', curriculumKey: module.curriculumKey!, ...(module.id ? { id: module.id, order: module.order } : {}) });
    onClose();
  }
  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={module.id ? module.title : t.curriculumEdit.addModule}
      footer={
        <>
          {module.id && (
            <Button
              variant="quiet-danger"
              className="mr-auto"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                if (!confirm(t.curriculumEdit.confirmDeleteModule(module.title ?? ''))) return;
                await deleteModule(module.id!);
                onClose();
              }}
            >
              {t.common.delete}
            </Button>
          )}
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave} disabled={!m.title.trim()}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <TextInput label={t.common.name} value={m.title} onChange={(e) => set({ title: e.target.value })} placeholder="Module 3: Food" autoFocus={!module.id} />
        <TextInput label={t.curriculum.months} value={m.months} onChange={(e) => set({ months: e.target.value })} placeholder="Nov–Dec" hint={t.curriculumEdit.monthsHint} />
        <div className="sm:col-span-2">
          <TextArea label={english ? t.curriculum.keyLanguage : t.lessonView.keyContent} hint={t.curriculumEdit.keyLanguageHint} rows={3} value={m.keyLanguage} onChange={(e) => set({ keyLanguage: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <TextInput label={t.curriculum.songs} value={m.songs} onChange={(e) => set({ songs: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <TextArea label={t.curriculum.notes} rows={2} value={m.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
    </Dialog>
  );
}

function LessonDialog({ lesson, onClose }: { lesson: Partial<PlannedLesson>; onClose: () => void }) {
  const t = useT();
  const [l, setL] = useState({ label: lesson.label ?? '', focus: lesson.focus ?? '', activities: lesson.activities ?? '' });
  const set = (p: Partial<typeof l>) => setL((x) => ({ ...x, ...p }));
  async function onSave() {
    if (!l.label.trim()) return;
    await saveLesson({ ...l, label: l.label.trim(), moduleId: lesson.moduleId!, ...(lesson.id ? { id: lesson.id } : {}) });
    onClose();
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={lesson.id ? lesson.label : t.curriculumEdit.addLesson}
      footer={
        <>
          {lesson.id && (
            <Button
              variant="quiet-danger"
              className="mr-auto"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                if (!confirm(t.common.confirmDelete)) return;
                await deleteLesson(lesson.id!);
                onClose();
              }}
            >
              {t.common.delete}
            </Button>
          )}
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave} disabled={!l.label.trim()}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextInput label={t.curriculumEdit.lessonLabel} value={l.label} onChange={(e) => set({ label: e.target.value })} placeholder="Week 1 · Lesson A" />
        <TextArea label={t.curriculum.focus} rows={2} value={l.focus} onChange={(e) => set({ focus: e.target.value })} autoFocus={!lesson.id} />
        <TextArea label={t.curriculum.activities} rows={3} value={l.activities} onChange={(e) => set({ activities: e.target.value })} />
      </div>
    </Dialog>
  );
}

function LessonDetail({ lesson, groups, planGroup, onEdit, onClose }: { lesson: PlannedLesson; groups: Group[]; planGroup?: Group; onEdit: () => void; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const settings = useSettings();
  const extra = useLiveQuery(async () => {
    const module = await db.modules.get(lesson.moduleId);
    const games = (await db.games.bulkGet(lesson.gameIds)).filter((g) => !!g);
    const resources = (await db.resources.bulkGet(lesson.resourceIds)).filter((r) => !!r);
    return { module, games, resources };
  }, [lesson.id]);

  return (
    <Dialog
      open
      onClose={onClose}
      title={lesson.label}
      footer={
        <>
          <Button icon={<Pencil size={16} />} onClick={onEdit} className="mr-auto">
            {t.common.edit}
          </Button>
          <Button variant="primary" onClick={() => navigate(`/plan/${lesson.id}${planGroup ? `?group=${planGroup.id}` : ''}`)}>
            {t.planner.planIt}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">{extra?.module?.title}</p>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g.id} className="rounded-full bg-pen-soft px-3 py-1 text-sm font-medium">
                {t.curriculum.here(g.name)}
              </span>
            ))}
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.focus}</h3>
          <p className="text-lg">{lesson.focus}</p>
        </div>
        {lesson.activities && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.activities}</h3>
            <p className="whitespace-pre-line">{lesson.activities}</p>
          </div>
        )}
        {extra?.module?.keyLanguage && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{isEnglish(settings?.subject) ? t.curriculum.keyLanguage : t.lessonView.keyContent}</h3>
            <p>{extra.module.keyLanguage}</p>
          </div>
        )}
        {lesson.stages.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.lessonView.stages}</h3>
            <ol className="mt-1 text-sm">
              {lesson.stages.map((s, i) => (
                <li key={i}>
                  <span className="font-semibold tabular-nums">{s.minutes}′</span> {s.name}
                </li>
              ))}
            </ol>
          </div>
        )}
        {!!extra?.games.length && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.games}</h3>
            <ul className="mt-1 flex flex-col gap-2">
              {extra.games.map((g) => (
                <li key={g!.id} className="rounded-xl bg-sunk px-3 py-2">
                  <p className="font-semibold">{g!.name}</p>
                  <p className="text-sm text-ink-soft">{g!.howItWorks}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!extra?.resources.length && (
          <div>
            <h3 className="text-sm font-medium text-ink-soft">{t.curriculum.resources}</h3>
            <ul className="mt-1 flex flex-col gap-1">
              {extra.resources.map((r) => (
                <li key={r!.id}>
                  {r!.link ? (
                    <a href={r!.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-pen underline underline-offset-2">
                      {r!.name} <ExternalLink size={14} aria-hidden />
                    </a>
                  ) : (
                    r!.name
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
