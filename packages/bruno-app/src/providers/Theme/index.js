import themes from 'themes/index';
import useLocalStorage from 'src/hooks/useLocalStorage/index';

import { createContext, useContext } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

export const ThemeContext = createContext();
export const ThemeProvider = (props) => {
  const [storedTheme, setStoredTheme] = useLocalStorage('bruno.theme', 'light');

  const theme = themes[storedTheme];
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
