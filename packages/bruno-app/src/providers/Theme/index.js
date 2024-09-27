import themes from 'themes/index';
import useLocalStorage from 'hooks/useLocalStorage/index';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

export const ThemeContext = createContext();
export const ThemeProvider = (props) => {
  const isBrowserThemeLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const [displayedTheme, setDisplayedTheme] = useState(isBrowserThemeLight ? 'light' : 'dark');
  const [storedTheme, setStoredTheme] = useLocalStorage('bruno.theme', 'system');
  const toggleHtml = () => {
    const html = document.querySelector('html');
    if (html) {
      html.classList.toggle('dark');
    }
  };

  useEffect(() => {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (storedTheme !== 'system') return;
      setDisplayedTheme(e.matches ? 'light' : 'dark');
      toggleHtml();
    });
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (storedTheme === 'system') {
      const isBrowserThemeLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      setDisplayedTheme(isBrowserThemeLight ? 'light' : 'dark');
      root.classList.add(isBrowserThemeLight ? 'light' : 'dark');
    } else {
      setDisplayedTheme(storedTheme);
      root.classList.add(storedTheme);
    }
  }, [storedTheme, setDisplayedTheme, window.matchMedia]);

  // storedTheme can have 3 values: 'light', 'dark', 'system'
  // displayedTheme can have 2 values: 'light', 'dark'

  const theme = storedTheme === 'system' ? themes[displayedTheme] : themes[storedTheme];
  const themeOptions = Object.keys(themes);
  const value = {
    theme,
    themeOptions,
    storedTheme,
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

  if (context === undefined) {
    throw new Error(`useTheme must be used within a ThemeProvider`);
  }

  return context;
};

export default ThemeProvider;
