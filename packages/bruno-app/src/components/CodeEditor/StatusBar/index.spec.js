import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import StatusBar, { getModeLabel } from './index';

const theme = {
  colors: { text: { muted: '#888' } },
  background: { crust: '#f8f8f8' },
  border: { radius: { sm: '4px' }, border0: '#ddd' },
  textLink: '#546de5'
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('getModeLabel', () => {
  it('falls back to "plain text" when there is no mode', () => {
    expect(getModeLabel(null)).toBe('plain text');
    expect(getModeLabel('text/plain')).toBe('plain text');
  });

  it('extracts the mime subtype', () => {
    expect(getModeLabel('application/ld+json')).toBe('json');
    expect(getModeLabel('application/json')).toBe('json');
    expect(getModeLabel('application/xml')).toBe('xml');
  });

  it('passes through already-short CodeMirror mode names', () => {
    expect(getModeLabel('javascript')).toBe('javascript');
    expect(getModeLabel('yaml')).toBe('yaml');
    expect(getModeLabel('shell')).toBe('shell');
  });

  it('applies explicit overrides for unfriendly mode names', () => {
    expect(getModeLabel('gfm')).toBe('markdown');
    expect(getModeLabel('htmlmixed')).toBe('html');
    expect(getModeLabel('application/x-www-form-urlencoded')).toBe('form');
  });
});

describe('StatusBar', () => {
  it('shows the size and mode, with no toggle when there is no long line', () => {
    renderWithTheme(
      <StatusBar value="short" mode="application/ld+json" longLineDetected={false} longLineMode={false} onToggle={() => {}} />
    );

    expect(screen.getByText('5B · json mode')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the degraded note and an "enable" link when a long line disabled the full editor', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(
      <StatusBar value="x" mode="application/ld+json" longLineDetected longLineMode onToggle={onToggle} />
    );

    expect(screen.getByText('1B · plain text mode · editor features turned off for performance')).toBeInTheDocument();

    const link = screen.getByRole('button', { name: 'enable full editor' });
    await user.click(link);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('offers to disable the manually re-enabled full editor', () => {
    renderWithTheme(
      <StatusBar value="x" mode="application/ld+json" longLineDetected longLineMode={false} onToggle={() => {}} />
    );

    expect(screen.getByRole('button', { name: 'disable full editor' })).toBeInTheDocument();
  });
});
