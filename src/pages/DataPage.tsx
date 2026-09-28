import { FileUp, Share } from 'lucide-react';
import { useRef, useState } from 'react';
import { Banner, Button, Card, PageHeader, SectionTitle, cx } from '../components/ui';
import { useToast } from '../components/Toast';
import {
  applyImport,
  BackupError,
  backupFileName,
  buildBackup,
  parseBackup,
  previewImport,
  recordExport,
  shareOrDownload,
  type BackupFile,
  type ImportPreview,
} from '../db/backup';
import { useLocal } from '../db/hooks';
import { useT } from '../i18n';
import { dateTime } from '../lib/format';
import { isTouchPhone } from '../lib/platform';

export function DataPage() {
  const t = useT();
  const toast = useToast();
  const deviceName = useLocal<string>('deviceName');
  const lastChange = useLocal<number>('lastChangeAt');
  const lastExport = useLocal<number>('lastExportAt');
  const lastImport = useLocal<{ at: number; fromDevice: string; exportedAt: number }>('lastImport');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<BackupFile | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const when = (ms?: number | null) => (ms ? dateTime(t.locale, ms) : t.data.never);
  const unsaved = lastChange !== undefined && (!lastExport || lastChange > lastExport);

  async function onExport() {
    setBusy(true);
    try {
      const b = await buildBackup();
      const blob = new Blob([JSON.stringify(b)], { type: 'application/json' });
      const result = await shareOrDownload(blob, backupFileName(b), isTouchPhone());
      if (result !== 'cancelled') {
        await recordExport(b);
        toast(t.data.exported);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPick(f: File | undefined) {
    setError(null);
    setPreview(null);
    if (!f) return;
    try {
      const b = parseBackup(await f.text());
      setFile(b);
      setPreview(await previewImport(b, 'merge'));
    } catch (e) {
      setFile(null);
      setError(e instanceof BackupError ? (t.data.errors[e.message] ?? t.errors.generic) : t.errors.generic);
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  async function onApply() {
    if (!file || !preview) return;
    setBusy(true);
    try {
      await applyImport(file, preview.mode);
      toast(t.data.imported);
      setFile(null);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t.data.title} />
      <div className="flex max-w-3xl flex-col gap-5">
        <p className="text-ink-soft">{t.data.intro}</p>

        <Card>
          <SectionTitle>
            {t.data.status}: {deviceName}
          </SectionTitle>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            <dt className="text-ink-soft">{t.data.lastChange}</dt>
            <dd className="font-medium">{when(lastChange)}</dd>
            <dt className="text-ink-soft">{t.data.lastBackup}</dt>
            <dd className={cx('font-medium', !lastExport && 'text-amber')}>{when(lastExport)}</dd>
            <dt className="text-ink-soft">{t.data.lastImport}</dt>
            <dd className="font-medium">{lastImport ? t.data.importFrom(lastImport.fromDevice, dateTime(t.locale, lastImport.exportedAt)) : t.data.never}</dd>
          </dl>
          <div className="mt-4">
            <Banner tone={unsaved ? 'warn' : 'good'}>
              <span className="font-semibold">{t.data.newest}: </span>
              {unsaved ? t.data.newestHere : t.data.newestBackedUp}
            </Banner>
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.data.exportTitle}</SectionTitle>
          <p className="mb-4 text-ink-soft">{t.data.exportHint}</p>
          <Button variant="primary" size="lg" icon={<Share size={20} />} onClick={onExport} disabled={busy}>
            {t.data.exportButton}
          </Button>
        </Card>

        <Card>
          <SectionTitle>{t.data.importTitle}</SectionTitle>
          <p className="mb-4 text-ink-soft">{t.data.importHint}</p>
          <input ref={input} type="file" accept="application/json,.json" className="sr-only" id="backup-file" onChange={(e) => onPick(e.target.files?.[0])} />
          <Button size="lg" icon={<FileUp size={20} />} onClick={() => input.current?.click()}>
            {t.data.chooseFile}
          </Button>
          {error && (
            <div className="mt-4">
              <Banner tone="warn">{error}</Banner>
            </div>
          )}

          {preview && file && (
            <div className="mt-5 flex flex-col gap-4">
              <h3 className="text-lg font-semibold">{t.data.previewTitle}</h3>
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
                <dt className="text-ink-soft">{t.data.fromDevice}</dt>
                <dd className="font-medium">{file.deviceName}</dd>
                <dt className="text-ink-soft">{t.data.exportedAt}</dt>
                <dd className="font-medium">{dateTime(t.locale, file.exportedAt)}</dd>
              </dl>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 font-medium">{t.data.mode}</legend>
                {(['merge', 'replace'] as const).map((m) => (
                  <label key={m} className={cx('flex cursor-pointer gap-3 rounded-xl border p-3', preview.mode === m ? 'border-pen bg-pen-soft' : 'border-line')}>
                    <input type="radio" name="import-mode" className="mt-1 h-5 w-5 shrink-0 accent-[var(--pen)]" checked={preview.mode === m} onChange={async () => setPreview(await previewImport(file, m))} />
                    <span>
                      <span className="font-semibold">{m === 'merge' ? t.data.merge : t.data.replace}</span>
                      <span className="block text-sm text-ink-soft">{m === 'merge' ? t.data.mergeHint : t.data.replaceHint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {preview.deviceIsNewer && <Banner tone="warn">{t.data.deviceIsNewer}</Banner>}

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-sunk text-ink-soft">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t.data.table}</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">{t.data.inFile}</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">{t.data.onDevice}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.data.willAdd}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.data.willUpdate}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.data.willRemove}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {preview.tables
                      .filter((r) => r.inFile || r.onDevice)
                      .map((r) => (
                        <tr key={r.table} className="border-t border-line">
                          <td className="px-3 py-2">{t.data.tableNames[r.table] ?? r.table}</td>
                          <td className="hidden px-3 py-2 text-right sm:table-cell">{r.inFile}</td>
                          <td className="hidden px-3 py-2 text-right sm:table-cell">{r.onDevice}</td>
                          <td className="px-3 py-2 text-right">{r.added || '–'}</td>
                          <td className="px-3 py-2 text-right">{r.updated || '–'}</td>
                          <td className={cx('px-3 py-2 text-right', r.deleted > 0 && 'font-semibold text-amber')}>{r.deleted || '–'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={() => { setFile(null); setPreview(null); }}>{t.common.cancel}</Button>
                <Button variant="primary" onClick={onApply} disabled={busy}>
                  {t.data.apply(preview.mode)}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>{t.data.moveTitle}</SectionTitle>
          <ol className="flex flex-col gap-3">
            {t.data.moveSteps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pen font-semibold text-white dark:text-[#1b0f0e]">{i + 1}</span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
