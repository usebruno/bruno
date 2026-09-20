import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import GlobalSearchModal from './index';

jest.mock('react-virtuoso', () => {
  const mockReact = require('react');
  return {
    Virtuoso: ({ data, itemContent }) => mockReact.createElement(
      'div',
      null,
      data.map((item, index) => mockReact.createElement(mockReact.Fragment, { key: index }, itemContent(index, item)))
    )
  };
});

const mockInvoke = jest.fn();
window.ipcRenderer = { invoke: (...args) => mockInvoke(...args) };

const mountedCollection = {
  uid: 'col-mounted',
  name: 'Mounted Collection',
  pathname: '/mounted',
  mountStatus: 'mounted',
  collapsed: true,
  items: [{
    uid: 'req-mounted',
    type: 'http-request',
    name: 'Get Mounted Users',
    pathname: '/mounted/get.bru',
    request: { method: 'GET', url: 'https://x.test' }
  }]
};

const unmountedCollection = {
  uid: 'col-unmounted',
  name: 'Unmounted Collection',
  pathname: '/unmounted',
  mountStatus: 'unmounted',
  collapsed: true,
  items: []
};

const makeStore = (collections) => {
  const slice = createSlice({ name: 'root', initialState: {}, reducers: {} });
  return configureStore({
    reducer: {
      collections: () => ({ collections }),
      workspaces: () => ({ workspaces: [], activeWorkspaceUid: null }),
      tabs: () => ({ tabs: [] }),
      app: slice.reducer
    }
  });
};

const renderModal = (collections) => render(
  <Provider store={makeStore(collections)}>
    <ThemeProvider theme={themes.light}>
      <GlobalSearchModal isOpen onClose={jest.fn()} />
    </ThemeProvider>
  </Provider>
);

beforeEach(() => {
  jest.useFakeTimers();
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

const type = async (value) => {
  const input = screen.getByTestId('global-search-input');
  fireEvent.change(input, { target: { value } });
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
};

const findResultByName = (name) => screen.findByText(
  (_, element) => element?.className === 'result-name' && element.textContent === name
);

describe('GlobalSearchModal', () => {
  it('shows results from a mounted collection without touching the index', async () => {
    renderModal([mountedCollection]);

    await type('users');

    expect(await findResultByName('Get Mounted Users')).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('queries the search index for collections that are not mounted', async () => {
    mockInvoke.mockResolvedValue([{
      uid: 'req-unmounted',
      name: 'Get Unmounted Orders',
      method: 'GET',
      url: 'https://x.test/orders',
      pathname: '/unmounted/get.bru',
      folderPath: '',
      collectionUid: 'col-unmounted',
      collectionName: 'Unmounted Collection'
    }]);
    renderModal([unmountedCollection]);

    await type('orders');

    expect(mockInvoke).toHaveBeenCalledWith('renderer:search-index-query', expect.objectContaining({
      collections: [expect.objectContaining({ uid: 'col-unmounted', pathname: '/unmounted' })],
      terms: ['orders']
    }));
    expect(await findResultByName('Get Unmounted Orders')).toBeInTheDocument();
  });

  it('merges mounted and index results together', async () => {
    mockInvoke.mockResolvedValue([{
      uid: 'req-unmounted',
      name: 'Get More Users',
      method: 'GET',
      url: 'https://x.test/more-users',
      pathname: '/unmounted/get.bru',
      folderPath: '',
      collectionUid: 'col-unmounted',
      collectionName: 'Unmounted Collection'
    }]);
    renderModal([mountedCollection, unmountedCollection]);

    await type('users');

    expect(await findResultByName('Get Mounted Users')).toBeInTheDocument();
    expect(await findResultByName('Get More Users')).toBeInTheDocument();
  });

  it('does not crash the search when the index query rejects', async () => {
    mockInvoke.mockRejectedValue(new Error('main process unavailable'));
    renderModal([mountedCollection, unmountedCollection]);

    await type('users');

    expect(await findResultByName('Get Mounted Users')).toBeInTheDocument();
  });
});
