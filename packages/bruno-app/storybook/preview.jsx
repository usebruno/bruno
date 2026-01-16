import React from 'react';
import { ThemeProvider as SCThemeProvider, createGlobalStyle } from 'styled-components';
import themes from 'themes/index';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }
`;

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1e1e1e' }
      ]
    }
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' }
        ],
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
      const theme = themes[themeName];

      // Update background and text color based on theme
      const isDark = themeName === 'dark';
      const backgroundColor = isDark ? '#1e1e1e' : '#ffffff';
      const textColor = isDark ? '#d4d4d4' : '#333333';
      document.body.style.backgroundColor = backgroundColor;
      document.body.style.color = textColor;

      return (
        <SCThemeProvider theme={theme}>
          <GlobalStyle />
          <div style={{ padding: '1rem', color: textColor }}>
            <Story />
          </div>
        </SCThemeProvider>
      );
    }
  ]
};

export default preview;
