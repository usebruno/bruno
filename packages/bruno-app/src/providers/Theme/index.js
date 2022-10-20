import ThemeManager from "../../../public/theme/index";
import useLocalStorage from "src/hooks/useLocalStorage/index";

import { ThemeProvider as SCThemeProvider } from "styled-components";
import { createContext, useContext } from "react";

const ThemeContext = createContext();

export const ThemeProvider = (props) => {
  const [storedTheme, setStoredTheme] = useLocalStorage("bruno.theme", "light");
  const value = {
    storedTheme,
    setStoredTheme,
  };

  const theme = ThemeManager[storedTheme];

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
