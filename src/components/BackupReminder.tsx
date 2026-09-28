import { useLocal, useSettings } from '../db/hooks';
import { useT } from '../i18n';
import { daysAgo } from '../lib/format';
import { Banner, LinkButton } from './ui';

/** Nudges you to back up when there are changes older than your reminder setting. */
export function BackupReminder() {
  const t = useT();
  const settings = useSettings();
  const lastExport = useLocal<number>('lastExportAt');
  const lastChange = useLocal<number>('lastChangeAt');
  if (!settings || lastChange === undefined) return null; // nothing changed since setup

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
