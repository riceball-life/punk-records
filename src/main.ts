import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import './styles/global.css';
import App from './App.svelte';
import { requestPersistentStorage } from './lib/persistence/persist';

// Surface otherwise-silent async failures (they can blank the UI) to the console.
window.addEventListener('error', (e) => console.error('[journal] error:', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) =>
  console.error('[journal] unhandledrejection:', e.reason),
);

const target = document.getElementById('app');
if (!target) throw new Error('#app mount target not found');

const app = mount(App, { target });

// Ask for durable storage as early as possible (best-effort; see persist.ts).
void requestPersistentStorage();

// Keep the installed app up to date automatically on next load.
registerSW({ immediate: true });

export default app;
