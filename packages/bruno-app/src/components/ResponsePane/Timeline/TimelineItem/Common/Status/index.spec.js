import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';
import { ThemeContext } from 'providers/Theme';
import Status from './index';

const theme = {
  colors: {
    text: { muted: '#888888', warning: '#f59e0b' }
  },
  requestTabPanel: {
    responseOk: '#22c55e',
    responseError: '#ef4444'
  }
};

const renderStatus = (props) =>
  render(
    <ThemeContext.Provider value={{ theme, displayedTheme: 'dark', storedTheme: 'system', setStoredTheme: () => {} }}>
      <SCThemeProvider theme={theme}>
        <Status {...props} />
      </SCThemeProvider>
    </ThemeContext.Provider>
  );

const getPill = () => document.querySelector('.timeline-status');

describe('Timeline Status', () => {
  describe('numeric HTTP codes', () => {
    it('colors 2xx as success and shows a tinted background', () => {
      renderStatus({ statusCode: 200 });
      const pill = getPill();
      expect(pill).toHaveTextContent('200');
      expect(pill).toHaveStyle({ color: theme.requestTabPanel.responseOk });
      expect(pill.style.background).not.toBe('transparent');
    });

    it('colors 3xx as warning', () => {
      renderStatus({ statusCode: 301 });
      expect(getPill()).toHaveStyle({ color: theme.colors.text.warning });
    });

    it('colors 4xx as error', () => {
      renderStatus({ statusCode: 404 });
      expect(getPill()).toHaveStyle({ color: theme.requestTabPanel.responseError });
    });

    it('colors 5xx as error', () => {
      renderStatus({ statusCode: 503 });
      expect(getPill()).toHaveStyle({ color: theme.requestTabPanel.responseError });
    });
  });

  describe('string codes (pre-send network failures)', () => {
    it('renders ECONNREFUSED in muted/gray (not red)', () => {
      renderStatus({ statusCode: 'ECONNREFUSED' });
      const pill = getPill();
      expect(pill).toHaveTextContent('ECONNREFUSED');
      expect(pill).toHaveStyle({ color: theme.colors.text.muted });
      // String codes still get a tinted pill background so they're visible
      expect(pill.style.background).not.toBe('transparent');
    });

    it('renders "Error" in muted/gray', () => {
      renderStatus({ statusCode: 'Error' });
      const pill = getPill();
      expect(pill).toHaveTextContent('Error');
      expect(pill).toHaveStyle({ color: theme.colors.text.muted });
    });

    it('renders ETIMEDOUT in muted/gray', () => {
      renderStatus({ statusCode: 'ETIMEDOUT' });
      expect(getPill()).toHaveStyle({ color: theme.colors.text.muted });
    });
  });

  describe('unknown / absent codes', () => {
    it('renders nothing visible when statusCode is undefined', () => {
      renderStatus({ statusCode: undefined });
      const pill = getPill();
      // Pill still mounts but has transparent background and no text
      expect(pill).toBeInTheDocument();
      expect(pill.textContent).toBe('');
      expect(pill.style.background).toBe('transparent');
    });

    it('keeps background transparent when statusCode is 0 (no real status)', () => {
      renderStatus({ statusCode: 0 });
      const pill = getPill();
      expect(pill.style.background).toBe('transparent');
    });

    it('keeps background transparent for empty string', () => {
      renderStatus({ statusCode: '' });
      const pill = getPill();
      expect(pill.style.background).toBe('transparent');
    });
  });
});
