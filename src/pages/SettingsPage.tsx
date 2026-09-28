import { RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { allowBadge, badgeSupport, type BadgeSupport } from '../lib/badge';
import { CurriculumImport } from '../components/CurriculumImport';
import { CalendarFields, cleanCalendar, type CalendarValue } from '../components/CalendarFields';
import { useEffect, useState } from 'react';
import { Banner, Button, Select, Card, PageHeader, Segmented, SectionTitle, TextInput, Toggle } from '../components/ui';
import { useToast } from '../components/Toast';
import { useLocal, useSettings } from '../db/hooks';
import { patch, setLocal } from '../db/repo';
import type { Settings } from '../domain/types';
import { useT } from '../i18n';
import { checkCalendar } from '../lib/calendar';
import { DEFAULT_FLAG_RULE } from '../lib/participation';
import { bytes } from '../lib/format';
import { detectPlatform } from '../lib/platform';
import { requestPersistentStorage, storageState, type PersistState } from '../lib/storage';
import { checkForUpdate } from '../lib/update';

export function SettingsPage() {
  const t = useT();
  const toast = useToast();
  const settings = useSettings();
  const [checking, setChecking] = useState(false);
  const checkUpdates = async () => {
    setChecking(true);
    const result = await checkForUpdate();
    setChecking(false);
    toast(result === 'updating' ? t.settings.updating : result === 'latest' ? t.settings.upToDate : t.settings.updateOffline);
  };
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
            <div className="grid gap-4 sm:grid-cols-2">
              <BlurInput label={t.setup.yourName} value={settings.teacherName ?? ''} onSave={(v) => set({ teacherName: v })} />
              <BlurInput label={t.setup.subject} value={settings.subject ?? 'English'} onSave={(v) => v && set({ subject: v })} />
            </div>
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

        <BadgeCard />

        <Card>
          <SectionTitle>{t.settings.year}</SectionTitle>
          <CalendarEditor settings={settings} onSave={(c) => set(c).then(() => toast(t.common.saved))} />
        </Card>

        <Card>
          <SectionTitle>{t.settings.flagsTitle}</SectionTitle>
          <p className="mb-4 text-sm text-ink-soft">{t.settings.flagsHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t.settings.flagLow} value={settings.flagLow ?? DEFAULT_FLAG_RULE.low} onChange={(e) => set({ flagLow: Number(e.target.value) })}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {t.settings.flagLowOption(n, t.rating.levels.slice(0, n).join(', '))}
                </option>
              ))}
            </Select>
            <Select label={t.settings.flagStreak} value={settings.flagStreak ?? DEFAULT_FLAG_RULE.streak} onChange={(e) => set({ flagStreak: Number(e.target.value) })}>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {t.settings.flagStreakOption(n)}
                </option>
              ))}
            </Select>
          </div>
          <p className="mt-3 text-sm font-medium">{t.settings.flagSummary(settings.flagLow ?? DEFAULT_FLAG_RULE.low, settings.flagStreak ?? DEFAULT_FLAG_RULE.streak)}</p>
        </Card>

        <Card>
          <SectionTitle>{t.settings.backup}</SectionTitle>
          <div className="max-w-xs">
            <TextInput label={t.settings.reminderDays} type="number" inputMode="numeric" min={1} max={60} value={settings.backupReminderDays} onChange={(e) => set({ backupReminderDays: Math.max(1, Number(e.target.value) || 7) })} />
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.settings.curriculum}</SectionTitle>
          <CurriculumImport />
        </Card>

        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <span>
            {t.appName} · {t.settings.version(__APP_VERSION__)} · {t.settings.builtOn(new Date(__BUILD_DATE__).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' }))}
          </span>
          <Button size="sm" icon={<RefreshCw size={16} />} disabled={checking} onClick={checkUpdates}>
            {t.settings.checkUpdates}
          </Button>
        </div>
      </div>
    </>
  );
}

/** A text field that saves when you leave it. */
function BlurInput({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    setV(value);
  }, [value]);
  return <TextInput label={label} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v.trim() !== value && onSave(v.trim())} />;
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

function CalendarEditor({ settings, onSave }: { settings: Settings; onSave: (c: CalendarValue) => void }) {
  const t = useT();
  const saved = { yearStart: settings.yearStart, quarters: settings.quarters, holidays: settings.holidays };
  const [c, setC] = useState<CalendarValue>(saved);
  useEffect(() => {
    setC({ yearStart: settings.yearStart, quarters: settings.quarters, holidays: settings.holidays });
  }, [settings.yearStart, settings.quarters, settings.holidays]);
  const dirty = JSON.stringify(c) !== JSON.stringify(saved);
  return (
    <div className="flex flex-col gap-5">
      <CalendarFields value={c} onChange={setC} />
      <div className="flex justify-end">
        <Button variant="primary" disabled={!dirty || checkCalendar(c).length > 0} onClick={() => onSave(cleanCalendar(c))}>
          {t.common.save}
        </Button>
      </div>
    </div>
  );
}

/** The number on the app icon (this device only: each device asks its own permission). */
function BadgeCard() {
  const t = useT();
  const on = useLocal<boolean>('badge') ?? false;
  const [support, setSupport] = useState<BadgeSupport>(() => badgeSupport());

  async function toggle(next: boolean) {
    if (!next) return setLocal('badge', false);
    const result = await allowBadge();
    setSupport(result);
    if (result === 'yes') await setLocal('badge', true);
  }

  const problem = support === 'yes' || support === 'needs-permission' ? null : t.settings.badgeProblem[support];
  return (
    <Card>
      <SectionTitle>{t.settings.badgeTitle}</SectionTitle>
      <p className="mb-4 text-sm text-ink-soft">{t.settings.badgeHint}</p>
      {problem ? (
        <Banner tone="info">{problem}</Banner>
      ) : (
        <Toggle label={t.settings.badgeToggle} hint={support === 'needs-permission' && !on ? t.settings.badgePermission : undefined} checked={on && support === 'yes'} onChange={(v) => void toggle(v)} />
      )}
    </Card>
  );
}
