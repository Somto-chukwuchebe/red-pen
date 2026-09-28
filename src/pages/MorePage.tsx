import { CalendarDays, ChevronRight, Dices, Download, Settings, Share2 } from 'lucide-react';
import { Link } from 'react-router';
import { BackupReminder } from '../components/BackupReminder';
import { PageHeader } from '../components/ui';
import { useT } from '../i18n';

/** Phone-only menu for the pages that don't fit in the bottom bar. */
export function MorePage() {
  const t = useT();
  const items = [
    { to: '/library', label: t.nav.library, icon: <Dices aria-hidden /> },
    { to: '/timetable', label: t.nav.timetable, icon: <CalendarDays aria-hidden /> },
    { to: '/data', label: t.nav.data, icon: <Share2 aria-hidden /> },
    { to: '/settings', label: t.nav.settings, icon: <Settings aria-hidden /> },
    { to: '/install', label: t.nav.install, icon: <Download aria-hidden /> },
  ];
  return (
    <>
      <PageHeader title={t.nav.more} />
      <div className="mb-4">
        <BackupReminder />
      </div>
      <ul className="overflow-hidden rounded-2xl border border-line bg-card">
        {items.map((i) => (
          <li key={i.to} className="border-b border-line last:border-0">
            <Link to={i.to} className="flex min-h-14 items-center gap-3 px-4 font-medium hover:bg-sunk">
              <span className="text-pen">{i.icon}</span>
              {i.label}
              <ChevronRight className="ml-auto text-ink-soft" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
