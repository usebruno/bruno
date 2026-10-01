jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, {
  updateCollectionRequestScript,
  updateCollectionTests,
  updateCollectionProxy,
  updateCollectionClientCertificates
} from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings, saveMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_UID = 'col-1';
const SCRIPT = 'bru.setVar("x", 1);';
const TESTS = 'test("ok", () => {});';
const PROXY = { enabled: true, hostname: 'proxy.local', port: 8080 };
const CERTS = { enabled: true, certs: [{ domain: 'api.local', type: 'cert', certFilePath: 'a.pem' }] };

let disk;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  disk = { root: null, brunoConfig: null };
  window.ipcRenderer = {
    invoke: jest.fn(async (channel, ...args) => {
      if (channel === 'renderer:save-collection-root') {
        const [, root, brunoConfig] = args;
        await wait(10); // slower than the config write, so concurrent calls would race
        disk = { root, brunoConfig };
      }
      if (channel === 'renderer:update-bruno-config') {
        const [brunoConfig, , root] = args;
        disk = { root, brunoConfig };
      }
    })
  };
});

const createStore = () => configureStore({
  reducer: { collections: collectionsReducer },
  preloadedState: {
    collections: {
      collections: [{
        uid: COLLECTION_UID,
        name: 'Test Collection',
        pathname: '/tmp/test-collection',
        format: 'yml',
        root: {
          request: {
            headers: [],
            auth: { mode: 'none' },
            script: { req: '', res: '' },
            vars: { req: [], res: [] },
            tests: ''
          }
        },
        brunoConfig: { name: 'Test Collection', version: '1', proxy: { enabled: false } },
        items: [],
        environments: []
      }]
    }
  }
});

const getCollection = (store) => store.getState().collections.collections[0];

describe('saveCollectionSettings', () => {
  it('saves a script-only draft', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_UID, script: SCRIPT }));

    await store.dispatch(saveCollectionSettings(COLLECTION_UID));

    expect(disk.root.request.script.req).toBe(SCRIPT);
    expect(disk.brunoConfig.proxy).toEqual({ enabled: false });
    expect(getCollection(store).draft).toBeNull();
  });

  it('saves a proxy-only draft', async () => {
    const store = createStore();
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_UID, proxy: PROXY }));

    await store.dispatch(saveCollectionSettings(COLLECTION_UID));

    expect(disk.brunoConfig.proxy).toEqual(PROXY);
    expect(disk.root.request.script.req).toBe('');
    expect(getCollection(store).draft).toBeNull();
  });

  it('saves unsaved script changes together with proxy changes', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_UID, script: SCRIPT }));
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_UID, proxy: PROXY }));

    await store.dispatch(saveCollectionSettings(COLLECTION_UID));

    expect(disk.root.request.script.req).toBe(SCRIPT);
    expect(disk.brunoConfig.proxy).toEqual(PROXY);

    const saved = getCollection(store);
    expect(saved.draft).toBeNull();
    expect(saved.root.request.script.req).toBe(SCRIPT);
    expect(saved.brunoConfig.proxy).toEqual(PROXY);
  });

  it('saves unsaved tests together with client certificate changes', async () => {
    const store = createStore();
    store.dispatch(updateCollectionTests({ collectionUid: COLLECTION_UID, tests: TESTS }));
    store.dispatch(updateCollectionClientCertificates({ collectionUid: COLLECTION_UID, clientCertificates: CERTS }));

    await store.dispatch(saveCollectionSettings(COLLECTION_UID));

    expect(disk.root.request.tests).toBe(TESTS);
    expect(disk.brunoConfig.clientCertificates).toEqual(CERTS);
  });
});

describe('saveMultipleCollections', () => {
  it('saves unsaved script changes together with proxy changes', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_UID, script: SCRIPT }));
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_UID, proxy: PROXY }));

    await store.dispatch(saveMultipleCollections([{ collectionUid: COLLECTION_UID }]));

    expect(disk.root.request.script.req).toBe(SCRIPT);
    expect(disk.brunoConfig.proxy).toEqual(PROXY);
    expect(getCollection(store).draft).toBeNull();
  });
});
