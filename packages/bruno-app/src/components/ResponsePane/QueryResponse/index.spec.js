import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import QueryResponse from './index';
import { useInitialResponseFormat } from '../QueryResult/index';

jest.mock('../QueryResult/index', () => ({
  __esModule: true,
  default: ({ selectedFormat }) => <div data-testid="selected-format">{selectedFormat}</div>,
  useInitialResponseFormat: jest.fn(),
  useResponsePreviewFormatOptions: jest.fn(() => []),
  usePreferredFallbackFormat: jest.fn(() => 'raw')
}));

jest.mock('../QueryResult/QueryResultTypeSelector/index', () => ({
  __esModule: true,
  default: ({ onFormatChange }) => (
    <button data-testid="pick-xml" onClick={() => onFormatChange('xml')}>xml</button>
  )
}));

// Same reference across rerenders, like the response headers coming from the store
const headers = [];
const baseProps = { item: {}, collection: {}, data: '{}', error: null, hideResultTypeSelector: false, headers };
const renderResponse = (props) => (
  <ThemeProvider theme={themes.light}>
    <QueryResponse {...baseProps} {...props} />
  </ThemeProvider>
);
const selectedFormat = () => screen.getByTestId('selected-format').textContent;

describe('QueryResponse format selection', () => {
  it('applies the detected default format', () => {
    useInitialResponseFormat.mockReturnValue({ initialFormat: 'raw', initialTab: 'editor' });
    render(renderResponse({ dataBuffer: 'a' }));
    expect(selectedFormat()).toBe('raw');
  });

  it('applies a new default when the detection preference changes and nothing was picked manually', () => {
    useInitialResponseFormat.mockReturnValue({ initialFormat: 'raw', initialTab: 'editor' });
    const { rerender } = render(renderResponse({ dataBuffer: 'a' }));

    useInitialResponseFormat.mockReturnValue({ initialFormat: 'json', initialTab: 'editor' });
    rerender(renderResponse({ dataBuffer: 'a' }));
    expect(selectedFormat()).toBe('json');
  });

  it('keeps a manually selected format when the detection preference changes', () => {
    useInitialResponseFormat.mockReturnValue({ initialFormat: 'raw', initialTab: 'editor' });
    const { rerender } = render(renderResponse({ dataBuffer: 'a' }));

    fireEvent.click(screen.getByTestId('pick-xml'));
    expect(selectedFormat()).toBe('xml');

    useInitialResponseFormat.mockReturnValue({ initialFormat: 'json', initialTab: 'editor' });
    rerender(renderResponse({ dataBuffer: 'a' }));
    expect(selectedFormat()).toBe('xml');
  });

  it('starts from the detected default again for a new response', () => {
    useInitialResponseFormat.mockReturnValue({ initialFormat: 'raw', initialTab: 'editor' });
    const { rerender } = render(renderResponse({ dataBuffer: 'a' }));

    fireEvent.click(screen.getByTestId('pick-xml'));

    useInitialResponseFormat.mockReturnValue({ initialFormat: 'json', initialTab: 'editor' });
    rerender(renderResponse({ dataBuffer: 'b' }));
    expect(selectedFormat()).toBe('json');
  });
});
