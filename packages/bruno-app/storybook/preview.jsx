import React from 'react';
import { ThemeProvider as SCThemeProvider, createGlobalStyle } from 'styled-components';
import themes, { themeRegistry } from 'themes/index';
import { ThemeContext } from 'providers/Theme';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }
`;

// One toolbar entry per registered Bruno theme (light group first, then dark).
const themeItems = Object.values(themeRegistry).map((t) => ({ value: t.id, title: t.name }));

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  },
  globalTypes: {
    theme: {
      description: 'Bruno theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: themeItems,
        dynamicTitle: true
      }
    }
  },
  initialGlobals: {
    theme: 'light'
  },
  decorators: [
    (Story, context) => {
      const themeName = context.globals.theme || 'light';
      const theme = themes[themeName] || themes.light;
      const meta = themeRegistry[themeName] || themeRegistry.light;

      const backgroundColor = theme.bg || (meta.mode === 'dark' ? '#1e1e1e' : '#ffffff');
      const textColor = theme.text || (meta.mode === 'dark' ? '#d4d4d4' : '#333333');

      // Apply the light/dark class — globals.css scopes some CSS variables to it.
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(meta.mode);
      document.body.style.backgroundColor = backgroundColor;
      document.body.style.color = textColor;

      // Provide the app ThemeContext too, so components that call useTheme()
      // render and still respond to the toolbar theme selection.
      const themeContextValue = {
        theme,
        storedTheme: themeName,
        displayedTheme: meta.mode,
        setStoredTheme: () => {},
        themeVariantLight: 'light',
        setThemeVariantLight: () => {},
        themeVariantDark: 'dark',
        setThemeVariantDark: () => {}
      };

      return (
        <ThemeContext.Provider value={themeContextValue}>
          <SCThemeProvider theme={theme}>
            <GlobalStyle />
            <div style={{ padding: '1rem', backgroundColor, color: textColor }}>
              <Story />
            </div>
          </SCThemeProvider>
        </ThemeContext.Provider>
      );
    }
  ]
};

export default preview;
