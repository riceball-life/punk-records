export type Theme = 'light' | 'dark';

const KEY = 'theme';

/** The OS-level preference. */
export function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** An explicit user choice, if one was saved. */
export function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

/** The theme currently in effect: the user's choice, else the system default. */
export function currentTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

/** Force a theme: stamp it on <html> (CSS overrides read this) and persist it. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore private-mode storage failures */
  }
}
