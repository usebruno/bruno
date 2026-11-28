import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import toast from 'react-hot-toast';
import Network from './index';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const theme = {
  text: '#fff',
  textLink: '#fff',
  border: { border1: '#333' },
  colors: { text: { muted: '#aaa', green: '#0f0', danger: '#f00', purple: '#a0f', yellow: '#ff0' } }
};

describe('Timeline Network', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render a Copy action by default', () => {
    render(
      <ThemeProvider theme={theme}>
        <Network logs={[{ type: 'request', message: 'GET https://api.example.com/users' }]} />
      </ThemeProvider>
    );

    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('copies the raw displayed network logs', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const logs = [
      { type: 'request', message: 'GET https://api.example.com/users' },
      { type: 'requestHeader', message: 'Authorization: Basic real-token' },
      { type: 'separator' },
      { type: 'response', message: 'HTTP/1.1 200 OK' }
    ];

    render(
      <ThemeProvider theme={theme}>
        <Network logs={logs} showCopy={true} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith([
      'GET https://api.example.com/users',
      'Authorization: Basic real-token',
      '',
      'HTTP/1.1 200 OK'
    ].join('\n')));
    expect(toast.success).toHaveBeenCalledWith('Network logs copied to clipboard');
  });

  it('shows an error when clipboard copy fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('Clipboard unavailable'));
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <ThemeProvider theme={theme}>
        <Network logs={[{ type: 'error', message: 'there was an error executing the request!' }]} showCopy={true} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to copy network logs'));
  });

  it('disables the Copy action when there are no logs', () => {
    render(
      <ThemeProvider theme={theme}>
        <Network logs={[]} showCopy={true} />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
  });

  it('disables the Copy action when logs is not an array', () => {
    render(
      <ThemeProvider theme={theme}>
        <Network logs={null} showCopy={true} />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
  });
});
