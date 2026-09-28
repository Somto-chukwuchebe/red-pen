import { useEffect } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { useSettings } from './db/hooks';
import { LanguageProvider } from './i18n';
import { CurriculumPage } from './pages/CurriculumPage';
import { DataPage } from './pages/DataPage';
import { ErrorPage } from './pages/ErrorPage';
import { GroupsPage } from './pages/GroupsPage';
import { InstallPage } from './pages/InstallPage';
import { MorePage } from './pages/MorePage';
import { SettingsPage } from './pages/SettingsPage';
import { TimetablePage } from './pages/TimetablePage';
import { TodayPage } from './pages/TodayPage';

// Hash-based addresses (#/today) work on GitHub Pages and inside the future
// native app without any server configuration.
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/today" replace /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'timetable', element: <TimetablePage /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'curriculum', element: <CurriculumPage /> },
      { path: 'curriculum/:key', element: <CurriculumPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'data', element: <DataPage /> },
      { path: 'install', element: <InstallPage /> },
      { path: 'more', element: <MorePage /> },
      { path: '*', element: <Navigate to="/today" replace /> },
    ],
  },
]);

function useTheme(theme: 'system' | 'light' | 'dark' = 'system') {
  useEffect(() => {
    try {
      localStorage.setItem('rp-theme', theme);
    } catch {
      /* private mode */
    }
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#16181D' : '#FBF5E9'));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export function App() {
  const settings = useSettings();
  useTheme(settings?.theme);
  const lang = settings?.language ?? 'en';
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageProvider lang={lang}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </LanguageProvider>
  );
}
