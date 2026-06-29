import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'open3dinspection:theme';
const LEGACY_STORAGE_KEYS = ['openinspection:theme', 'openinspect:theme'];

function readTheme(): Theme {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const saved = localStorage.getItem(key);
      if (saved === 'light' || saved === 'dark') return saved;
    }
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggleTheme };
}
