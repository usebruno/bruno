import React from 'react';
import themes from 'themes/index';
import useLocalStorage from 'hooks/useLocalStorage/index';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

export const ThemeContext = createContext();
export const ThemeProvider = (props) => {
  const isBrowserThemeLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const [displayedTheme, setDisplayedTheme] = useState(isBrowserThemeLight ? 'light' : 'dark');
  const [storedTheme, setStoredTheme] = useLocalStorage('bruno.theme', 'system');
  const [customThemes, setCustomThemes] = useLocalStorage('bruno.customThemes', {});

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
    } else if (storedTheme?.startsWith('custom:')) {
      // Custom themes are considered dark by default
      setDisplayedTheme('dark');
      root.classList.add('dark');
    } else {
      setDisplayedTheme(storedTheme);
      root.classList.add(storedTheme);
    }
  }, [storedTheme, setDisplayedTheme, window.matchMedia]);

  // Get the active theme
  const getActiveTheme = () => {
    if (storedTheme?.startsWith('custom:')) {
      const themeName = storedTheme.replace('custom:', '');

      // Check if it's a preset theme
      if (themes[themeName]) {
        return themes[themeName];
      }

      // Check if it's a user-uploaded custom theme
      if (customThemes[themeName]) {
        return customThemes[themeName];
      }

      // Fallback to dark theme
      return themes.dark;
    }

    if (storedTheme === 'system') {
      return themes[displayedTheme];
    }

    return themes[storedTheme] || themes.dark;
  };

  const setCustomTheme = (theme, name) => {
    setCustomThemes({
      ...customThemes,
      [name]: theme
    });
  };

  const theme = getActiveTheme();
  const themeOptions = ['light', 'dark', 'system', ...Object.keys(themes).filter((t) => !['light', 'dark'].includes(t))];

  const value = {
    theme,
    themeOptions,
    storedTheme,
    displayedTheme,
    setStoredTheme,
    setCustomTheme,
    customThemes
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
