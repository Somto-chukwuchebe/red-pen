import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Dialog, Field, GroupDot, PageHeader, Select, TextArea, TextInput, Toggle, cx } from '../components/ui';
import { useToast } from '../components/Toast';
import { db } from '../db/db';
import { useGroups } from '../db/hooks';
import { newId, save } from '../db/repo';
import type { Group, GroupType } from '../domain/types';
import { useT } from '../i18n';

const PALETTE = ['#0E7C86', '#35A3AC', '#2F6FB5', '#6495D6', '#6B4FB3', '#9780D4', '#A8458A', '#C979B2', '#9A5B24', '#C38B55', '#3D7A38', '#6E9B2F', '#4F5D6E', '#D19A00', '#D2742A', '#B08A2E'];

export function GroupsPage() {
  const t = useT();
  const [showArchived, setShowArchived] = useState(false);
  const groups = useGroups(true);
  const [editing, setEditing] = useState<Group | null>(null);
  const pointers = useLiveQuery(async () => {
    const all = await db.groups.toArray();
    const lessons = await db.lessons.bulkGet(all.map((g) => g.currentPlannedLessonId ?? ''));
    const modules = await db.modules.bulkGet(lessons.map((l) => l?.moduleId ?? ''));
    return new Map(all.map((g, i) => [g.id, lessons[i] ? `${modules[i]?.title ?? ''} · ${lessons[i]!.label}` : null]));
  }, []);
  const slotCounts = useLiveQuery(async () => {
    const m = new Map<string, number>();
    for (const s of await db.slots.toArray()) m.set(s.groupId, (m.get(s.groupId) ?? 0) + 1);
    return m;
  }, []);

  if (!groups) return null;
  const visible = groups.filter((g) => showArchived || !g.archived);
  const weekly = groups.filter((g) => !g.archived).reduce((s, g) => s + g.lessonsPerWeek, 0);

  const blank = (): Group => ({
    id: '',
    name: '',
    type: 'primary',
    grade: 2,
    curriculumKey: 'grade-2',
    lessonsPerWeek: 2,
    lessonLengthMin: 40,
    textbook: '',
    studentCount: 18,
    currentPlannedLessonId: null,
    colour: PALETTE[groups.length % PALETTE.length],
    notes: '',
    archived: false,
    order: groups.length + 1,
    tracksStudents: true,
    updatedAt: 0,
  });

  return (
    <>
      <PageHeader
        title={t.groups.title}
        subtitle={t.groups.weeklyTotal(weekly)}
        actions={
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setEditing(blank())}>
            {t.groups.add}
          </Button>
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((g) => (
          <li key={g.id}>
            <button type="button" onClick={() => setEditing(g)} className={cx('w-full text-left', g.archived && 'opacity-60')}>
              <span className="relative block h-full overflow-hidden rounded-2xl border border-line bg-card p-4 pl-5 transition-shadow hover:shadow-md sm:p-5">
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: g.colour }} />
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-2xl font-semibold">{g.name}</span>
                  <span className="text-sm text-ink-soft">{g.archived ? t.groups.archived : t.groupTypes[g.type]}</span>
                </span>
                <span className="block mt-1 text-ink-soft">
                  {t.groups.perWeek(g.lessonsPerWeek)} · {g.lessonLengthMin} {t.common.minutes} · {t.common.students(g.studentCount)}
                </span>
                <span className="block text-ink-soft">{g.textbook}</span>
                <span className="block mt-2 text-sm">
                  <span className="font-medium text-ink-soft">{t.groups.nextUp}: </span>
                  {pointers?.get(g.id) ?? t.groups.noPointer}
                </span>
                {slotCounts && (slotCounts.get(g.id) ?? 0) !== g.lessonsPerWeek && !g.archived && (
                  <span className="block mt-1 text-sm font-medium text-amber">{t.timetable.countLine(g.name, slotCounts.get(g.id) ?? 0, g.lessonsPerWeek)}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6 max-w-sm">
        <Toggle label={t.groups.showArchived} checked={showArchived} onChange={setShowArchived} />
      </div>
      {editing && <GroupEditor group={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function GroupEditor({ group, onClose }: { group: Group; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [g, setG] = useState<Group>(group);
  const [tried, setTried] = useState(false);
  const curricula = useLiveQuery(() => db.curricula.orderBy('order').toArray(), []);
  const set = <K extends keyof Group>(k: K, v: Group[K]) => setG((x) => ({ ...x, [k]: v }));
  const num = (v: string, min = 0) => Math.max(min, Number(v) || 0);

  async function onSave() {
    setTried(true);
    if (!g.name.trim()) return;
    let pointer = g.currentPlannedLessonId;
    // A new group, or one moved to a different curriculum, starts at its first lesson.
    if (!group.id || group.curriculumKey !== g.curriculumKey) {
      const first = await db.modules.where('curriculumKey').equals(g.curriculumKey).sortBy('order');
      const lessons = first[0] ? await db.lessons.where('moduleId').equals(first[0].id).sortBy('order') : [];
      pointer = lessons[0]?.id ?? null;
    }
    await save<Group>('groups', { ...g, id: g.id || newId('g'), name: g.name.trim(), currentPlannedLessonId: pointer });
    toast(t.common.saved);
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={group.id ? `${t.groups.edit}: ${group.name}` : t.groups.add}
      wide
      footer={
        <>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label={t.groups.fields.name} value={g.name} onChange={(e) => set('name', e.target.value)} error={tried && !g.name.trim() ? t.groups.nameRequired : undefined} autoFocus={!group.id} />
        <Select label={t.groups.fields.type} value={g.type} onChange={(e) => set('type', e.target.value as GroupType)}>
          {(['kindergarten', 'primary', 'secondary'] as const).map((ty) => (
            <option key={ty} value={ty}>
              {t.groupTypes[ty]}
            </option>
          ))}
        </Select>
        <Select label={t.groups.fields.curriculum} value={g.curriculumKey} onChange={(e) => set('curriculumKey', e.target.value)}>
          {curricula?.map((c) => (
            <option key={c.key} value={c.key}>
              {c.title}
            </option>
          ))}
        </Select>
        {g.type !== 'kindergarten' ? (
          <TextInput label={t.groups.fields.grade} type="number" inputMode="numeric" min={1} max={11} value={g.grade ?? ''} onChange={(e) => set('grade', e.target.value ? num(e.target.value, 1) : null)} />
        ) : (
          <div />
        )}
        <TextInput label={t.groups.fields.lessonsPerWeek} type="number" inputMode="numeric" min={0} max={10} value={g.lessonsPerWeek} onChange={(e) => set('lessonsPerWeek', num(e.target.value))} />
        <TextInput label={t.groups.fields.length} type="number" inputMode="numeric" min={5} max={120} step={5} value={g.lessonLengthMin} onChange={(e) => set('lessonLengthMin', num(e.target.value, 5))} />
        <TextInput label={t.groups.fields.textbook} value={g.textbook} onChange={(e) => set('textbook', e.target.value)} />
        <TextInput label={t.groups.fields.studentCount} type="number" inputMode="numeric" min={0} value={g.studentCount} onChange={(e) => set('studentCount', num(e.target.value))} />
        <div className="sm:col-span-2">
          <Field label={t.groups.fields.colour}>
            <div className="flex flex-wrap items-center gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={g.colour === c}
                  onClick={() => set('colour', c)}
                  className={cx('grid h-10 w-10 place-items-center rounded-full', g.colour === c && 'ring-2 ring-ink ring-offset-2 ring-offset-card')}
                >
                  <GroupDot colour={c} size={30} />
                </button>
              ))}
              <input type="color" aria-label={t.groups.fields.colour} value={g.colour} onChange={(e) => set('colour', e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-paper" />
            </div>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <TextArea label={t.groups.fields.notes} rows={3} value={g.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Toggle label={t.groups.fields.tracksStudents} checked={g.tracksStudents} onChange={(v) => set('tracksStudents', v)} />
          <Toggle label={t.groups.fields.archived} checked={g.archived} onChange={(v) => set('archived', v)} />
        </div>
      </div>
    </Dialog>
  );
}
