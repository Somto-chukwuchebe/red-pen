import { Plus, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BareInput, Banner, Button, Card, PageHeader, Segmented, SectionTitle, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { useLocal, useSettings } from '../db/hooks';
import { patch, setLocal } from '../db/repo';
import { reloadCurriculum } from '../db/seed';
import type { DateRange, Settings } from '../domain/types';
import { useT } from '../i18n';
import { checkCalendar, totalTeachingWeeks } from '../lib/calendar';
import { bytes } from '../lib/format';
import { detectPlatform } from '../lib/platform';
import { requestPersistentStorage, storageState, type PersistState } from '../lib/storage';

export function SettingsPage() {
  const t = useT();
  const toast = useToast();
  const settings = useSettings();
  const deviceName = useLocal<string>('deviceName');
  if (!settings) return null;
  const set = (changes: Partial<Settings>) => patch<Settings>('settings', settings.id, changes);

  return (
    <>
      <PageHeader title={t.settings.title} />
      <div className="flex max-w-3xl flex-col gap-5">
        <Card>
          <SectionTitle>{t.settings.device}</SectionTitle>
          <div className="flex flex-col gap-5">
            <DeviceName value={deviceName ?? ''} />
            <div>
              <p className="mb-2 text-sm font-medium">{t.settings.theme}</p>
              <Segmented label={t.settings.theme} value={settings.theme} onChange={(v) => set({ theme: v })} options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t.settings.themes[v] }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">{t.settings.language}</p>
              <Segmented label={t.settings.language} value={settings.language} onChange={(v) => set({ language: v })} options={(['en', 'ru'] as const).map((v) => ({ value: v, label: t.settings.languages[v] }))} />
            </div>
          </div>
        </Card>

        <StorageCard />

        <Card>
          <SectionTitle>{t.settings.year}</SectionTitle>
          <CalendarEditor settings={settings} onSave={(c) => set(c).then(() => toast(t.common.saved))} />
        </Card>

        <Card>
          <SectionTitle>{t.settings.backup}</SectionTitle>
          <div className="max-w-xs">
            <TextInput label={t.settings.reminderDays} type="number" inputMode="numeric" min={1} max={60} value={settings.backupReminderDays} onChange={(e) => set({ backupReminderDays: Math.max(1, Number(e.target.value) || 7) })} />
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.settings.curriculum}</SectionTitle>
          <p className="mb-3 text-ink-soft">{t.settings.curriculumHint}</p>
          <Button
            onClick={async () => {
              if (!confirm(t.settings.confirmReload)) return;
              const r = await reloadCurriculum();
              toast(t.settings.reloaded(r.modules, r.lessons));
            }}
          >
            {t.settings.reloadCurriculum}
          </Button>
        </Card>

        <p className="text-sm text-ink-soft">
          {t.appName} · {t.settings.version(__APP_VERSION__)}
        </p>
      </div>
    </>
  );
}

function DeviceName({ value }: { value: string }) {
  const t = useT();
  const [v, setV] = useState(value);
  useEffect(() => {
    setV(value);
  }, [value]);
  return (
    <TextInput
      label={t.settings.deviceName}
      hint={t.settings.deviceNameHint}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && setLocal('deviceName', v.trim())}
    />
  );
}

export function StorageCard() {
  const t = useT();
  const [info, setInfo] = useState<{ state: PersistState; usage?: number; quota?: number } | null>(null);
  const refresh = () => storageState().then(setInfo);
  useEffect(() => {
    void refresh();
  }, []);
  const ios = detectPlatform().startsWith('ios');

  return (
    <Card>
      <SectionTitle>{t.settings.storage}</SectionTitle>
      {info && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            {info.state === 'persistent' ? <ShieldCheck className="mt-0.5 shrink-0 text-pen" aria-hidden /> : <ShieldAlert className="mt-0.5 shrink-0 text-amber" aria-hidden />}
            <p>{info.state === 'persistent' ? t.settings.storagePersistent : info.state === 'best-effort' ? t.settings.storageNotPersistent : t.settings.storageUnknown}</p>
          </div>
          {info.usage !== undefined && info.quota !== undefined && <p className="text-sm text-ink-soft">{t.settings.storageUsed(bytes(info.usage), bytes(info.quota))}</p>}
          {info.state === 'best-effort' && (
            <div>
              <Button size="sm" onClick={() => requestPersistentStorage().then(refresh)}>
                {t.settings.storageAsk}
              </Button>
            </div>
          )}
          {ios && <Banner tone="info">{t.settings.storageIos}</Banner>}
        </div>
      )}
    </Card>
  );
}

function CalendarEditor({ settings, onSave }: { settings: Settings; onSave: (c: Pick<Settings, 'yearStart' | 'quarters' | 'holidays'>) => void }) {
  const t = useT();
  const [c, setC] = useState({ yearStart: settings.yearStart, quarters: settings.quarters, holidays: settings.holidays });
  useEffect(() => {
    setC({ yearStart: settings.yearStart, quarters: settings.quarters, holidays: settings.holidays });
  }, [settings.yearStart, settings.quarters, settings.holidays]);
  const problems = checkCalendar(c);
  const dirty = JSON.stringify(c) !== JSON.stringify({ yearStart: settings.yearStart, quarters: settings.quarters, holidays: settings.holidays });

  const editRange = (key: 'quarters' | 'holidays', i: number, p: Partial<DateRange>) => setC((x) => ({ ...x, [key]: x[key].map((r, j) => (j === i ? { ...r, ...p } : r)) }));

  const rangeRow = (key: 'quarters' | 'holidays', r: DateRange, i: number) => (
    <li key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-sunk p-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center sm:bg-transparent sm:p-0">
      <BareInput aria-label={t.settings.holidayName} value={r.name} onChange={(e) => editRange(key, i, { name: e.target.value })} readOnly={key === 'quarters'} className={key === 'quarters' ? 'border-transparent bg-transparent font-semibold' : ''} />
      <div className="col-span-2 row-start-2 grid grid-cols-2 gap-2 sm:col-span-2 sm:row-start-auto">
        <BareInput aria-label={`${r.name} ${t.settings.from}`} type="date" value={r.start} onChange={(e) => editRange(key, i, { start: e.target.value })} />
        <BareInput aria-label={`${r.name} ${t.settings.to}`} type="date" value={r.end} onChange={(e) => editRange(key, i, { end: e.target.value })} />
      </div>
      {key === 'holidays' ? (
        <Button variant="ghost" size="sm" aria-label={`${t.common.delete} ${r.name}`} onClick={() => setC((x) => ({ ...x, holidays: x.holidays.filter((_, j) => j !== i) }))} className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto">
          <Trash2 size={18} />
        </Button>
      ) : (
        <span className="hidden sm:block sm:w-9" />
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-xs">
        <TextInput label={t.settings.yearStart} type="date" value={c.yearStart} onChange={(e) => setC({ ...c, yearStart: e.target.value })} />
      </div>
      <div>
        <h3 className="mb-2 font-semibold">
          {t.settings.quarters} <span className="font-normal text-ink-soft">· {t.settings.teachingWeeks(totalTeachingWeeks(c))}</span>
        </h3>
        <ul className="flex flex-col gap-2">{c.quarters.map((r, i) => rangeRow('quarters', r, i))}</ul>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{t.settings.holidays}</h3>
        <ul className="flex flex-col gap-2">{c.holidays.map((r, i) => rangeRow('holidays', r, i))}</ul>
        <Button size="sm" variant="ghost" icon={<Plus size={16} />} className="mt-2" onClick={() => setC((x) => ({ ...x, holidays: [...x.holidays, { name: '', start: x.yearStart, end: x.yearStart }] }))}>
          {t.settings.addHoliday}
        </Button>
      </div>
      {problems.length > 0 && <Banner tone="warn">{problems.map((p) => <div key={p.message}>{p.message}</div>)}</Banner>}
      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={!dirty || problems.length > 0}
          onClick={() => onSave({ ...c, holidays: [...c.holidays].filter((h) => h.name.trim()).sort((a, b) => a.start.localeCompare(b.start)) })}
        >
          {t.common.save}
        </Button>
      </div>
    </div>
  );
}
