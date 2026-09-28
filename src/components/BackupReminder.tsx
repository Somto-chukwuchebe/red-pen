import { syncState } from '../db/backup';
import { useLocal, useSettings } from '../db/hooks';
import { useT } from '../i18n';
import { daysAgo } from '../lib/format';
import { Banner, LinkButton } from './ui';

/**
 * Nudges you to back up when there are changes older than your reminder setting —
 * or, once you sync between devices, to sync when this device has had unsent changes for a day.
 */
export function BackupReminder() {
  const t = useT();
  const settings = useSettings();
  const lastExport = useLocal<number>('lastExportAt');
  const lastChange = useLocal<number>('lastChangeAt');
  const lastSent = useLocal<number>('lastSentAt');
  const lastImport = useLocal<{ at: number; fromDevice: string }>('lastImport');
  if (!settings || lastChange === undefined) return null; // nothing changed since setup

  // You sync between devices: remind about that (sending also counts as a backup).
  if (syncState(lastChange, lastSent, lastImport?.at) === 'unsent') {
    const lastSync = Math.max(lastSent ?? 0, lastImport?.at ?? 0);
    if (daysAgo(lastSync) < 1) return null;
    return (
      <Banner
        tone="warn"
        action={
          <LinkButton to="/data" size="sm">
            {t.backupReminder.syncAction}
          </LinkButton>
        }
      >
        {t.backupReminder.syncOld(lastImport?.fromDevice ?? t.backupReminder.otherDevice, daysAgo(lastSync))}
      </Banner>
    );
  }

  const limit = settings.backupReminderDays;
  const unsavedChanges = !lastExport || lastChange > lastExport;
  const stale = !lastExport ? daysAgo(lastChange) >= 1 : daysAgo(lastExport) >= limit;
  if (!unsavedChanges || !stale) return null;

  return (
    <Banner
      tone="warn"
      action={
        <LinkButton to="/data" size="sm">
          {t.backupReminder.action}
        </LinkButton>
      }
    >
      {lastExport ? t.backupReminder.old(daysAgo(lastExport)) : t.backupReminder.never}
    </Banner>
  );
}
