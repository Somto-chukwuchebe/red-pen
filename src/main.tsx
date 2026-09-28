import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import './lib/installPrompt';
import { App } from './App';
import { ensureSeeded } from './db/seed';
import { requestPersistentStorage } from './lib/storage';

// Keep the app cached for offline use and update it quietly in the background.
registerSW({ immediate: true });

ensureSeeded()
  .catch((e) => console.error('Setting up the database failed', e))
  .finally(() => {
    void requestPersistentStorage();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
