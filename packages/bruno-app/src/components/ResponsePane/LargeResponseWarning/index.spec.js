import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import toast from 'react-hot-toast';
import LargeResponseWarning from './index';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const RENDERABLE_SIZE = 15 * 1024 * 1024;
const DOWNLOAD_ONLY_SIZE = 60 * 1024 * 1024;

const loadedItem = {
  pathname: '/collections/demo/req.bru',
  requestSent: { url: 'https://example.com/report' },
  response: { headers: {}, data: { ok: true }, dataBuffer: Buffer.from('{"ok":true}').toString('base64') }
};

const storedItem = {
  pathname: '/collections/demo/req.bru',
  requestSent: { url: 'https://example.com/report' },
  response: { headers: {}, data: null, dataBuffer: null, size: DOWNLOAD_ONLY_SIZE, storedRequestUid: 'run-1' }
};

const renderWarning = (props) => render(
  <ThemeProvider theme={themes.light}>
    <LargeResponseWarning onRevealResponse={jest.fn()} {...props} />
  </ThemeProvider>
);

const button = (name) => screen.getByTestId(`large-response-${name}`);

describe('LargeResponseWarning', () => {
  let invoke;

  beforeEach(() => {
    invoke = jest.fn().mockResolvedValue({ success: true });
    window.ipcRenderer = { invoke };
  });

  afterEach(() => {
    delete window.ipcRenderer;
    jest.clearAllMocks();
  });

  it('lets a renderable response be viewed, copied and downloaded', () => {
    renderWarning({ item: loadedItem, responseSize: RENDERABLE_SIZE });

    expect(button('view')).toBeEnabled();
    expect(button('copy')).toBeEnabled();
    expect(button('download')).toBeEnabled();
    expect(screen.queryByTestId('large-response-download-only')).not.toBeInTheDocument();
  });

  it('only offers the download above the renderable limit', () => {
    renderWarning({ item: loadedItem, responseSize: DOWNLOAD_ONLY_SIZE });

    expect(button('view')).toBeDisabled();
    expect(button('copy')).toBeDisabled();
    expect(button('download')).toBeEnabled();
    expect(screen.getByTestId('large-response-download-only')).toBeInTheDocument();
  });

  it('downloads a body kept in main by passing the response to the save handler', async () => {
    renderWarning({ item: storedItem, responseSize: DOWNLOAD_ONLY_SIZE });

    fireEvent.click(button('download'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Response downloaded to file'));
    expect(invoke).toHaveBeenCalledWith(
      'renderer:save-response-to-file',
      storedItem.response,
      storedItem.requestSent.url,
      storedItem.pathname
    );
  });

  it('cannot download a response with neither a body nor a stored copy', () => {
    renderWarning({ item: { ...storedItem, response: { ...storedItem.response, storedRequestUid: undefined } }, responseSize: DOWNLOAD_ONLY_SIZE });

    expect(button('download')).toBeDisabled();
  });
});
