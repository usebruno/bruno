import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ResponseCopy from './ResponseCopy/index';
import ResponseDownload from './ResponseDownload/index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('utils/response-body', () => ({
  getResponseBodyClient: () => ({
    save: jest.fn()
  })
}));

const theme = {
  text: '#111',
  colors: {
    text: { muted: '#888' }
  },
  font: {
    size: {
      base: '13px',
      sm: '0.75rem'
    }
  },
  dropdown: {
    iconColor: '#666',
    hoverBg: '#eee'
  },
  workspace: {
    button: {
      bg: '#f5f5f5'
    }
  },
  requestTabPanel: {
    responseStatus: '#666'
  }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('response actions disabled for file-backed / missing bodies', () => {
  test('copy is disabled when data is null (file-backed)', () => {
    renderWithTheme(
      <ResponseCopy item={{}} selectedFormat="json" selectedTab="editor" data={null} />
    );
    expect(screen.getByTestId('response-copy-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('copy is enabled when in-memory data is present', () => {
    renderWithTheme(
      <ResponseCopy item={{}} selectedFormat="json" selectedTab="editor" data='{"a":1}' />
    );
    expect(screen.getByTestId('response-copy-btn')).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('download is disabled without bodyRef', () => {
    renderWithTheme(<ResponseDownload item={{ response: {} }} />);
    expect(screen.getByTestId('response-download-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('download is disabled while stream is running', () => {
    renderWithTheme(
      <ResponseDownload item={{ response: { bodyRef: 'b1', stream: { running: true } } }} />
    );
    expect(screen.getByTestId('response-download-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('download is enabled with bodyRef and idle stream', () => {
    renderWithTheme(<ResponseDownload item={{ response: { bodyRef: 'b1' } }} />);
    expect(screen.getByTestId('response-download-btn')).not.toHaveAttribute('aria-disabled', 'true');
  });
});
