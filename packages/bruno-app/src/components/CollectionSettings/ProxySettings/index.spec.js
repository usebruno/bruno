import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, useSelector } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import lightTheme from 'themes/light/light';
import ProxySettings from './index';

const mockUpdateCollectionProxy = jest.fn();
const mockSaveCollectionSettings = jest.fn();

jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateCollectionProxy: (...args) => mockUpdateCollectionProxy(...args)
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveCollectionSettings: (...args) => mockSaveCollectionSettings(...args)
}));

jest.mock('providers/Theme', () => ({
  useTheme: () => ({ storedTheme: 'light' })
}));

jest.mock('./StyledWrapper', () => ({ children, className }) => (
  <div className={className}>{children}</div>
));
jest.mock('components/InfoTip', () => () => null);
jest.mock('components/SensitiveFieldWarning', () => () => null);
jest.mock('components/SingleLineEditor', () => ({
  value,
  onChange,
  onSave,
  'data-testid': dataTestId
}) => (
  <input
    data-testid={dataTestId}
    value={value || ''}
    onChange={(e) => onChange?.(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') onSave?.();
    }}
  />
));

const createCollectionsSlice = (initialCollection) => createSlice({
  name: 'collections',
  initialState: {
    collections: [initialCollection]
  },
  reducers: {
    updateCollectionProxy: (state, action) => {
      const { collectionUid, proxy } = action.payload;
      const collection = state.collections.find((c) => c.uid === collectionUid);
      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            brunoConfig: { ...(collection.brunoConfig || {}) }
          };
        }
        collection.draft.brunoConfig = {
          ...(collection.draft.brunoConfig || {}),
          proxy
        };
      }
    }
  }
});

const ConnectedProxySettings = () => {
  const collection = useSelector((state) => state.collections.collections[0]);
  return <ProxySettings collection={collection} />;
};

const renderCollectionProxySettings = (proxyOverrides = {}) => {
  const initialCollection = {
    uid: 'col-1',
    brunoConfig: {
      proxy: {
        disabled: false,
        inherit: false,
        ...proxyOverrides,
        config: {
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8888,
          auth: {
            disabled: true,
            username: '',
            password: ''
          },
          bypassProxy: '',
          ...(proxyOverrides.config || {})
        }
      }
    }
  };

  const collectionsSlice = createCollectionsSlice(initialCollection);
  const store = configureStore({
    reducer: {
      collections: collectionsSlice.reducer
    }
  });

  mockUpdateCollectionProxy.mockImplementation((payload) =>
    collectionsSlice.actions.updateCollectionProxy(payload)
  );
  mockSaveCollectionSettings.mockImplementation((collectionUid) => () => Promise.resolve(collectionUid));

  const result = render(
    <Provider store={store}>
      <ThemeProvider theme={lightTheme}>
        <ConnectedProxySettings />
      </ThemeProvider>
    </Provider>
  );

  return { store, ...result };
};

describe('CollectionSettings ProxySettings - targetProtocols', () => {
  it('defaults both HTTP and HTTPS checkboxes to checked when config.targetProtocols is omitted', () => {
    renderCollectionProxySettings();

    expect(screen.getByTestId('collection-proxy-protocol-http')).toBeChecked();
    expect(screen.getByTestId('collection-proxy-protocol-https')).toBeChecked();
    expect(screen.queryByText('Select at least one protocol to proxy')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('dispatches { http: false, https: true } when HTTP is unchecked (HTTPS-only)', async () => {
    const user = userEvent.setup();
    const { store } = renderCollectionProxySettings();

    await user.click(screen.getByTestId('collection-proxy-protocol-http'));

    expect(screen.getByTestId('collection-proxy-protocol-http')).not.toBeChecked();
    expect(screen.getByTestId('collection-proxy-protocol-https')).toBeChecked();
    expect(store.getState().collections.collections[0].draft.brunoConfig.proxy.config.targetProtocols).toEqual({
      http: false,
      https: true
    });
  });

  it('dispatches { http: true, https: false } when HTTPS is unchecked (HTTP-only)', async () => {
    const user = userEvent.setup();
    const { store } = renderCollectionProxySettings();

    await user.click(screen.getByTestId('collection-proxy-protocol-https'));

    expect(screen.getByTestId('collection-proxy-protocol-http')).toBeChecked();
    expect(screen.getByTestId('collection-proxy-protocol-https')).not.toBeChecked();
    expect(store.getState().collections.collections[0].draft.brunoConfig.proxy.config.targetProtocols).toEqual({
      http: true,
      https: false
    });
  });

  it('shows inline error, disables Save button, and blocks handleSave when both protocols are unchecked', async () => {
    const user = userEvent.setup();
    const { store } = renderCollectionProxySettings({
      config: {
        targetProtocols: { http: true, https: false }
      }
    });

    await user.click(screen.getByTestId('collection-proxy-protocol-http'));

    expect(screen.getByTestId('collection-proxy-protocol-http')).not.toBeChecked();
    expect(screen.getByTestId('collection-proxy-protocol-https')).not.toBeChecked();
    expect(store.getState().collections.collections[0].draft.brunoConfig.proxy.config.targetProtocols).toEqual({
      http: false,
      https: false
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one protocol to proxy');
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    fireEvent.click(saveButton);
    await user.type(screen.getByTestId('collection-proxy-hostname'), '{Enter}');
    expect(mockSaveCollectionSettings).not.toHaveBeenCalled();
  });

  it('does not disable Save when switching mode away from Custom while both targetProtocols are false', async () => {
    const user = userEvent.setup();
    renderCollectionProxySettings({
      config: {
        targetProtocols: { http: false, https: false }
      }
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Inherit' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);
    expect(mockSaveCollectionSettings).toHaveBeenCalledWith('col-1');
  });

  it('omits config.targetProtocols when re-checking both protocols', async () => {
    const user = userEvent.setup();
    const { store } = renderCollectionProxySettings({
      config: {
        targetProtocols: { http: false, https: true }
      }
    });

    await user.click(screen.getByTestId('collection-proxy-protocol-http'));

    expect(screen.getByTestId('collection-proxy-protocol-http')).toBeChecked();
    expect(screen.getByTestId('collection-proxy-protocol-https')).toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    const savedConfig = store.getState().collections.collections[0].draft.brunoConfig.proxy.config;
    expect('targetProtocols' in savedConfig).toBe(false);
  });

  it('supports SOCKS5 protocol alongside targetProtocols selection', async () => {
    const user = userEvent.setup();
    const { store } = renderCollectionProxySettings();

    await user.click(screen.getByTestId('collection-proxy-protocol'));
    await user.click(await screen.findByTestId('collection-proxy-protocol-menu-socks5'));
    await user.click(screen.getByTestId('collection-proxy-protocol-http'));

    const savedConfig = store.getState().collections.collections[0].draft.brunoConfig.proxy.config;
    expect(savedConfig.protocol).toBe('socks5');
    expect(savedConfig.targetProtocols).toEqual({
      http: false,
      https: true
    });
  });
});
