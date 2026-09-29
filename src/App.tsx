import { useEffect } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { useSettings } from './db/hooks';
import { LanguageProvider } from './i18n';
import { CurriculumPage } from './pages/CurriculumPage';
import { DataPage } from './pages/DataPage';
import { ErrorPage } from './pages/ErrorPage';
import { GroupPage } from './pages/GroupPage';
import { GroupsPage } from './pages/GroupsPage';
import { InstallPage } from './pages/InstallPage';
import { LessonPage } from './pages/LessonPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlannerPage } from './pages/PlannerPage';
import { ProgressPage } from './pages/ProgressPage';
import { PrintCardPage } from './pages/PrintCardPage';
import { MorePage } from './pages/MorePage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupWizard } from './pages/SetupWizard';
import { TimetablePage } from './pages/TimetablePage';
import { TodayPage } from './pages/TodayPage';
import { DiceTool } from './pages/tools/DiceTool';
import { NoiseTool } from './pages/tools/NoiseTool';
import { PickerTool } from './pages/tools/PickerTool';
import { ScoreboardTool } from './pages/tools/ScoreboardTool';
import { StagesTool } from './pages/tools/StagesTool';
import { TeamsTool } from './pages/tools/TeamsTool';
import { TimerTool } from './pages/tools/TimerTool';
import { ToolsHome } from './pages/tools/ToolsHome';
import { TermCheckPage } from './pages/TermCheckPage';
import { WheelTool } from './pages/tools/WheelTool';
import { WeekPage } from './pages/WeekPage';

// Hash-based addresses (#/today) work on GitHub Pages and inside the future
// native app without any server configuration.
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/today" replace /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'week', element: <WeekPage /> },
      { path: 'timetable', element: <TimetablePage /> },
      { path: 'lesson/:groupId', element: <LessonPage /> },
      { path: 'plan/:lessonId', element: <PlannerPage /> },
      { path: 'print/:lessonId', element: <PrintCardPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'term-check', element: <TermCheckPage /> },
      { path: 'tools', element: <ToolsHome /> },
      { path: 'tools/picker', element: <PickerTool /> },
      { path: 'tools/scoreboard', element: <ScoreboardTool /> },
      { path: 'tools/timer', element: <TimerTool /> },
      { path: 'tools/dice', element: <DiceTool /> },
      { path: 'tools/wheel', element: <WheelTool /> },
      { path: 'tools/stages', element: <StagesTool /> },
      { path: 'tools/teams', element: <TeamsTool /> },
      { path: 'tools/noise', element: <NoiseTool /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'groups/:id', element: <GroupPage /> },
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

  if (settings === undefined) return null; // still opening the database
  // A brand-new device (e.g. another teacher) starts with the setup wizard.
  if (settings === null) return <SetupWizard />;

  return (
    <LanguageProvider lang={lang}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </LanguageProvider>
  );
}
