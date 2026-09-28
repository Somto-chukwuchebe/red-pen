// First-run setup for a new teacher on a new device.
// Your own existing devices never see this: it only appears when a device has no data yet.

import { ArrowLeft, ArrowRight, FileUp, Plus, Trash2, Users, UserPlus } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { CalendarFields, cleanCalendar, type CalendarValue } from '../components/CalendarFields';
import { Logo } from '../components/Logo';
import { BareInput, BareSelect, Banner, Button, Card, GroupDot, Segmented, TextInput, cx } from '../components/ui';
import { applyImport, BackupError, parseBackup, type BackupFile } from '../db/backup';
import { ensureDeviceName, setupNewDevice } from '../db/seed';
import type { GroupType } from '../domain/types';
import { dictionaries, LanguageProvider, useT } from '../i18n';
import { checkCalendar } from '../lib/calendar';
import { dateTime } from '../lib/format';
import { RU_NAMES, SEED_GROUPS, SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START, type SeedGroup } from '../seed/groups';

const PALETTE = ['#0E7C86', '#2F6FB5', '#6B4FB3', '#A8458A', '#9A5B24', '#3D7A38', '#4F5D6E', '#D19A00', '#D2742A', '#35A3AC', '#6495D6', '#9780D4'];

type Start = 'example' | 'own' | 'restore';
type Step = 'welcome' | 'groups' | 'year';

interface Row {
  keep: boolean;
  group: SeedGroup;
}

export function SetupWizard() {
  const [lang, setLang] = useState<'en' | 'ru'>(() => (navigator.language?.startsWith('ru') ? 'ru' : 'en'));
  return (
    <LanguageProvider lang={lang}>
      <Wizard lang={lang} setLang={setLang} />
    </LanguageProvider>
  );
}

/** Swap the example term and holiday names between English and Russian (names you typed are left alone). */
function localiseCalendar(c: CalendarValue, lang: 'en' | 'ru'): CalendarValue {
  const toRu = new Map(Object.entries(RU_NAMES));
  const toEn = new Map(Object.entries(RU_NAMES).map(([en, ru]) => [ru, en]));
  const map = lang === 'ru' ? toRu : toEn;
  const rename = (r: { name: string }) => ({ ...r, name: map.get(r.name) ?? r.name });
  return { ...c, quarters: c.quarters.map(rename) as CalendarValue['quarters'], holidays: c.holidays.map(rename) as CalendarValue['holidays'] };
}

function blankGroup(i: number): SeedGroup {
  return {
    id: `g-${crypto.randomUUID().slice(0, 8)}`,
    name: '',
    type: 'primary',
    grade: null,
    curriculumKey: '',
    lessonsPerWeek: 1,
    lessonLengthMin: 40,
    textbook: '',
    studentCount: 15,
    colour: PALETTE[i % PALETTE.length],
    notes: '',
    archived: false,
    order: i + 1,
    tracksStudents: true,
  };
}

function Wizard({ lang, setLang }: { lang: 'en' | 'ru'; setLang: (l: 'en' | 'ru') => void }) {
  const t = useT();
  const s = t.setup;
  const [step, setStep] = useState<Step>('welcome');
  const [teacherName, setTeacherName] = useState('');
  const [subject, setSubject] = useState(dictionaries[lang].setup.defaultSubject);
  const [start, setStart] = useState<Start>('example');
  const [examples, setExamples] = useState<Row[]>(() => SEED_GROUPS.map((g) => ({ keep: true, group: { ...g } })));
  const [own, setOwn] = useState<SeedGroup[]>([blankGroup(0)]);
  const [calendar, setCalendar] = useState<CalendarValue>(() => localiseCalendar({ yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS }, lang));
  const [busy, setBusy] = useState(false);

  const chosenGroups = start === 'example' ? examples.filter((r) => r.keep && r.group.name.trim()).map((r) => r.group) : own.filter((g) => g.name.trim());

  async function finish() {
    setBusy(true);
    try {
      await setupNewDevice({
        subject,
        language: lang,
        teacherName,
        groups: chosenGroups.map((g) => ({ ...g, name: g.name.trim() })),
        calendar: cleanCalendar(calendar),
      });
      // The app notices the new settings and opens Today.
    } finally {
      setBusy(false);
    }
  }

  const steps: Step[] = ['welcome', 'groups', 'year'];
  const stepNo = steps.indexOf(step) + 1;

  return (
    <div className="min-h-dvh safe-top safe-x">
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 pb-16 sm:px-6 sm:py-10">
        <header className="flex items-center gap-3">
          <Logo size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">{s.title}</h1>
            {start !== 'restore' && <p className="text-ink-soft">{s.stepOf(stepNo, 3)}</p>}
          </div>
          <Segmented label={t.settings.language} value={lang} onChange={(v) => {
              setLang(v);
              if (subject === dictionaries[lang].setup.defaultSubject) setSubject(dictionaries[v].setup.defaultSubject);
              setCalendar((c) => localiseCalendar(c, v));
            }} options={[{ value: 'en', label: 'EN' }, { value: 'ru', label: 'RU' }]} />
        </header>

        {step === 'welcome' && (
          <>
            <p className="text-lg">{s.intro}</p>
            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label={`${s.yourName} (${t.common.optional})`} value={teacherName} onChange={(e) => setTeacherName(e.target.value)} autoComplete="name" />
                <div>
                  <TextInput label={s.subject} value={subject} onChange={(e) => setSubject(e.target.value)} list="subjects" />
                  <datalist id="subjects">
                    {s.subjects.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="mt-4">
                <Banner tone="info">{s.ownCurriculumLater}</Banner>
              </div>
            </Card>
            <Banner tone="info">{s.privacy}</Banner>
            <Nav next={() => setStep('groups')} />
          </>
        )}

        {step === 'groups' && (
          <>
            <h2 className="text-2xl font-semibold">{s.groupsTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Choice active={start === 'example'} onClick={() => setStart('example')} icon={<Users />} title={s.startExample} text={s.startExampleHint} />
              <Choice active={start === 'own'} onClick={() => setStart('own')} icon={<UserPlus />} title={s.startOwn} text={s.startOwnHint} />
              <Choice active={start === 'restore'} onClick={() => setStart('restore')} icon={<FileUp />} title={s.startRestore} text={s.startRestoreHint} />
            </div>

            {start === 'example' && (
              <Card>
                <p className="mb-3 text-ink-soft">{s.exampleIntro}</p>
                <ul className="flex flex-col gap-1.5">
                  {examples.map((r, i) => (
                    <li key={r.group.id} className={cx('flex items-center gap-3', !r.keep && 'opacity-50')}>
                      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--pen)]" aria-label={`${s.keep} ${r.group.name}`} checked={r.keep} onChange={(e) => setExamples((xs) => xs.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} />
                      <GroupDot colour={r.group.colour} />
                      <BareInput aria-label={t.groups.fields.name} value={r.group.name} onChange={(e) => setExamples((xs) => xs.map((x, j) => (j === i ? { ...x, group: { ...x.group, name: e.target.value } } : x)))} className="max-w-40" />
                      <span className="truncate text-sm text-ink-soft">
                        {t.groupTypes[r.group.type]} · {t.groups.perWeek(r.group.lessonsPerWeek)} · {r.group.lessonLengthMin} {t.common.minutes}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink-soft">{s.editLater}</p>
              </Card>
            )}

            {start === 'own' && <OwnGroups groups={own} setGroups={setOwn} />}
            {start === 'restore' && <Restore />}

            {start !== 'restore' && (
              <>
                {chosenGroups.length === 0 && <Banner tone="info">{s.noGroupsYet}</Banner>}
                <Nav back={() => setStep('welcome')} next={() => setStep('year')} />
              </>
            )}
            {start === 'restore' && <Nav back={() => setStep('welcome')} />}
          </>
        )}

        {step === 'year' && (
          <>
            <h2 className="text-2xl font-semibold">{s.yearTitle}</h2>
            <p className="text-ink-soft">{s.yearIntro}</p>
            <Card>
              <CalendarFields value={calendar} onChange={setCalendar} />
            </Card>
            <Nav back={() => setStep('groups')} next={finish} nextLabel={s.finish(chosenGroups.length)} disabled={busy || checkCalendar(calendar).length > 0} />
          </>
        )}
      </main>
    </div>
  );
}

function Nav({ back, next, nextLabel, disabled }: { back?: () => void; next?: () => void; nextLabel?: string; disabled?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3">
      {back ? (
        <Button onClick={back} icon={<ArrowLeft size={18} />}>
          {t.common.back}
        </Button>
      ) : (
        <span />
      )}
      {next && (
        <Button variant="primary" size="lg" onClick={next} disabled={disabled}>
          {nextLabel ?? t.setup.next} {!nextLabel && <ArrowRight size={18} />}
        </Button>
      )}
    </div>
  );
}

function Choice({ active, onClick, icon, title, text }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cx('flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors', active ? 'border-pen bg-pen-soft' : 'border-line bg-card hover:bg-sunk')}>
      <span className="text-pen">{icon}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-ink-soft">{text}</span>
    </button>
  );
}

function OwnGroups({ groups, setGroups }: { groups: SeedGroup[]; setGroups: (g: SeedGroup[]) => void }) {
  const t = useT();
  const set = (i: number, p: Partial<SeedGroup>) => setGroups(groups.map((g, j) => (j === i ? { ...g, ...p } : g)));
  return (
    <Card>
      <p className="mb-3 text-ink-soft">{t.setup.ownIntro}</p>
      <ul className="flex flex-col gap-3">
        {groups.map((g, i) => (
          <li key={g.id} className="grid grid-cols-2 gap-2 rounded-xl bg-sunk p-2 sm:grid-cols-[1.3fr_1.3fr_1fr_1fr_auto] sm:items-end sm:bg-transparent sm:p-0">
            <label className="col-span-2 flex flex-col gap-1 text-sm font-medium sm:col-span-1">
              {t.groups.fields.name}
              <BareInput value={g.name} placeholder="5a" onChange={(e) => set(i, { name: e.target.value })} autoFocus={i === groups.length - 1 && i > 0} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t.groups.fields.type}
              <BareSelect value={g.type} onChange={(e) => set(i, { type: e.target.value as GroupType })}>
                {(['kindergarten', 'primary', 'secondary'] as const).map((ty) => (
                  <option key={ty} value={ty}>
                    {t.groupTypes[ty]}
                  </option>
                ))}
              </BareSelect>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t.setup.perWeekShort}
              <BareInput type="number" inputMode="numeric" min={0} max={10} value={g.lessonsPerWeek} onChange={(e) => set(i, { lessonsPerWeek: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t.setup.lengthShort}
              <BareInput type="number" inputMode="numeric" min={5} max={120} step={5} value={g.lessonLengthMin} onChange={(e) => set(i, { lessonLengthMin: Math.max(5, Number(e.target.value) || 40) })} />
            </label>
            <Button variant="ghost" size="sm" aria-label={`${t.common.delete} ${g.name}`} onClick={() => setGroups(groups.filter((_, j) => j !== i))} className="justify-self-end">
              <Trash2 size={18} />
            </Button>
          </li>
        ))}
      </ul>
      <Button className="mt-3" icon={<Plus size={18} />} onClick={() => setGroups([...groups, blankGroup(groups.length)])}>
        {t.groups.add}
      </Button>
    </Card>
  );
}

function Restore() {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<BackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(f?: File) {
    setError(null);
    setFile(null);
    if (!f) return;
    try {
      setFile(parseBackup(await f.text()));
    } catch (e) {
      setError(e instanceof BackupError ? (t.data.errors[e.message] ?? t.errors.generic) : t.errors.generic);
    }
  }

  return (
    <Card>
      <p className="mb-3 text-ink-soft">{t.setup.restoreIntro}</p>
      <input ref={input} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <Button size="lg" icon={<FileUp size={20} />} onClick={() => input.current?.click()}>
        {t.data.chooseFile}
      </Button>
      {error && (
        <div className="mt-3">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}
      {file && (
        <div className="mt-4 flex flex-col gap-3">
          <p>
            {t.data.importFrom(file.deviceName, dateTime(t.locale, file.exportedAt))} · {t.setup.restoreCounts((file.tables.groups ?? []).length, (file.tables.students ?? []).length, (file.tables.logs ?? []).length)}
          </p>
          <div>
            <Button variant="primary" size="lg" onClick={() => applyImport(file, 'replace').then(ensureDeviceName)}>
              {t.setup.restoreButton}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
