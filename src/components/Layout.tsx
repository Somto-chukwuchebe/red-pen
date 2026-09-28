import { CalendarDays, Download, House, LibraryBig, Menu, Settings, Share2, Users } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useT } from '../i18n';
import { Logo } from './Logo';
import { cx } from './ui';

interface Item {
  to: string;
  label: string;
  icon: ReactNode;
}

export function Layout() {
  const t = useT();
  const { pathname } = useLocation();
  // Each page opens at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const main: Item[] = [
    { to: '/today', label: t.nav.today, icon: <House size={22} /> },
    { to: '/timetable', label: t.nav.timetable, icon: <CalendarDays size={22} /> },
    { to: '/groups', label: t.nav.groups, icon: <Users size={22} /> },
    { to: '/curriculum', label: t.nav.curriculum, icon: <LibraryBig size={22} /> },
  ];
  const extra: Item[] = [
    { to: '/data', label: t.nav.data, icon: <Share2 size={22} /> },
    { to: '/settings', label: t.nav.settings, icon: <Settings size={22} /> },
    { to: '/install', label: t.nav.install, icon: <Download size={22} /> },
  ];
  const moreActive = ['/more', ...extra.map((e) => e.to)].some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        {t.nav.skip}
      </a>

      {/* Sidebar: tablets, laptops, projector */}
      <nav aria-label={t.nav.menu} className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line bg-sunk/60 safe-top md:block">
        <div className="flex flex-col gap-1 p-4">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <Logo size={34} />
          <span className="font-serif text-2xl font-semibold">{t.appName}</span>
        </div>
        {main.map((i) => (
          <SideLink key={i.to} {...i} />
        ))}
        <div className="my-3 border-t border-line" />
        {extra.map((i) => (
          <SideLink key={i.to} {...i} />
        ))}
        </div>
      </nav>

      {/* The notch/home-bar padding lives on this wrapper so it adds to the page margins instead of replacing them. */}
      <div className="min-w-0 flex-1 safe-top safe-x">
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 sm:px-6 md:pt-8 md:pb-12 lg:px-10">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar: phones */}
      <nav aria-label={t.nav.menu} className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur safe-bottom safe-x md:hidden">
        <ul className="grid grid-cols-5">
          {main.map((i) => (
            <li key={i.to}>
              <TabLink {...i} />
            </li>
          ))}
          <li>
            <TabLink to="/more" label={t.nav.more} icon={<Menu size={22} />} forceActive={moreActive} />
          </li>
        </ul>
      </nav>
    </div>
  );
}

function SideLink({ to, label, icon }: Item) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx('flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors', isActive ? 'bg-card text-pen shadow-sm' : 'text-ink-soft hover:bg-card hover:text-ink')
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function TabLink({ to, label, icon, forceActive }: Item & { forceActive?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive || forceActive ? 'text-pen' : 'text-ink-soft')
      }
    >
      {icon}
      <span className="max-w-full truncate px-1">{label}</span>
    </NavLink>
  );
}
