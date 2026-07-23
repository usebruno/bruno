import React from 'react';
import { render } from '@testing-library/react';
import HtmlPreview from './HtmlPreview';

const dispatchWebviewUrlEvent = (webview, eventName, url) => {
  const event = new Event(eventName, { cancelable: true });
  Object.defineProperty(event, 'url', { value: url });
  webview.dispatchEvent(event);
  return event;
};

describe('HtmlPreview', () => {
  beforeEach(() => {
    window.ipcRenderer = {
      openExternal: jest.fn()
    };
  });

  it('opens navigated http links in the default browser', () => {
    const { getByTestId } = render(<HtmlPreview data={'<a href="https://example.com">Example</a>'} baseUrl="https://base.example" />);
    const webview = getByTestId('html-response-preview');

    const event = dispatchWebviewUrlEvent(webview, 'will-navigate', 'https://example.com');

    expect(event.defaultPrevented).toBe(true);
    expect(window.ipcRenderer.openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('opens new-window http links in the default browser', () => {
    const { getByTestId } = render(<HtmlPreview data={'<a target="_blank" href="https://example.com">Example</a>'} baseUrl="https://base.example" />);
    const webview = getByTestId('html-response-preview');

    const event = dispatchWebviewUrlEvent(webview, 'new-window', 'https://example.com');

    expect(event.defaultPrevented).toBe(true);
    expect(window.ipcRenderer.openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('does not open non-http links externally', () => {
    const { getByTestId } = render(<HtmlPreview data={'<a href="data:text/plain,test">Example</a>'} baseUrl="https://base.example" />);
    const webview = getByTestId('html-response-preview');

    const event = dispatchWebviewUrlEvent(webview, 'will-navigate', 'data:text/plain,test');

    expect(event.defaultPrevented).toBe(false);
    expect(window.ipcRenderer.openExternal).not.toHaveBeenCalled();
  });
});
