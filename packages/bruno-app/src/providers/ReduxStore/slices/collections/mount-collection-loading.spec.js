const { describe, it, expect } = require('@jest/globals');
const { configureStore } = require('@reduxjs/toolkit');

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const collectionsReducer = require('providers/ReduxStore/slices/collections').default;
const { updateCollectionLoadingState } = require('providers/ReduxStore/slices/collections');
const { mountCollection } = require('providers/ReduxStore/slices/collections/actions');

const makeStore = (fileCacheEnabled = false) => configureStore({
  reducer: {
    app: (state = { preferences: { cache: { file: { enabled: fileCacheEnabled } } } }) => state,
    collections: collectionsReducer
  },
  preloadedState: {
    app: { preferences: { cache: { file: { enabled: fileCacheEnabled } } } },
    collections: {
      collectionSortOrder: 'default',
      collections: [{
        uid: 'col-1',
        pathname: '/tmp/col-1',
        mountStatus: 'unmounted',
        isLoading: false,
        environments: [],
        collapsed: false,
        items: []
      }],
      tempDirectories: {}
    }
  }
});

const collectionState = (store) => store.getState().collections.collections[0];

describe('mountCollection loading', () => {
  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('sets isLoading immediately when mount starts', () => {
    let resolveMount;
    window.ipcRenderer = {
      invoke: jest.fn(() => new Promise((resolve) => {
        resolveMount = resolve;
      }))
    };

    const store = makeStore();
    store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: '/tmp/col-1',
      brunoConfig: {}
    }));

    expect(store.getState().collections.collections[0]).toMatchObject({
      mountStatus: 'mounting',
      isLoading: true
    });

    resolveMount('/tmp/transient');
  });

  it('clears isLoading when mount IPC fails', async () => {
    window.ipcRenderer = {
      invoke: jest.fn(() => Promise.reject(new Error('mount failed')))
    };

    const store = makeStore();
    await expect(store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: '/tmp/col-1',
      brunoConfig: {}
    }))).rejects.toBeUndefined();

    expect(collectionState(store)).toMatchObject({
      mountStatus: 'unmounted',
      isLoading: false
    });
  });

  it('sets isLoading immediately on a v2 mount and uses the v2 IPC channel', () => {
    window.ipcRenderer = {
      invoke: jest.fn(() => new Promise(() => {}))
    };

    const store = makeStore(true);
    store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: '/tmp/col-1',
      brunoConfig: {},
      skipTabRestore: true
    }));

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:mount-collection-v2',
      expect.objectContaining({ collectionUid: 'col-1' })
    );
    expect(collectionState(store)).toMatchObject({
      mountStatus: 'mounting',
      isLoading: true
    });
  });

  it('clears isLoading when a v2 mount IPC fails', async () => {
    window.ipcRenderer = {
      invoke: jest.fn(() => Promise.reject(new Error('mount failed')))
    };

    const store = makeStore(true);
    await expect(store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: '/tmp/col-1',
      brunoConfig: {},
      skipTabRestore: true
    }))).rejects.toBeUndefined();

    expect(collectionState(store)).toMatchObject({
      mountStatus: 'unmounted',
      isLoading: false
    });
  });

  it('keeps isLoading true after a v2 mount succeeds until the v2 loading event clears it', async () => {
    window.ipcRenderer = {
      invoke: jest.fn((channel) => {
        if (channel === 'renderer:mount-collection-v2') {
          return Promise.resolve('/tmp/transient');
        }
        if (channel === 'renderer:snapshot:get-collection') {
          return Promise.resolve(null);
        }
        return Promise.resolve();
      })
    };

    const store = makeStore(true);
    await store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: '/tmp/col-1',
      brunoConfig: {},
      skipTabRestore: true
    }));

    expect(collectionState(store)).toMatchObject({
      mountStatus: 'mounted',
      isLoading: true
    });

    store.dispatch(updateCollectionLoadingState({ collectionUid: 'col-1', isLoading: false }));

    expect(collectionState(store).isLoading).toBe(false);
  });
});
