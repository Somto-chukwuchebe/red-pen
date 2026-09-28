import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _useDatabase, db } from './db/db';
import { ensureSeeded } from './db/seed';

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));

let n = 0;
beforeEach(async () => {
  _useDatabase(`test-app-${++n}`);
  await ensureSeeded();
  window.location.hash = '#/groups';
});

describe('the app', () => {
  it('starts and shows the seeded groups', async () => {
    const { App } = await import('./App');
    render(<App />);
    expect(await screen.findByText('KG Older 2')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Timetable/ }).length).toBeGreaterThan(0);
  });

  it('switches to Russian', async () => {
    await db.settings.update('settings', { language: 'ru' });
    const { App } = await import('./App');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Группы' })).toBeInTheDocument();
    expect(await screen.findByText('Всего 26 уроков в неделю')).toBeInTheDocument();
  });
});
