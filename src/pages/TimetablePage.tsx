import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader, Segmented, Select, Toggle } from '../components/ui';
import { db } from '../db/db';
import { useGroups, useScheduleData, useSettings } from '../db/hooks';
import { patch } from '../db/repo';
import type { Settings, Weekday } from '../domain/types';
import { useT } from '../i18n';
import { todayISO } from '../lib/dates';
import { dayMonth } from '../lib/format';
import { versionFor } from '../lib/schedule';
import { Changes } from './timetable/Changes';
import { FastEntry } from './timetable/FastEntry';
import { PasteImport } from './timetable/PasteImport';
import { Versions } from './timetable/Versions';
import { WeekGrid } from './timetable/WeekGrid';

type Tab = 'grid' | 'fast' | 'paste' | 'versions' | 'changes';

export function TimetablePage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'grid';
  const setTab = (v: Tab) => setParams({ tab: v }, { replace: true });

  const settings = useSettings();
  const data = useScheduleData();
  const groups = useGroups();
  const versions = useLiveQuery(() => db.timetableVersions.toArray(), []);
  const [versionId, setVersionId] = useState<string>('');

  useEffect(() => {
    if (versions?.length && !versions.some((v) => v.id === versionId)) {
      setVersionId((versionFor(versions, todayISO()) ?? versions[0]).id);
    }
  }, [versions, versionId]);

  if (!settings || !data || !groups || !versions || !versionId) return null;
  const version = versions.find((v) => v.id === versionId)!;
  const slots = data.slots.filter((s) => s.timetableVersionId === versionId);
  const weekdays: Weekday[] = settings.showSaturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];

  const versionPicker = versions.length > 1 && tab !== 'versions' && tab !== 'changes' && (
    <div className="max-w-sm">
      <Select label={t.timetable.version} value={versionId} onChange={(e) => setVersionId(e.target.value)}>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} ({t.timetable.effective(dayMonth(t.locale, v.effectiveFrom), v.effectiveTo && dayMonth(t.locale, v.effectiveTo))})
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <>
      <PageHeader title={t.timetable.title} subtitle={`${version.name} · ${t.common.lessons(slots.length)}`} />
      <div className="mb-5">
        <Segmented<Tab>
          label={t.timetable.title}
          value={tab}
          onChange={setTab}
          options={(['grid', 'fast', 'paste', 'versions', 'changes'] as Tab[]).map((v) => ({ value: v, label: t.timetable.tabs[v] }))}
        />
      </div>
      <div className="flex flex-col gap-4">
        {versionPicker}
        {tab === 'grid' && (
          <>
            <WeekGrid versionId={versionId} slots={slots} groups={groups} weekdays={weekdays} />
            <div className="max-w-sm">
              <Toggle label={t.timetable.showSaturday} checked={settings.showSaturday} onChange={(v) => patch<Settings>('settings', settings.id, { showSaturday: v })} />
            </div>
          </>
        )}
        {tab === 'fast' && <FastEntry versionId={versionId} slots={slots} groups={groups} weekdays={weekdays} />}
        {tab === 'paste' && <PasteImport versionId={versionId} slots={slots} groups={groups} onDone={() => setTab('grid')} />}
        {tab === 'versions' && <Versions versions={versions} slots={data.slots} selectedId={versionId} onSelect={(id) => { setVersionId(id); setTab('grid'); }} />}
        {tab === 'changes' && <Changes data={data} groups={groups} />}
      </div>
    </>
  );
}
