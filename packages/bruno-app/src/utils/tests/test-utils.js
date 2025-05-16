import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

const theme = {
  codemirror: {
    bg: '#ffffff',
    color: '#24292e',
    border: '#e1e4e8',
    selection: '#b4d5fe',
    selectionMatch: '#b4d5fe',
    lineNumber: '#1b1f234d',
    searchMatch: '#fff951',
    searchMatchBorder: '#c4c4c4',
    matchingBracket: '#34d058',
    guttersBg: '#fff',
    guttermarkerText: '#24292e',
    guttermarkerSubtleText: '#6a737d',
    linenumberText: '#1b1f234d',
    cursor: '#24292e',
    secondaryCursor: '#24292e',
    measure: '#24292e',
    lineHighlight: '#f6f8fa'
  }
};

const AllTheProviders = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };