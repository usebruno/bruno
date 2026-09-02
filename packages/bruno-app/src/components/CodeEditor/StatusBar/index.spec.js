import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import StatusBar from './index';

const theme = {
  colors: { text: { muted: '#888' } },
  background: { crust: '#f8f8f8' },
  border: { radius: { sm: '4px' }, border0: '#ddd' },
  textLink: '#546de5'
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('StatusBar', () => {
  it('shows the size and mode, with no toggle when there is no long line', () => {
    renderWithTheme(
      <StatusBar value="short" mode="application/ld+json" longLineDetected={false} longLineMode={false} onToggle={() => {}} />
    );

    expect(screen.getByText('5B · json mode')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('falls back to plain text when mode is missing', () => {
    renderWithTheme(
      <StatusBar value="x" mode={null} longLineDetected={false} longLineMode={false} onToggle={() => {}} />
    );

    expect(screen.getByText('1B · plain text mode')).toBeInTheDocument();
  });

  it('labels gfm as markdown', () => {
    renderWithTheme(
      <StatusBar value="x" mode="gfm" longLineDetected={false} longLineMode={false} onToggle={() => {}} />
    );
    expect(screen.getByText('1B · markdown mode')).toBeInTheDocument();
  });

  it('labels htmlmixed as html', () => {
    renderWithTheme(
      <StatusBar value="x" mode="htmlmixed" longLineDetected={false} longLineMode={false} onToggle={() => {}} />
    );
    expect(screen.getByText('1B · html mode')).toBeInTheDocument();
  });

  it('labels form-urlencoded as form', () => {
    renderWithTheme(
      <StatusBar value="x" mode="application/x-www-form-urlencoded" longLineDetected={false} longLineMode={false} onToggle={() => {}} />
    );
    expect(screen.getByText('1B · form mode')).toBeInTheDocument();
  });

  it('passes through short CodeMirror mode names', () => {
    renderWithTheme(
      <StatusBar value="x" mode="javascript" longLineDetected={false} longLineMode={false} onToggle={() => {}} />
    );

    expect(screen.getByText('1B · javascript mode')).toBeInTheDocument();
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
