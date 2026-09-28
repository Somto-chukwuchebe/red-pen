import { FileDown, FileUp, RefreshCw, Share } from 'lucide-react';
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
  recordSent,
  shareOrDownload,
  syncFrom,
  syncState,
  type BackupFile,
  type ImportPreview,
  type SyncResult,
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

        <SyncCard />

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

/** Sync: send this device's data to your other device, or merge in what it sent — no preview, newest wins. */
function SyncCard() {
  const t = useT();
  const toast = useToast();
  const lastChange = useLocal<number>('lastChangeAt');
  const lastSent = useLocal<number>('lastSentAt');
  const lastImport = useLocal<{ at: number; fromDevice: string }>('lastImport');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const state = syncState(lastChange, lastSent, lastImport?.at);
  const lastSync = Math.max(lastSent ?? 0, lastImport?.at ?? 0);
  const since = lastSync ? dateTime(t.locale, lastSync) : t.data.never;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const b = await buildBackup();
      const blob = new Blob([JSON.stringify(b)], { type: 'application/json' });
      // The share sheet everywhere it exists (on a Mac too: it has AirDrop); otherwise a download.
      const how = await shareOrDownload(blob, backupFileName(b), true);
      if (how !== 'cancelled') {
        await recordSent(b);
        setResult(null);
        toast(how === 'shared' ? t.data.sentShared : t.data.sentSaved);
      }
    } finally {
      setBusy(false);
    }
  }

  async function bringIn(f: File | undefined) {
    setError(null);
    setResult(null);
    if (!f) return;
    setBusy(true);
    try {
      setResult(await syncFrom(parseBackup(await f.text())));
    } catch (e) {
      setError(e instanceof BackupError ? (t.data.errors[e.message] ?? t.errors.generic) : t.errors.generic);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void bringIn(e.dataTransfer.files[0]);
      }}
      className={cx('rounded-2xl', dragging && 'outline-2 outline-offset-2 outline-pen outline-dashed')}
    >
      <Card>
        <SectionTitle>{t.data.syncTitle}</SectionTitle>
        <p className="mb-4 text-ink-soft">{t.data.syncIntro}</p>

        <div className="mb-4">
          <Banner tone={state === 'synced' ? 'good' : 'info'}>{state === 'never' ? t.data.syncNever : state === 'unsent' ? t.data.syncUnsent(since) : t.data.syncSynced(since)}</Banner>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="lg" icon={<Share size={20} />} onClick={send} disabled={busy}>
            {t.data.sendButton}
          </Button>
          <input ref={input} type="file" accept="application/json,.json" className="sr-only" aria-hidden tabIndex={-1} onChange={(e) => bringIn(e.target.files?.[0])} />
          <Button size="lg" icon={<FileDown size={20} />} onClick={() => input.current?.click()} disabled={busy}>
            {t.data.bringButton}
          </Button>
        </div>
        {dragging && <p className="mt-3 font-medium text-pen">{t.data.dropHere}</p>}

        {error && (
          <div className="mt-4">
            <Banner tone="warn">{error}</Banner>
          </div>
        )}
        {result && (
          <div className="mt-4 flex flex-col gap-3">
            <Banner tone="good">{result.changes ? t.data.syncedIn(result.changes, result.from) : t.data.alreadyUpToDate(result.from)}</Banner>
            {result.sendBack > 0 && (
              <Banner
                tone="info"
                action={
                  <Button size="sm" icon={<RefreshCw size={16} />} onClick={send} disabled={busy}>
                    {t.data.sendButton}
                  </Button>
                }
              >
                {t.data.sendBack(result.from)}
              </Banner>
            )}
          </div>
        )}

        <ol className="mt-5 flex flex-col gap-2 text-sm text-ink-soft">
          {t.data.syncSteps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-ink">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
