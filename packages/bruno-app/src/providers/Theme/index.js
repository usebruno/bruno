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
      setDisplayedTheme(e.matches ? 'light' : 'dark');
    });
  }, []);

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
