import { useLiveQuery } from 'dexie-react-hooks';
import { ExternalLink, Monitor, Paperclip, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import { BareInput, BareSelect, Button, Dialog, EmptyState, Field, PageHeader, Segmented, TextArea, TextInput, Toggle, cx } from '../components/ui';
import { db } from '../db/db';
import { useGroups, useSettings } from '../db/hooks';
import { newId, remove, save, touchLocal } from '../db/repo';
import type { Game, Resource, StoredFile } from '../domain/types';
import { useT } from '../i18n';
import { parseLevels } from '../import/text';
import { dayMonth } from '../lib/format';
import { gameUsage } from '../lib/usage';
import { STARTER_COUNT, starterGames } from '../seed/starterGames';

type Tab = 'games' | 'resources';
export const SKILLS = ['speaking', 'listening', 'vocabulary', 'grammar', 'reading', 'writing', 'movement', 'review'] as const;
const LEVELS = ['KG', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

export function LibraryPage() {
  const t = useT();
  const toast = useToast();
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'games';
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [energy, setEnergy] = useState('');
  const [maxPrep, setMaxPrep] = useState('');
  const [noProjector, setNoProjector] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [editRes, setEditRes] = useState<Resource | null>(null);
  const groups = useGroups();
  const games = useLiveQuery(() => db.games.toArray(), []);
  const resources = useLiveQuery(() => db.resources.toArray(), []);
  const logs = useLiveQuery(() => db.logs.toArray(), []);
  const usage = useMemo(() => (logs ? gameUsage(logs, groupId || undefined) : new Map()), [logs, groupId]);

  if (!games || !resources || !groups || !settings) return null;
  const hasStarters = games.some((g) => g.id.startsWith('starter-'));
  const text = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const matchesCommon = (x: { levelTags: string[]; skills: string[]; needsProjector: boolean }) =>
    (!level || !x.levelTags.length || x.levelTags.includes(level)) && (!skill || x.skills.includes(skill)) && (!noProjector || !x.needsProjector);

  const shownGames = games
    .filter((g) => (!q || text(g.name) || text(g.howItWorks) || text(g.prep)) && matchesCommon(g))
    .filter((g) => !energy || g.energy === energy)
    .filter((g) => !maxPrep || (g.prepMinutes ?? (/^(none|нет)$/i.test(g.prep.trim()) ? 0 : 99)) <= Number(maxPrep))
    .sort((a, b) => {
      // With a group chosen, games not used with it for longest come first.
      if (groupId) return (usage.get(a.id)?.last ?? '').localeCompare(usage.get(b.id)?.last ?? '') || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  const shownRes = resources.filter((r) => (!q || text(r.name) || text(r.useFor)) && matchesCommon(r)).sort((a, b) => a.name.localeCompare(b.name));

  async function addStarters() {
    const existing = new Set(games!.map((g) => g.id));
    const fresh = starterGames(settings!.language).filter((g) => !existing.has(g.id));
    await db.games.bulkPut(fresh);
    await touchLocal();
    toast(t.library.startersAdded(fresh.length));
  }

  const blankGame = (): Game => ({ id: '', name: '', levels: '', levelTags: [], howItWorks: '', prep: '', skills: [], energy: '', prepMinutes: null, needsProjector: false, link: '', fileId: null, custom: true, updatedAt: 0 });
  const blankRes = (): Resource => ({ id: '', name: '', useFor: '', levels: '', levelTags: [], link: '', skills: [], needsProjector: false, fileId: null, custom: true, updatedAt: 0 });

  return (
    <>
      <PageHeader
        title={t.library.title}
        subtitle={t.library.counts(games.length, resources.length)}
        actions={
          <>
            {!hasStarters && (
              <Button icon={<Sparkles size={18} />} onClick={addStarters}>
                {t.library.addStarters(STARTER_COUNT)}
              </Button>
            )}
            <Button variant="primary" icon={<Plus size={18} />} onClick={() => (tab === 'games' ? setEditGame(blankGame()) : setEditRes(blankRes()))}>
              {tab === 'games' ? t.library.addGame : t.library.addResource}
            </Button>
          </>
        }
      />
      <div className="mb-4">
        <Segmented<Tab> label={t.library.title} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={[{ value: 'games', label: t.library.games }, { value: 'resources', label: t.library.resources }]} />
      </div>

      {/* Search and filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-card p-3">
        <label className="relative block">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" aria-hidden />
          <BareInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.library.search} aria-label={t.library.search} className="pl-10" type="search" />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <BareSelect aria-label={t.library.level} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">{t.library.anyLevel}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === 'KG' ? t.library.kg : t.library.grade(l)}
              </option>
            ))}
          </BareSelect>
          <BareSelect aria-label={t.library.skill} value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">{t.library.anySkill}</option>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {t.library.skills[s]}
              </option>
            ))}
          </BareSelect>
          {tab === 'games' && (
            <>
              <BareSelect aria-label={t.library.energy} value={energy} onChange={(e) => setEnergy(e.target.value)}>
                <option value="">{t.library.anyEnergy}</option>
                {(['calm', 'medium', 'lively'] as const).map((e) => (
                  <option key={e} value={e}>
                    {t.library.energies[e]}
                  </option>
                ))}
              </BareSelect>
              <BareSelect aria-label={t.library.prep} value={maxPrep} onChange={(e) => setMaxPrep(e.target.value)}>
                <option value="">{t.library.anyPrep}</option>
                <option value="0">{t.library.noPrep}</option>
                <option value="5">{t.library.prepUpTo(5)}</option>
                <option value="15">{t.library.prepUpTo(15)}</option>
              </BareSelect>
              <BareSelect aria-label={t.library.usedWith} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">{t.library.allGroups}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {t.library.usedWithGroup(g.name)}
                  </option>
                ))}
              </BareSelect>
            </>
          )}
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--pen)]" checked={noProjector} onChange={(e) => setNoProjector(e.target.checked)} />
            {t.library.noProjector}
          </label>
        </div>
      </div>

      {tab === 'games' ? (
        games.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={36} />}
            title={t.library.emptyGames}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={addStarters}>
                  {t.library.addStarters(STARTER_COUNT)}
                </Button>
                <Button onClick={() => setEditGame(blankGame())}>{t.library.addGame}</Button>
              </div>
            }
          >
            {t.library.emptyGamesHint}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shownGames.map((g) => {
              const u = usage.get(g.id);
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => setEditGame(g)} className="flex h-full w-full flex-col gap-1.5 rounded-2xl border border-line bg-card p-4 text-left hover:shadow-md">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-serif text-lg font-semibold">{g.name}</span>
                      {g.levels && <span className="shrink-0 rounded-full bg-sunk px-2 py-0.5 text-xs font-medium">{g.levels}</span>}
                    </span>
                    <span className="line-clamp-3 text-sm text-ink-soft">{g.howItWorks}</span>
                    <span className="mt-auto flex flex-wrap gap-1.5 pt-1 text-xs">
                      {g.energy && <span className={cx('rounded-full px-2 py-0.5', g.energy === 'lively' ? 'bg-pen-soft' : 'bg-sunk')}>{t.library.energies[g.energy]}</span>}
                      {g.prep && <span className="rounded-full bg-sunk px-2 py-0.5">{t.library.prepLabel}: {g.prep}</span>}
                      {g.needsProjector && <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5"><Monitor size={12} aria-hidden /> {t.library.projector}</span>}
                      {(g.link || g.fileId) && <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5"><Paperclip size={12} aria-hidden /></span>}
                    </span>
                    <span className={cx('text-xs', u ? 'text-ink-soft' : 'text-ink-soft/70')}>
                      {u ? t.library.used(u.count, dayMonth(t.locale, u.last)) : groupId ? t.library.neverWithGroup : t.library.neverUsed}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : resources.length === 0 ? (
        <EmptyState title={t.library.emptyResources} action={<Button variant="primary" onClick={() => setEditRes(blankRes())}>{t.library.addResource}</Button>}>
          {t.library.emptyResourcesHint}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shownRes.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setEditRes(r)} className="flex h-full w-full flex-col gap-1.5 rounded-2xl border border-line bg-card p-4 text-left hover:shadow-md">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-serif text-lg font-semibold">{r.name}</span>
                  {r.levels && <span className="shrink-0 rounded-full bg-sunk px-2 py-0.5 text-xs font-medium">{r.levels}</span>}
                </span>
                <span className="text-sm text-ink-soft">{r.useFor}</span>
                {r.link && <span className="mt-auto truncate pt-1 text-xs text-pen">{r.link.replace(/^https?:\/\//, '')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {(tab === 'games' ? shownGames.length === 0 && games.length > 0 : shownRes.length === 0 && resources.length > 0) && <p className="mt-4 text-ink-soft">{t.library.noMatches}</p>}

      {editGame && <GameEditor game={editGame} onClose={() => setEditGame(null)} usageText={usage.get(editGame.id) ? t.library.used(usage.get(editGame.id)!.count, dayMonth(t.locale, usage.get(editGame.id)!.last)) : ''} />}
      {editRes && <ResourceEditor resource={editRes} onClose={() => setEditRes(null)} />}
    </>
  );
}

// ─── Editors ─────────────────────────────────────────────────────────────

function SkillPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useT();
  return (
    <Field label={t.library.skill}>
      <div className="flex flex-wrap gap-1.5">
        {SKILLS.map((s) => {
          const on = value.includes(s);
          return (
            <button key={s} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== s) : [...value, s])} className={cx('min-h-9 rounded-full border px-3 text-sm', on ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : 'border-line bg-paper')}>
              {t.library.skills[s]}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Link or attached file (stored on this device, included in backups). */
function Attachment({ link, fileId, onLink, onFile }: { link: string; fileId: string | null; onLink: (v: string) => void; onFile: (id: string | null) => void }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const file = useLiveQuery(async () => (fileId ? await db.files.get(fileId) : undefined), [fileId]);
  async function attach(f?: File) {
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) return alert(t.library.fileTooBig);
    const id = newId('file');
    await save<StoredFile>('files', { id, name: f.name, type: f.type || 'application/octet-stream', size: f.size, blob: f });
    onFile(id);
  }
  const open = () => {
    if (!file) return;
    const url = URL.createObjectURL(file.blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  return (
    <div className="flex flex-col gap-3">
      <TextInput label={t.library.link} type="url" inputMode="url" placeholder="https://…" value={link} onChange={(e) => onLink(e.target.value)} />
      <Field label={t.library.file} hint={t.library.fileHint}>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" className="sr-only" onChange={(e) => attach(e.target.files?.[0])} />
          {file ? (
            <>
              <Button size="sm" icon={<Paperclip size={14} />} onClick={open}>
                {file.name}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onFile(null)}>
                {t.library.removeFile}
              </Button>
            </>
          ) : (
            <Button size="sm" icon={<Paperclip size={14} />} onClick={() => input.current?.click()}>
              {t.library.attach}
            </Button>
          )}
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-pen underline">
              {t.library.openLink} <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>
      </Field>
    </div>
  );
}

function GameEditor({ game, onClose, usageText }: { game: Game; onClose: () => void; usageText: string }) {
  const t = useT();
  const toast = useToast();
  const [g, setG] = useState(game);
  const set = <K extends keyof Game>(k: K, v: Game[K]) => setG((x) => ({ ...x, [k]: v }));
  // Cancelling removes a file attached in this session.
  const close = async () => {
    if (g.fileId && g.fileId !== game.fileId) await remove('files', g.fileId);
    onClose();
  };
  async function onSave() {
    if (!g.name.trim()) return;
    if (game.fileId && game.fileId !== g.fileId) await remove('files', game.fileId);
    await save<Game>('games', { ...g, id: g.id || newId('game'), name: g.name.trim(), levelTags: g.levels.trim() ? parseLevels(g.levels.trim()) : [] });
    toast(t.common.saved);
    onClose();
  }
  async function onDelete() {
    if (!confirm(t.library.confirmDelete(game.name))) return;
    await remove('games', game.id);
    if (game.fileId) await remove('files', game.fileId);
    onClose();
  }
  return (
    <Dialog
      open
      wide
      onClose={close}
      title={game.id ? game.name : t.library.addGame}
      footer={
        <>
          {game.id && (
            <Button variant="quiet-danger" className="mr-auto" icon={<Trash2 size={16} />} onClick={onDelete}>
              {t.common.delete}
            </Button>
          )}
          <Button onClick={close}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave} disabled={!g.name.trim()}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label={t.common.name} value={g.name} onChange={(e) => set('name', e.target.value)} autoFocus={!game.id} />
        <TextInput label={t.library.levelsLabel} hint={t.library.levelsHint} value={g.levels} onChange={(e) => set('levels', e.target.value)} placeholder="KG–4" />
        <div className="sm:col-span-2">
          <TextArea label={t.library.how} rows={4} value={g.howItWorks} onChange={(e) => set('howItWorks', e.target.value)} />
        </div>
        <TextInput label={t.library.prepLabel} value={g.prep} onChange={(e) => set('prep', e.target.value)} placeholder={t.library.prepPlaceholder} />
        <TextInput label={t.library.prepMinutes} type="number" inputMode="numeric" min={0} value={g.prepMinutes ?? ''} onChange={(e) => set('prepMinutes', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} />
        <div className="sm:col-span-2">
          <SkillPicker value={g.skills} onChange={(v) => set('skills', v)} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t.library.energy}</p>
          <Segmented label={t.library.energy} value={g.energy || 'none'} onChange={(v) => set('energy', v === 'none' ? '' : (v as Game['energy']))} options={[{ value: 'none', label: '—' }, ...(['calm', 'medium', 'lively'] as const).map((e) => ({ value: e, label: t.library.energies[e] }))]} />
        </div>
        <Toggle label={t.library.needsProjector} checked={g.needsProjector} onChange={(v) => set('needsProjector', v)} />
        <div className="sm:col-span-2">
          <Attachment link={g.link} fileId={g.fileId} onLink={(v) => set('link', v)} onFile={(id) => set('fileId', id)} />
        </div>
        {usageText && <p className="text-sm text-ink-soft sm:col-span-2">{usageText}</p>}
      </div>
    </Dialog>
  );
}

function ResourceEditor({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [r, setR] = useState(resource);
  const set = <K extends keyof Resource>(k: K, v: Resource[K]) => setR((x) => ({ ...x, [k]: v }));
  const close = async () => {
    if (r.fileId && r.fileId !== resource.fileId) await remove('files', r.fileId);
    onClose();
  };
  async function onSave() {
    if (!r.name.trim()) return;
    if (resource.fileId && resource.fileId !== r.fileId) await remove('files', resource.fileId);
    await save<Resource>('resources', { ...r, id: r.id || newId('res'), name: r.name.trim(), levelTags: r.levels.trim() ? parseLevels(r.levels.trim()) : [] });
    toast(t.common.saved);
    onClose();
  }
  return (
    <Dialog
      open
      wide
      onClose={close}
      title={resource.id ? resource.name : t.library.addResource}
      footer={
        <>
          {resource.id && (
            <Button
              variant="quiet-danger"
              className="mr-auto"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                if (!confirm(t.library.confirmDelete(resource.name))) return;
                await remove('resources', resource.id);
                if (resource.fileId) await remove('files', resource.fileId);
                onClose();
              }}
            >
              {t.common.delete}
            </Button>
          )}
          <Button onClick={close}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={onSave} disabled={!r.name.trim()}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label={t.common.name} value={r.name} onChange={(e) => set('name', e.target.value)} autoFocus={!resource.id} />
        <TextInput label={t.library.levelsLabel} hint={t.library.levelsHint} value={r.levels} onChange={(e) => set('levels', e.target.value)} placeholder="2–8" />
        <div className="sm:col-span-2">
          <TextArea label={t.library.useFor} rows={3} value={r.useFor} onChange={(e) => set('useFor', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <SkillPicker value={r.skills} onChange={(v) => set('skills', v)} />
        </div>
        <Toggle label={t.library.needsProjector} checked={r.needsProjector} onChange={(v) => set('needsProjector', v)} />
        <div className="sm:col-span-2">
          <Attachment link={r.link} fileId={r.fileId} onLink={(v) => set('link', v)} onFile={(id) => set('fileId', id)} />
        </div>
      </div>
    </Dialog>
  );
}
