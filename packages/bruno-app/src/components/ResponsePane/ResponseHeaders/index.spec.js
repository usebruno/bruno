import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ResponseHeaders from './index';

const theme = {
  font: { size: { sm: '0.8125rem' } },
  table: {
    border: '#e0e0e0',
    striped: '#f5f5f5',
    thead: { color: '#333' }
  },
  colors: { text: { link: '#1663bb' } }
};

const renderWithTheme = (component) => render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('ResponseHeaders', () => {
  const item = { uid: 'req-1' };

  beforeEach(() => {
    global.window.ipcRenderer = { openExternal: jest.fn() };
  });

  it('should render header names and values', () => {
    const headers = { 'content-type': 'application/json' };
    renderWithTheme(<ResponseHeaders headers={headers} item={item} />);
    expect(screen.getByText('content-type')).toBeInTheDocument();
    expect(screen.getByText('application/json')).toBeInTheDocument();
  });

  it('should render a URL header value as a link', () => {
    const headers = { location: 'https://example.com/next' };
    renderWithTheme(<ResponseHeaders headers={headers} item={item} />);
    const link = screen.getByRole('link', { name: 'https://example.com/next' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com/next');
  });

  it('should open the URL externally on click instead of navigating', () => {
    const headers = { location: 'https://example.com/next' };
    renderWithTheme(<ResponseHeaders headers={headers} item={item} />);
    const link = screen.getByRole('link', { name: 'https://example.com/next' });
    fireEvent.click(link);
    expect(global.window.ipcRenderer.openExternal).toHaveBeenCalledWith('https://example.com/next');
  });

  it('should render non-URL header values as plain text', () => {
    const headers = { 'cache-control': 'max-age=3600' };
    renderWithTheme(<ResponseHeaders headers={headers} item={item} />);
    expect(screen.getByText('max-age=3600')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should render nothing in the body when there are no headers', () => {
    const { container } = renderWithTheme(<ResponseHeaders headers={{}} item={item} />);
    expect(container.querySelector('tbody').children.length).toBe(0);
  });
});
