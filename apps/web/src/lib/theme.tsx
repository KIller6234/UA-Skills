'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

const THEME_KEY = 'nih_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const t = stored ?? 'dark';
    setThemeState(t);
    applyTheme(t);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    if (t === 'light') {root.classList.add('light');}
    else {root.classList.remove('light');}
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
