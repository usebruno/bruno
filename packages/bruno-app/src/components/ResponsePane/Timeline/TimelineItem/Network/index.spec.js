import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
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
    expect(writeText.mock.calls[0][0]).toContain('Authorization: Basic real-token');
    expect(writeText.mock.calls[0][0]).not.toContain('[REDACTED]');
    expect(writeText.mock.calls[0][0]).not.toContain('# API 调试上下文');
  });
});
