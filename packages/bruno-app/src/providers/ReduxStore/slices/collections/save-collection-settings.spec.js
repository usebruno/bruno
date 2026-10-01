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
import toast from 'react-hot-toast';
import collectionsReducer, {
  updateCollectionRequestScript,
  updateCollectionTests,
  updateCollectionProxy,
  updateCollectionClientCertificates
} from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings, saveMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_1_UID = 'col-1';
const COLLECTION_1_PATH = '/tmp/collection-1';
const COLLECTION_2_UID = 'col-2';
const COLLECTION_2_PATH = '/tmp/collection-2';
const SCRIPT = 'bru.setVar("x", 1);';
const TESTS = 'test("ok", () => {});';
const PROXY = { enabled: true, hostname: 'proxy.local', port: 8080 };
const CERTS = { enabled: true, certs: [{ domain: 'api.local', type: 'cert', certFilePath: 'a.pem' }] };

// Fake disk for yml collections, keyed by collection pathname. opencollection.yml holds BOTH
// the root and the config, and the main process rewrites the whole file from the arguments of
// each IPC call, exactly like 'renderer:save-collection-root' and 'renderer:update-bruno-config' do.
let disks;
let failingPathname;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  disks = {};
  failingPathname = null;
  toast.error.mockClear();
  window.ipcRenderer = {
    invoke: jest.fn(async (channel, ...args) => {
      if (channel === 'renderer:save-collection-root') {
        const [pathname, root, brunoConfig] = args;
        await wait(10); // slower than the config write, so concurrent calls would race
        if (pathname === failingPathname) throw new Error('disk full');
        disks[pathname] = { root, brunoConfig };
      }
      if (channel === 'renderer:update-bruno-config') {
        const [brunoConfig, pathname, root] = args;
        if (pathname === failingPathname) throw new Error('disk full');
        disks[pathname] = { root, brunoConfig };
      }
    })
  };
});

const makeCollection = (uid, pathname, name) => ({
  uid,
  name,
  pathname,
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
  brunoConfig: { name, version: '1', proxy: { enabled: false } },
  items: [],
  environments: []
});

const createStore = (collections = [makeCollection(COLLECTION_1_UID, COLLECTION_1_PATH, 'Collection 1')]) => configureStore({
  reducer: { collections: collectionsReducer },
  preloadedState: { collections: { collections } }
});

const getCollection = (store, uid = COLLECTION_1_UID) => store.getState().collections.collections.find((c) => c.uid === uid);

describe('saveCollectionSettings', () => {
  it('saves a script-only draft', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_1_UID, script: SCRIPT }));

    await store.dispatch(saveCollectionSettings(COLLECTION_1_UID));

    expect(disks[COLLECTION_1_PATH].root.request.script.req).toBe(SCRIPT);
    expect(disks[COLLECTION_1_PATH].brunoConfig.proxy).toEqual({ enabled: false });
    expect(getCollection(store).draft).toBeNull();
  });

  it('saves a proxy-only draft', async () => {
    const store = createStore();
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_1_UID, proxy: PROXY }));

    await store.dispatch(saveCollectionSettings(COLLECTION_1_UID));

    expect(disks[COLLECTION_1_PATH].brunoConfig.proxy).toEqual(PROXY);
    expect(disks[COLLECTION_1_PATH].root.request.script.req).toBe('');
    expect(getCollection(store).draft).toBeNull();
  });

  it('saves unsaved script changes together with proxy changes', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_1_UID, script: SCRIPT }));
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_1_UID, proxy: PROXY }));

    await store.dispatch(saveCollectionSettings(COLLECTION_1_UID));

    expect(disks[COLLECTION_1_PATH].root.request.script.req).toBe(SCRIPT);
    expect(disks[COLLECTION_1_PATH].brunoConfig.proxy).toEqual(PROXY);

    const saved = getCollection(store);
    expect(saved.draft).toBeNull();
    expect(saved.root.request.script.req).toBe(SCRIPT);
    expect(saved.brunoConfig.proxy).toEqual(PROXY);
  });

  it('saves unsaved tests together with client certificate changes', async () => {
    const store = createStore();
    store.dispatch(updateCollectionTests({ collectionUid: COLLECTION_1_UID, tests: TESTS }));
    store.dispatch(updateCollectionClientCertificates({ collectionUid: COLLECTION_1_UID, clientCertificates: CERTS }));

    await store.dispatch(saveCollectionSettings(COLLECTION_1_UID));

    expect(disks[COLLECTION_1_PATH].root.request.tests).toBe(TESTS);
    expect(disks[COLLECTION_1_PATH].brunoConfig.clientCertificates).toEqual(CERTS);
  });
});

describe('saveMultipleCollections', () => {
  it('saves unsaved script changes together with proxy changes', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_1_UID, script: SCRIPT }));
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_1_UID, proxy: PROXY }));

    await store.dispatch(saveMultipleCollections([{ collectionUid: COLLECTION_1_UID }]));

    expect(disks[COLLECTION_1_PATH].root.request.script.req).toBe(SCRIPT);
    expect(disks[COLLECTION_1_PATH].brunoConfig.proxy).toEqual(PROXY);
    expect(getCollection(store).draft).toBeNull();
  });

  it('writes each collection\'s own draft to its own path', async () => {
    const store = createStore([
      makeCollection(COLLECTION_1_UID, COLLECTION_1_PATH, 'Collection 1'),
      makeCollection(COLLECTION_2_UID, COLLECTION_2_PATH, 'Collection 2')
    ]);
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_1_UID, script: SCRIPT }));
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_2_UID, proxy: PROXY }));

    await store.dispatch(saveMultipleCollections([{ collectionUid: COLLECTION_1_UID }, { collectionUid: COLLECTION_2_UID }]));

    expect(disks[COLLECTION_1_PATH].root.request.script.req).toBe(SCRIPT);
    expect(disks[COLLECTION_1_PATH].brunoConfig.proxy).toEqual({ enabled: false });
    expect(disks[COLLECTION_2_PATH].root.request.script.req).toBe('');
    expect(disks[COLLECTION_2_PATH].brunoConfig.proxy).toEqual(PROXY);
    expect(getCollection(store, COLLECTION_1_UID).draft).toBeNull();
    expect(getCollection(store, COLLECTION_2_UID).draft).toBeNull();
  });

  it('skips unknown collection uids and still saves the known ones', async () => {
    const store = createStore();
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_1_UID, proxy: PROXY }));

    await store.dispatch(saveMultipleCollections([{ collectionUid: 'missing' }, { collectionUid: COLLECTION_1_UID }]));

    expect(Object.keys(disks)).toEqual([COLLECTION_1_PATH]);
    expect(disks[COLLECTION_1_PATH].brunoConfig.proxy).toEqual(PROXY);
    expect(getCollection(store).draft).toBeNull();
  });

  it('rejects when one collection fails to save but keeps the others saved', async () => {
    const store = createStore([
      makeCollection(COLLECTION_1_UID, COLLECTION_1_PATH, 'Collection 1'),
      makeCollection(COLLECTION_2_UID, COLLECTION_2_PATH, 'Collection 2')
    ]);
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_1_UID, proxy: PROXY }));
    store.dispatch(updateCollectionProxy({ collectionUid: COLLECTION_2_UID, proxy: PROXY }));
    failingPathname = COLLECTION_2_PATH;

    await expect(
      store.dispatch(saveMultipleCollections([{ collectionUid: COLLECTION_1_UID }, { collectionUid: COLLECTION_2_UID }]))
    ).rejects.toThrow('disk full');

    expect(toast.error).toHaveBeenCalledWith('Failed to save collection settings!');
    expect(disks[COLLECTION_1_PATH].brunoConfig.proxy).toEqual(PROXY);
    expect(disks[COLLECTION_2_PATH]).toBeUndefined();
    expect(getCollection(store, COLLECTION_1_UID).draft).toBeNull();
    expect(getCollection(store, COLLECTION_2_UID).draft.brunoConfig.proxy).toEqual(PROXY);
  });
});
