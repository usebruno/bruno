import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import AppPreviewKeepAlive from './index';

const collectionSnapshots = { appView: null, collectionApp: null };

jest.mock('components/AppView', () => ({ item, collection }) => {
  collectionSnapshots.appView = collection;
  return <div data-testid="mock-app-view">{item.name}</div>;
});
jest.mock('components/CollectionApp', () => ({ item, collection }) => {
  collectionSnapshots.collectionApp = collection;
  return <div data-testid="mock-collection-app">{item.name}</div>;
});
jest.mock('components/RequestTabPanel/TabPanelErrorBoundary', () => ({ children }) => children);
jest.mock('hooks/usePersistedState/PersistedScopeProvider', () => ({
  ScopedPersistenceProvider: ({ children }) => children
}));

const makeStore = ({ tabs, activeTabUid, collections, globalEnvironments = [], activeGlobalEnvironmentUid = null }) => {
  const tabsSlice = createSlice({
    name: 'tabs',
    initialState: { tabs, activeTabUid },
    reducers: {
      focusTab: (state, action) => {
        state.activeTabUid = action.payload;
      },
      closeTab: (state, action) => {
        state.tabs = state.tabs.filter((t) => t.uid !== action.payload);
      }
    }
  });
  const collectionsSlice = createSlice({
    name: 'collections',
    initialState: { collections },
    reducers: {}
  });
  const globalEnvironmentsSlice = createSlice({
    name: 'globalEnvironments',
    initialState: { globalEnvironments, activeGlobalEnvironmentUid },
    reducers: {}
  });
  return {
    store: configureStore({
      reducer: {
        tabs: tabsSlice.reducer,
        collections: collectionsSlice.reducer,
        globalEnvironments: globalEnvironmentsSlice.reducer
      }
    }),
    actions: tabsSlice.actions
  };
};

const requestAppItem = {
  uid: 'item-1',
  name: 'My Request App',
  type: 'http-request',
  app: { enabled: true, code: '<div>hi</div>' },
  request: {}
};

const plainRequestItem = {
  uid: 'item-2',
  name: 'Plain Request',
  type: 'http-request',
  request: {}
};

const standaloneAppItem = {
  uid: 'item-3',
  name: 'Standalone App',
  type: 'app'
};

const collection = {
  uid: 'coll-1',
  items: [requestAppItem, plainRequestItem, standaloneAppItem]
};

const tabFor = (item) => ({ uid: item.uid, collectionUid: 'coll-1', type: item.type, pathname: '' });

describe('AppPreviewKeepAlive', () => {
  beforeEach(() => {
    collectionSnapshots.appView = null;
    collectionSnapshots.collectionApp = null;
  });

  it('renders nothing when no app tab has been activated', () => {
    const { store } = makeStore({
      tabs: [tabFor(plainRequestItem)],
      activeTabUid: plainRequestItem.uid,
      collections: [collection]
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(screen.queryByTestId('app-preview-keepalive')).not.toBeInTheDocument();
  });

  it('mounts the active app tab and keeps it mounted (hidden) after switching away', () => {
    const { store, actions } = makeStore({
      tabs: [tabFor(requestAppItem), tabFor(plainRequestItem)],
      activeTabUid: requestAppItem.uid,
      collections: [collection]
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);

    const slot = screen.getByTestId('mock-app-view').closest('.app-preview-slot');
    expect(slot).toHaveClass('active');

    act(() => store.dispatch(actions.focusTab(plainRequestItem.uid)));

    // Still mounted — that's the whole point — but no longer the active slot.
    const hiddenSlot = screen.getByTestId('mock-app-view').closest('.app-preview-slot');
    expect(hiddenSlot).not.toHaveClass('active');
    expect(hiddenSlot).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not mount request apps when the app is not enabled', () => {
    const gatedItem = {
      ...requestAppItem,
      uid: 'item-gated',
      app: { enabled: false, code: '<div>hi</div>' }
    };
    const gatedCollection = { uid: 'coll-1', items: [gatedItem] };
    const { store } = makeStore({
      tabs: [tabFor(gatedItem)],
      activeTabUid: gatedItem.uid,
      collections: [gatedCollection]
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(screen.queryByTestId('mock-app-view')).not.toBeInTheDocument();
  });

  it('does not mount request apps whose tab has preview explicitly off', () => {
    const { store } = makeStore({
      tabs: [{ ...tabFor(requestAppItem), appPreview: false }],
      activeTabUid: requestAppItem.uid,
      collections: [collection]
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(screen.queryByTestId('mock-app-view')).not.toBeInTheDocument();
  });

  it('does not mount app tabs that were never activated', () => {
    const { store } = makeStore({
      tabs: [tabFor(requestAppItem), tabFor(standaloneAppItem)],
      activeTabUid: standaloneAppItem.uid,
      collections: [collection]
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(screen.getByTestId('mock-collection-app')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-app-view')).not.toBeInTheDocument();
  });

  it('unmounts a kept-alive app when its tab closes', () => {
    const { store, actions } = makeStore({
      tabs: [tabFor(requestAppItem), tabFor(plainRequestItem)],
      activeTabUid: requestAppItem.uid,
      collections: [collection]
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(screen.getByTestId('mock-app-view')).toBeInTheDocument();

    act(() => store.dispatch(actions.focusTab(plainRequestItem.uid)));
    act(() => store.dispatch(actions.closeTab(requestAppItem.uid)));

    expect(screen.queryByTestId('mock-app-view')).not.toBeInTheDocument();
  });

  it('folds the active global environment into the collection reaching request apps', () => {
    const { store } = makeStore({
      tabs: [tabFor(requestAppItem)],
      activeTabUid: requestAppItem.uid,
      collections: [collection],
      globalEnvironments: [
        {
          uid: 'g1',
          variables: [
            { name: 'base_url', value: 'https://httpbin.org', enabled: true },
            { name: 'token', value: 't', enabled: true, secret: true }
          ]
        }
      ],
      activeGlobalEnvironmentUid: 'g1'
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(collectionSnapshots.appView.globalEnvironmentVariables).toEqual({
      base_url: 'https://httpbin.org',
      token: 't'
    });
    expect(collectionSnapshots.appView.globalEnvSecrets).toEqual(['token']);
  });

  it('folds the active global environment into the collection reaching standalone apps', () => {
    const { store } = makeStore({
      tabs: [tabFor(standaloneAppItem)],
      activeTabUid: standaloneAppItem.uid,
      collections: [collection],
      globalEnvironments: [
        { uid: 'g1', variables: [{ name: 'base_url', value: 'https://httpbin.org', enabled: true }] }
      ],
      activeGlobalEnvironmentUid: 'g1'
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(collectionSnapshots.collectionApp.globalEnvironmentVariables).toEqual({
      base_url: 'https://httpbin.org'
    });
  });

  it('ignores special tab types that resolve to app items via pathname', () => {
    const exampleTab = {
      uid: 'ex-1',
      collectionUid: 'coll-1',
      type: 'response-example',
      pathname: '',
      itemUid: requestAppItem.uid
    };
    const { store } = makeStore({
      tabs: [exampleTab],
      activeTabUid: exampleTab.uid,
      collections: [collection]
    });
    render(<Provider store={store}><AppPreviewKeepAlive /></Provider>);
    expect(screen.queryByTestId('app-preview-keepalive')).not.toBeInTheDocument();
  });
});
