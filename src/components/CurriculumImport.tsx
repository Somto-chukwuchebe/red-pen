import { useLiveQuery } from 'dexie-react-hooks';
import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { importCurriculum } from '../db/curriculumImport';
import { db } from '../db/db';
import type { ParseResult } from '../import/parseCurriculum';
import { useT } from '../i18n';
import { useToast } from './Toast';
import { Banner, Button, Toggle } from './ui';

/** Settings → Curriculum: import a curriculum from the teacher's own Word document. */
export function CurriculumImport() {
  const t = useT();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [withLibrary, setWithLibrary] = useState(true);
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const existing = useLiveQuery(() => db.curricula.count(), []);

  async function pick(f?: File) {
    setError(null);
    setParsed(null);
    if (!f) return;
    if (/\.pdf$/i.test(f.name)) return setError(t.curriculumImport.pdfLater);
    if (!/\.docx$/i.test(f.name)) return setError(t.curriculumImport.notDocx);
    setBusy(true);
    try {
      // The Word reader is only downloaded when you import.
      const { readCurriculumWordFile } = await import('../import/readWord');
      const r = await readCurriculumWordFile(f);
      setFileName(f.name);
      if (!r.curricula.length && !r.games.length) setError(t.curriculumImport.nothingFound);
      else setParsed(r);
    } catch {
      setError(t.curriculumImport.unreadable);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function doImport() {
    if (!parsed) return;
    setBusy(true);
    try {
      const out = await importCurriculum(parsed, { includeLibrary: withLibrary });
      toast(t.curriculumImport.done(out.modules, out.lessons));
      setParsed(null);
    } finally {
      setBusy(false);
    }
  }

  const followers = (key: string) => (groups ?? []).filter((g) => g.curriculumKey === key).map((g) => g.name);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">{t.curriculumImport.intro}</p>
      <input ref={input} type="file" accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <div>
        <Button icon={<FileUp size={18} />} onClick={() => input.current?.click()} disabled={busy}>
          {busy && !parsed ? t.curriculumImport.reading : t.curriculumImport.choose}
        </Button>
      </div>
      <details className="text-sm text-ink-soft">
        <summary className="cursor-pointer font-medium">{t.curriculumImport.formatTitle}</summary>
        <ul className="mt-2 ml-5 list-disc space-y-1">
          {t.curriculumImport.format.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </details>
      {error && <Banner tone="warn">{error}</Banner>}

      {parsed && (
        <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
          <p className="font-semibold">{t.curriculumImport.found(fileName)}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  <th className="py-1 pr-3 font-medium">{t.curriculum.choose}</th>
                  <th className="py-1 pr-3 text-right font-medium">{t.curriculumImport.modules}</th>
                  <th className="py-1 pr-3 text-right font-medium">{t.curriculumImport.lessons}</th>
                  <th className="py-1 font-medium">{t.curriculum.followedBy}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {parsed.curricula.map((c) => {
                  const mods = parsed.modules.filter((m) => m.curriculumKey === c.key);
                  return (
                    <tr key={c.key} className="border-t border-line">
                      <td className="py-1.5 pr-3">{c.title}</td>
                      <td className="py-1.5 pr-3 text-right">{mods.length}</td>
                      <td className="py-1.5 pr-3 text-right">{parsed.lessons.filter((l) => mods.some((m) => m.id === l.moduleId)).length}</td>
                      <td className="py-1.5 text-ink-soft">{followers(c.key).join(', ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-ink-soft">{t.curriculumImport.extras(parsed.frameworks.length, parsed.games.length, parsed.resources.length)}</p>
          {parsed.warnings.length > 0 && (
            <Banner tone="warn">
              <p className="font-semibold">{t.curriculumImport.warnings(parsed.warnings.length)}</p>
              <ul className="mt-1 ml-4 list-disc text-sm">
                {parsed.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Banner>
          )}
          {(parsed.games.length > 0 || parsed.resources.length > 0) && <Toggle label={t.curriculumImport.withLibrary} checked={withLibrary} onChange={setWithLibrary} />}
          {!!existing && <p className="text-sm text-ink-soft">{t.curriculumImport.reimportNote}</p>}
          <p className="text-sm text-ink-soft">{t.curriculumImport.linkHint}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setParsed(null)}>{t.common.cancel}</Button>
            <Button variant="primary" onClick={doImport} disabled={busy}>
              {t.curriculumImport.importButton}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
