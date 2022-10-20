import ThemeManager from '../../../public/theme/index';
import useLocalStorage from 'src/hooks/useLocalStorage/index';

import { createContext, useContext } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

export const ThemeContext = createContext();
export const ThemeProvider = (props) => {
  const [storedTheme, setStoredTheme] = useLocalStorage('bruno.theme', 'Light');

  const theme = ThemeManager[storedTheme];
  const themeKeys = Object.keys(ThemeManager);
  const value = {
    theme,
    themeKeys,
    storedTheme,
    setStoredTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      <SCThemeProvider theme={value} {...props} />
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
