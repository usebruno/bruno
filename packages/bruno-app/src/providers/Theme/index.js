import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';
import themes from 'themes/index';
import useLocalStorage from 'hooks/useLocalStorage/index';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

export const ThemeContext = createContext();

export const ThemeProvider = (props) => {
  const isBrowserThemeLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  // 'system' | 'light' | 'dark' | custom theme name
  const [storedTheme, setStoredTheme] = useLocalStorage('bruno.theme', 'system');
  const [displayedTheme, setDisplayedTheme] = useState(isBrowserThemeLight ? 'light' : 'dark');

  // Always read current custom themes from localStorage
  const customThemes = JSON.parse(localStorage.getItem('bruno.customThemes') || '{}');
  const allThemes = { ...themes, ...customThemes };

  // Hard fallback if current storedTheme no longer exists (e.g. deleted)
  const safeStoredTheme
    = storedTheme === 'system' || allThemes[storedTheme] ? storedTheme : 'light';

  const theme
    = safeStoredTheme === 'system'
      ? allThemes[displayedTheme]
      : allThemes[safeStoredTheme];

  const themeOptions = Object.keys(allThemes);

  const toggleHtml = () => {
    const html = document.querySelector('html');
    if (html) {
      html.classList.toggle('dark');
    }
  };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const listener = (e) => {
      if (safeStoredTheme !== 'system') return;
      setDisplayedTheme(e.matches ? 'light' : 'dark');
      toggleHtml();
    };

    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [safeStoredTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (safeStoredTheme === 'system') {
      const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      setDisplayedTheme(isLight ? 'light' : 'dark');
      root.classList.add(isLight ? 'light' : 'dark');
    } else {
      setDisplayedTheme(safeStoredTheme);
      root.classList.add(safeStoredTheme);
    }
  }, [safeStoredTheme]);

  const value = {
    theme,
    themeOptions,
    storedTheme: safeStoredTheme,
    displayedTheme,
    setStoredTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      <SCThemeProvider theme={theme} {...props} />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export default ThemeProvider;
