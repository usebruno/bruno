import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import lightTheme from 'themes/light/light';
import ProxySettings from './index';

const mockSavePreferences = jest.fn();
const mockRefreshPacCache = jest.fn();

jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: (...args) => mockSavePreferences(...args),
  refreshPacCache: (...args) => mockRefreshPacCache(...args)
}));

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('./SystemProxy', () => () => <div data-testid="system-proxy-stub" />);

const createAppSlice = (initialProxy) => createSlice({
  name: 'app',
  initialState: {
    preferences: {
      proxy: initialProxy
    }
  },
  reducers: {
    setPreferences: (state, action) => {
      state.preferences = action.payload;
    }
  }
});

const renderProxySettings = (proxyOverrides = {}) => {
  const initialProxy = {
    disabled: false,
    source: 'manual',
    pac: { source: '' },
    ...proxyOverrides,
    config: {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 8080,
      auth: {
        disabled: true,
        username: '',
        password: ''
      },
      bypassProxy: '',
      ...(proxyOverrides.config || {})
    }
  };

  const appSlice = createAppSlice(initialProxy);
  const store = configureStore({
    reducer: {
      app: appSlice.reducer
    }
  });

  mockSavePreferences.mockImplementation((nextPreferences) => (dispatch) => {
    dispatch(appSlice.actions.setPreferences(nextPreferences));
    return Promise.resolve();
  });
  mockRefreshPacCache.mockImplementation(() => () => Promise.resolve());

  const result = render(
    <Provider store={store}>
      <ThemeProvider theme={lightTheme}>
        <ProxySettings close={jest.fn()} />
      </ThemeProvider>
    </Provider>
  );

  return { store, ...result };
};

describe('Preferences ProxySettings - targetProtocols', () => {
  it('defaults both HTTP and HTTPS checkboxes to checked when config.targetProtocols is omitted', () => {
    renderProxySettings();

    const httpCheckbox = screen.getByTestId('preferences-proxy-protocol-http');
    const httpsCheckbox = screen.getByTestId('preferences-proxy-protocol-https');

    expect(httpCheckbox).toBeChecked();
    expect(httpsCheckbox).toBeChecked();
    expect(screen.queryByText('Select at least one protocol to proxy')).not.toBeInTheDocument();
  });

  it('persists { http: false, https: true } when HTTP is unchecked (HTTPS-only)', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderProxySettings();

    await user.click(screen.getByTestId('preferences-proxy-protocol-http'));

    expect(screen.getByTestId('preferences-proxy-protocol-http')).not.toBeChecked();
    expect(screen.getByTestId('preferences-proxy-protocol-https')).toBeChecked();

    await waitFor(() => {
      expect(mockSavePreferences).toHaveBeenCalledTimes(1);
    }, { timeout: 1500 });
    expect(store.getState().app.preferences.proxy.config.targetProtocols).toEqual({
      http: false,
      https: true
    });
    unmount();
  });

  it('persists { http: true, https: false } when HTTPS is unchecked (HTTP-only)', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderProxySettings();

    await user.click(screen.getByTestId('preferences-proxy-protocol-https'));

    expect(screen.getByTestId('preferences-proxy-protocol-http')).toBeChecked();
    expect(screen.getByTestId('preferences-proxy-protocol-https')).not.toBeChecked();

    await waitFor(() => {
      expect(mockSavePreferences).toHaveBeenCalledTimes(1);
    }, { timeout: 1500 });
    expect(store.getState().app.preferences.proxy.config.targetProtocols).toEqual({
      http: true,
      https: false
    });
    unmount();
  });

  it('shows inline validation error immediately and prevents saving when both protocols are unchecked', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderProxySettings({
      config: {
        targetProtocols: { http: true, https: false }
      }
    });

    await user.click(screen.getByTestId('preferences-proxy-protocol-http'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Select at least one protocol to proxy');
    });

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSavePreferences).not.toHaveBeenCalled();
    expect(store.getState().app.preferences.proxy.config.targetProtocols).toEqual({
      http: true,
      https: false
    });
  });

  it('omits config.targetProtocols when re-checking both protocols', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderProxySettings();

    await user.click(screen.getByTestId('preferences-proxy-protocol-http'));
    await waitFor(() => {
      expect(mockSavePreferences).toHaveBeenCalledTimes(1);
    }, { timeout: 1500 });

    await user.click(screen.getByTestId('preferences-proxy-protocol-http'));

    expect(screen.getByTestId('preferences-proxy-protocol-http')).toBeChecked();
    expect(screen.getByTestId('preferences-proxy-protocol-https')).toBeChecked();
    expect(screen.queryByText('Select at least one protocol to proxy')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockSavePreferences).toHaveBeenCalledTimes(2);
    }, { timeout: 1500 });
    const savedConfig = store.getState().app.preferences.proxy.config;
    expect('targetProtocols' in savedConfig).toBe(false);
    unmount();
  });

  it('supports SOCKS5 protocol alongside targetProtocols selection', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderProxySettings();

    await user.click(screen.getByTestId('preferences-proxy-protocol'));
    await user.click(await screen.findByTestId('preferences-proxy-protocol-menu-socks5'));
    await user.click(screen.getByTestId('preferences-proxy-protocol-http'));

    await waitFor(() => {
      expect(store.getState().app.preferences.proxy.config).toEqual(
        expect.objectContaining({
          protocol: 'socks5',
          targetProtocols: {
            http: false,
            https: true
          }
        })
      );
    }, { timeout: 1500 });
    expect(mockSavePreferences).toHaveBeenCalled();
    unmount();
  });
});
