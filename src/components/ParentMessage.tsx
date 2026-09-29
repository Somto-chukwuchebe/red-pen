import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, RotateCcw, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { useFlagRule, useSettings } from '../db/hooks';
import type { Group, Student } from '../domain/types';
import { useT } from '../i18n';
import { parentMessage } from '../lib/parentMessage';
import { studentHistory } from '../lib/participation';
import { useToast } from './Toast';
import { Button, Dialog, Segmented } from './ui';

/** A draft message to a child's parents, to edit and then copy or share. */
export function ParentMessageDialog({ group, student, onClose }: { group: Group; student: Student; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const settings = useSettings();
  const rule = useFlagRule();
  const [lang, setLang] = useState<'en' | 'ru'>(settings?.language ?? 'en');
  const [text, setText] = useState<string | null>(null);

  const draft = useLiveQuery(async () => {
    const logs = await db.logs.where('groupId').equals(group.id).toArray();
    const parts = await db.participation.where('lessonLogId').anyOf(logs.map((l) => l.id)).toArray();
    const lesson = group.currentPlannedLessonId ? await db.lessons.get(group.currentPlannedLessonId) : undefined;
    const module = lesson ? await db.modules.get(lesson.moduleId) : undefined;
    const statements = module ? await db.canDoStatements.where('moduleId').equals(module.id).sortBy('order') : [];
    const marks = await db.canDoMarks.where('groupId').equals(group.id).toArray();
    // The child's own mark if there is one, otherwise the whole group's.
    const levelOf = (id: string) => (marks.find((m) => m.statementId === id && m.studentId === student.id) ?? marks.find((m) => m.statementId === id && !m.studentId))?.level ?? null;
    return {
      history: studentHistory(student.id, logs, parts),
      canDo: statements.map((s) => ({ text: s.text, level: levelOf(s.id) })),
      topic: module?.title ?? null,
    };
  }, [group.id, group.currentPlannedLessonId, student.id]);

  const generated =
    draft && settings
      ? parentMessage({ name: student.name, group: group.name, subject: settings.subject ?? 'English', teacherName: settings.teacherName, rule, ...draft }, lang)
      : '';
  // Start from the generated text; once you edit it, it's yours until you ask for a fresh draft.
  useEffect(() => setText(null), [lang]);
  const value = text ?? generated;
  const canShare = typeof navigator.share === 'function';

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast(t.summary.copied);
    } catch {
      toast(t.summary.copyFailed);
    }
  }

  async function share() {
    try {
      await navigator.share({ text: value });
    } catch {
      /* cancelled */
    }
  }

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={t.parentMessage.title(student.name)}
      footer={
        <>
          <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={() => setText(null)} disabled={text === null} className="mr-auto">
            {t.parentMessage.fresh}
          </Button>
          {canShare && (
            <Button icon={<Share size={16} />} onClick={share} disabled={!value}>
              {t.parentMessage.share}
            </Button>
          )}
          <Button variant="primary" icon={<Copy size={16} />} onClick={copy} disabled={!value}>
            {t.summary.copy}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">{t.summary.language}</p>
          <Segmented label={t.summary.language} value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ru', label: 'Русский' }]} />
        </div>
        <textarea value={value} onChange={(e) => setText(e.target.value)} aria-label={t.parentMessage.title(student.name)} rows={12} className="w-full rounded-xl border border-line bg-paper px-3 py-2 font-sans text-sm leading-relaxed" />
        <p className="text-sm text-ink-soft">{t.parentMessage.hint}</p>
      </div>
    </Dialog>
  );
}
