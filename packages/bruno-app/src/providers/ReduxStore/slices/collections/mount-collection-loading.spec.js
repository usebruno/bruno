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
const { mountCollection } = require('providers/ReduxStore/slices/collections/actions');

const makeStore = () => configureStore({
  reducer: {
    app: (state = { preferences: { cache: { file: { enabled: false } } } }) => state,
    collections: collectionsReducer
  },
  preloadedState: {
    app: { preferences: { cache: { file: { enabled: false } } } },
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

    expect(store.getState().collections.collections[0]).toMatchObject({
      mountStatus: 'unmounted',
      isLoading: false
    });
  });
});
