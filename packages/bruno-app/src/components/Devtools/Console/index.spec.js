import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';

jest.mock('./TerminalTab', () => () => null);
jest.mock('./RequestDetailsPanel', () => () => null);
jest.mock('./ErrorDetailsPanel', () => () => null);
jest.mock('../Performance', () => () => null);

import Console from './index';

const makeRequest = (overrides = {}) => ({
  type: 'request',
  timestamp: overrides.timestamp ?? 1000,
  collectionUid: overrides.collectionUid ?? 'col-1',
  itemUid: overrides.itemUid ?? 'item-1',
  data: {
    request: {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? 'https://example.com/api/users'
    },
    response: {
      status: overrides.status ?? 200,
      statusCode: overrides.statusCode ?? 200,
      duration: overrides.duration ?? 100,
      size: overrides.size ?? 512
    },
    timestamp: overrides.timestamp ?? 1000
  }
});

const makeScriptedRequest = (overrides = {}) => ({
  type: 'scripted-request',
  timestamp: overrides.timestamp ?? 1000,
  collectionUid: overrides.collectionUid ?? 'col-1',
  itemUid: overrides.itemUid ?? 'item-1',
  data: {
    request: {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? 'https://example.com/api/scripted'
    },
    response: {
      status: overrides.status ?? 200,
      statusCode: overrides.statusCode ?? 200,
      duration: overrides.duration ?? 100,
      size: overrides.size ?? 512
    }
  }
});

const ALL_LOG_FILTERS = { error: true, warn: true, info: true, log: true };
const ALL_NETWORK_FILTERS = { GET: true, POST: true, PUT: true, DELETE: true, PATCH: true, HEAD: true, OPTIONS: true };

const renderConsole = (timeline = []) => {
  const store = configureStore({
    reducer: {
      collections: (state = {
        collections: [{
          uid: 'col-1',
          name: 'Test Collection',
          timeline
        }]
      }) => state,
      logs: (state = {
        logs: [],
        filters: ALL_LOG_FILTERS,
        activeTab: 'network',
        selectedRequest: null,
        selectedError: null,
        networkFilters: ALL_NETWORK_FILTERS,
        debugErrors: [],
        requestDetailsPanelWidth: 360
      }) => state
    }
  });

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <Console />
      </ThemeProvider>
    </Provider>
  );
};

describe('network filter counts', () => {
  it('includes scripted requests in method counts', () => {
    renderConsole([
      makeRequest({ itemUid: 'main-get', method: 'GET' }),
      makeScriptedRequest({ itemUid: 'scripted-get', method: 'GET' }),
      makeRequest({ itemUid: 'main-post', method: 'POST' })
    ]);

    fireEvent.click(screen.getByTitle('Filter requests by method'));

    expect(screen.getByTestId('network-filter-option-GET')).toBeInTheDocument();
    expect(screen.getByTestId('network-filter-option-POST')).toBeInTheDocument();
    expect(screen.getByTestId('network-filter-count-GET')).toHaveTextContent('(2)');
    expect(screen.getByTestId('network-filter-count-POST')).toHaveTextContent('(1)');
  });
});
