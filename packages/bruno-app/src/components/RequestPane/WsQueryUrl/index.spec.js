/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

const mockCloseWsConnection = jest.fn(() => Promise.resolve({ success: true }));
const mockGetWsConnectionStatus = jest.fn(() => Promise.resolve({ status: 'disconnected' }));
const mockWsConnectOnly = jest.fn(() => () => Promise.resolve());

jest.mock('utils/network/index', () => ({
  closeWsConnection: (...args) => mockCloseWsConnection(...args),
  getWsConnectionStatus: (...args) => mockGetWsConnectionStatus(...args)
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  wsConnectOnly: (...args) => mockWsConnectOnly(...args),
  saveRequest: () => () => Promise.resolve()
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  requestUrlChanged: (payload) => ({ type: 'requestUrlChanged', payload })
}));

jest.mock('components/SingleLineEditor/index', () => {
  return function MockEditor({ value, onChange }) {
    return (
      <input
        data-testid="ws-url-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

jest.mock('components/RequestPane/SendButton', () => {
  return function MockSendButton() {
    return <button type="button">Send</button>;
  };
});

jest.mock('components/ToolHint', () => {
  return function MockToolHint({ children }) {
    return <>{children}</>;
  };
});

jest.mock('./StyledWrapper', () => {
  return function MockStyledWrapper({ children }) {
    return <div>{children}</div>;
  };
});

jest.mock('hooks/useDebounce', () => ({
  __esModule: true,
  default: (value) => value
}));

jest.mock('providers/Theme', () => ({
  useTheme: () => ({
    theme: {
      colors: { text: { danger: '#f00', green: '#0f0' } },
      draftColor: '#ff0',
      requestTabs: { icon: { color: '#999' } }
    },
    displayedTheme: 'light'
  })
}));

import WsQueryUrl from './index';

const theme = {
  colors: { text: { yellow: '#ca8a04' } }
};

const item = {
  uid: 'req-1',
  type: 'ws-request',
  request: { url: 'ws://localhost:9/path', body: { ws: [] } }
};

const collection = {
  uid: 'col-1',
  runtimeVariables: {},
  activeEnvironmentUid: null,
  environments: []
};

const renderWsQueryUrl = (overrideItem = item) => {
  const store = configureStore({
    reducer: {
      collections: (state = { collections: [collection] }) => state
    }
  });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <WsQueryUrl item={overrideItem} collection={collection} handleRun={jest.fn()} />
      </ThemeProvider>
    </Provider>
  );
};

describe('WsQueryUrl disconnect behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWsConnectionStatus.mockResolvedValue({ status: 'disconnected' });
  });

  it('does not call close again while already disconnecting (O2)', async () => {
    mockGetWsConnectionStatus.mockResolvedValue({ status: 'disconnecting' });
    renderWsQueryUrl();

    await waitFor(() => {
      expect(screen.getByTestId('ws-disconnect-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('ws-disconnect-button'));
    expect(mockCloseWsConnection).not.toHaveBeenCalled();
  });

  it('disconnects on URL change while connected without reconnecting (O3)', async () => {
    mockGetWsConnectionStatus.mockResolvedValue({ status: 'connected' });
    const { rerender } = renderWsQueryUrl();

    await waitFor(() => {
      expect(screen.getByTestId('ws-disconnect-button')).toBeInTheDocument();
    });

    const store = configureStore({
      reducer: {
        collections: (state = { collections: [collection] }) => state
      }
    });

    const changedItem = {
      ...item,
      request: { ...item.request, url: 'ws://localhost:9/other' }
    };

    await act(async () => {
      rerender(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <WsQueryUrl item={changedItem} collection={collection} handleRun={jest.fn()} />
          </ThemeProvider>
        </Provider>
      );
    });

    await waitFor(() => {
      expect(mockCloseWsConnection).toHaveBeenCalledWith('req-1');
    });
    expect(mockWsConnectOnly).not.toHaveBeenCalled();
  });
});
