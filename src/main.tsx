import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import './app/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { DEVTOOLS_ALLOWED, silenceConsole } from './security/devtools';
import { initFontSize } from './shared/fontSize';

if (!DEVTOOLS_ALLOWED) silenceConsole();
initFontSize();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
