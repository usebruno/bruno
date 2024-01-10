import themes from 'themes/index';
import useLocalStorage from 'hooks/useLocalStorage/index';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

export const ThemeContext = createContext();
export const ThemeProvider = (props) => {
  const isBrowserThemeLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const [displayedTheme, setDisplayedTheme] = useState(isBrowserThemeLight ? 'light' : 'dark');
  const [storedTheme, setStoredTheme] = useLocalStorage('bruno.theme', 'system');

  useEffect(() => {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (storedTheme !== 'system') return;
      e.matches ? document.documentElement.classList.remove('dark') : document.documentElement.classList.add('dark');
      setDisplayedTheme(e.matches ? 'light' : 'dark');
    });
  }, []);
  useEffect(() => {
    if (storedTheme === 'system') {
      document.documentElement.classList.remove('dark');
      setDisplayedTheme(isBrowserThemeLight ? 'light' : 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add(storedTheme);
      setDisplayedTheme(storedTheme);
    }
  }, [storedTheme]);

  const theme = storedTheme === 'system' ? themes[displayedTheme] : themes[storedTheme];
  const themeOptions = Object.keys(themes);
  const value = {
    theme,
    themeOptions,
    storedTheme,
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
