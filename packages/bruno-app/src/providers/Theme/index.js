import React from 'react';
import { Validator } from 'jsonschema';
import toast from 'react-hot-toast';
import themes from 'themes/index';
import themeSchema from 'themes/schema';
import useLocalStorage from 'hooks/useLocalStorage/index';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

const validator = new Validator();

export const ThemeContext = createContext();
export const ThemeProvider = (props) => {
  const isBrowserThemeLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const [displayedTheme, setDisplayedTheme] = useState(isBrowserThemeLight ? 'light' : 'dark');
  const [storedTheme, setStoredTheme] = useLocalStorage('bruno.theme', 'system');
  const [themeVariantLight, setThemeVariantLight] = useLocalStorage('bruno.themeVariantLight', 'light');
  const [themeVariantDark, setThemeVariantDark] = useLocalStorage('bruno.themeVariantDark', 'dark');
  const toggleHtml = () => {
    const html = document.querySelector('html');
    if (html) {
      html.classList.toggle('dark');
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e) => {
      if (storedTheme !== 'system') return;
      setDisplayedTheme(e.matches ? 'light' : 'dark');
      toggleHtml();
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storedTheme]);

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

    if (window.ipcRenderer) {
      window.ipcRenderer.send('renderer:theme-change', storedTheme);
    }
  }, [storedTheme]);

  // storedTheme can have 3 values: 'light', 'dark', 'system'
  // displayedTheme can have 2 values: 'light', 'dark'

  // Get the appropriate variant based on the current display mode
  const theme = useMemo(() => {
    const isLightMode = displayedTheme === 'light';
    const variantName = isLightMode ? themeVariantLight : themeVariantDark;
    const fallbackTheme = isLightMode ? themes.light : themes.dark;
    const fallbackName = isLightMode ? 'light' : 'dark';

    // Check if the variant exists in themes
    const selectedTheme = themes[variantName];
    if (!selectedTheme) {
      // Only show toast if using a non-default variant that doesn't exist
      if (variantName !== fallbackName) {
        toast.error(`Theme "${variantName}" not found. Using default ${fallbackName} theme.`, {
          duration: 4000,
          id: `theme-not-found-${variantName}` // Prevent duplicate toasts
        });
      }
      return fallbackTheme;
    }

    // Validate the theme against the schema
    const validationResult = validator.validate(selectedTheme, themeSchema);
    if (!validationResult.valid) {
      const errors = validationResult.errors?.map((e) => e.stack).join(', ') || 'Unknown validation error';
      console.error(`Theme "${variantName}" validation failed:`, errors);
      toast.error(`Invalid theme "${variantName}". Using default ${fallbackName} theme.`, {
        duration: 4000,
        id: `theme-invalid-${variantName}` // Prevent duplicate toasts
      });
      return fallbackTheme;
    }

    return selectedTheme;
  }, [displayedTheme, themeVariantLight, themeVariantDark]);

  const value = {
    theme,
    storedTheme,
    displayedTheme,
    setStoredTheme,
    themeVariantLight,
    setThemeVariantLight,
    themeVariantDark,
    setThemeVariantDark
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
