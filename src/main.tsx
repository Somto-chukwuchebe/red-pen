import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import './lib/installPrompt';
import { App } from './App';
import { requestPersistentStorage } from './lib/storage';
import { setRegistration } from './lib/update';

// Keep the app cached for offline use and update it quietly in the background.
registerSW({ immediate: true, onRegisteredSW: (_url, reg) => setRegistration(reg) });

void requestPersistentStorage();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
