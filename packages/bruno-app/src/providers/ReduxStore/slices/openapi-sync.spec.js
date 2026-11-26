import { configureStore } from '@reduxjs/toolkit';
import openapiSyncReducer, {
  checkActiveWorkspaceCollectionsForUpdates,
  approveSyncSource,
  dismissSyncSource,
  loadSyncSourceState,
  setCollectionUpdate,
  setDrift
} from './openapi-sync';

const collection = (uid, sourceUrl) => ({
  uid,
  pathname: `/ws/collections/${uid}`,
  brunoConfig: sourceUrl ? { openapi: [{ sourceUrl, autoCheck: true, autoCheckInterval: 5 }] } : {}
});

const buildStore = (collections) => configureStore({
  reducer: {
    openapiSync: openapiSyncReducer,
    collections: (state = { collections }) => state,
    workspaces: (state = {
      activeWorkspaceUid: 'ws',
      workspaces: [{ uid: 'ws', collections: collections.map((c) => ({ path: c.pathname })) }]
    }) => state
  }
});

describe('openapi-sync source approval', () => {
  let sourceStates;
  let invoke;

  beforeEach(() => {
    sourceStates = {};
    invoke = jest.fn(async (channel, request) => {
      const collectionUid = request.collectionPath.split('/').pop();
      switch (channel) {
        case 'renderer:get-openapi-sync-source-state':
          return sourceStates[collectionUid];
        case 'renderer:approve-openapi-sync-source':
          sourceStates[collectionUid] = { status: 'approved', source: request.sourceUrl, autoCheck: request.autoCheck, autoCheckInterval: request.autoCheckInterval };
          return sourceStates[collectionUid];
        case 'renderer:dismiss-openapi-sync-source':
          sourceStates[collectionUid] = { status: 'dismissed', autoCheck: false, autoCheckInterval: 5 };
          return sourceStates[collectionUid];
        case 'renderer:check-openapi-updates':
          return { hasUpdates: false };
        default:
          throw new Error(`unexpected channel ${channel}`);
      }
    });
    window.ipcRenderer = { invoke };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  const checkCalls = () => invoke.mock.calls.filter(([channel]) => channel === 'renderer:check-openapi-updates').map(([, request]) => request.collectionUid);

  it('never checks a collection whose source this user has not approved, even with auto check on in the collection file', async () => {
    const store = buildStore([collection('shared', 'http://127.0.0.1:4825/')]);
    sourceStates.shared = { status: 'pending', autoCheck: false, autoCheckInterval: 5 };

    await store.dispatch(checkActiveWorkspaceCollectionsForUpdates());

    expect(checkCalls()).toEqual([]);
    expect(store.getState().openapiSync.sourceStates.shared.status).toBe('pending');
  });

  it('checks an approved source with auto check on, and skips an approved one with it off', async () => {
    const store = buildStore([collection('mine', 'https://api.example.com/openapi.json'), collection('quiet', 'https://api.example.com/other.json')]);
    sourceStates.mine = { status: 'approved', autoCheck: true, autoCheckInterval: 5 };
    sourceStates.quiet = { status: 'approved', autoCheck: false, autoCheckInterval: 5 };

    await store.dispatch(checkActiveWorkspaceCollectionsForUpdates());

    expect(checkCalls()).toEqual(['mine']);
  });

  it('does not check a dismissed source', async () => {
    const store = buildStore([collection('shared', 'http://intranet/openapi.json')]);
    sourceStates.shared = { status: 'dismissed', autoCheck: false, autoCheckInterval: 5 };

    await store.dispatch(checkActiveWorkspaceCollectionsForUpdates());

    expect(checkCalls()).toEqual([]);
  });

  it('respects the approved interval from app data', async () => {
    const store = buildStore([collection('mine', 'https://api.example.com/openapi.json')]);
    sourceStates.mine = { status: 'approved', autoCheck: true, autoCheckInterval: 60 };

    await store.dispatch(checkActiveWorkspaceCollectionsForUpdates());
    await store.dispatch(checkActiveWorkspaceCollectionsForUpdates());

    expect(checkCalls()).toEqual(['mine']);
  });

  it('marks a first failed read so the tab can offer a retry, and keeps an earlier state on later failures', async () => {
    const shared = collection('shared', 'http://127.0.0.1:4825/');
    const store = buildStore([shared]);
    invoke.mockRejectedValueOnce(new Error('read failed'));

    await store.dispatch(loadSyncSourceState(shared));
    expect(store.getState().openapiSync.sourceStates.shared).toEqual({ status: 'error' });

    sourceStates.shared = { status: 'approved', autoCheck: true, autoCheckInterval: 5 };
    await store.dispatch(loadSyncSourceState(shared));
    invoke.mockRejectedValueOnce(new Error('read failed'));
    await store.dispatch(loadSyncSourceState(shared));
    expect(store.getState().openapiSync.sourceStates.shared.status).toBe('approved');
  });

  it('drops the last check results when a new source is approved, and keeps them when the same one is approved again', async () => {
    const shared = collection('shared', 'http://127.0.0.1:4825/');
    const store = buildStore([shared]);
    const seedResults = () => {
      store.dispatch(setCollectionUpdate({ collectionUid: 'shared', hasUpdates: true, error: null }));
      store.dispatch(setDrift({ collectionUid: 'shared', patch: { specDrift: { added: [{}] } } }));
    };
    const results = () => [store.getState().openapiSync.collectionUpdates.shared, store.getState().openapiSync.drift.shared];

    await store.dispatch(approveSyncSource(shared, { sourceUrl: 'http://127.0.0.1:4825/a.json' }));
    seedResults();
    await store.dispatch(approveSyncSource(shared, { sourceUrl: 'http://127.0.0.1:4825/a.json', autoCheckInterval: 15 }));
    expect(results().every(Boolean)).toBe(true);

    await store.dispatch(approveSyncSource(shared, { sourceUrl: 'http://127.0.0.1:4825/b.json' }));
    expect(results()).toEqual([undefined, undefined]);
  });

  it('drops the last check results when settings approve a new url before the file is saved', async () => {
    const shared = collection('shared', 'http://127.0.0.1:4825/a.json');
    const store = buildStore([shared]);
    sourceStates.shared = { status: 'approved', source: 'http://127.0.0.1:4825/a.json', autoCheck: true, autoCheckInterval: 5 };
    await store.dispatch(loadSyncSourceState(shared));
    store.dispatch(setCollectionUpdate({ collectionUid: 'shared', hasUpdates: true, error: null }));
    // The file still names a.json, so main describes a.json, which is no longer the approved source.
    invoke.mockResolvedValueOnce({ status: 'pending', source: 'http://127.0.0.1:4825/a.json', autoCheck: false, autoCheckInterval: 5 });

    await store.dispatch(approveSyncSource(shared, { sourceUrl: 'http://127.0.0.1:4825/b.json' }));

    expect(store.getState().openapiSync.collectionUpdates.shared).toBeUndefined();
  });

  it('starts checking once the user approves, and stores the state after approve and dismiss', async () => {
    const shared = collection('shared', 'http://127.0.0.1:4825/');
    const store = buildStore([shared]);
    sourceStates.shared = { status: 'pending', autoCheck: false, autoCheckInterval: 5 };

    await store.dispatch(loadSyncSourceState(shared));
    expect(store.getState().openapiSync.sourceStates.shared.status).toBe('pending');

    await store.dispatch(dismissSyncSource(shared));
    expect(store.getState().openapiSync.sourceStates.shared.status).toBe('dismissed');

    await store.dispatch(approveSyncSource(shared, { autoCheck: true, autoCheckInterval: 15 }));
    expect(store.getState().openapiSync.sourceStates.shared).toEqual({ status: 'approved', autoCheck: true, autoCheckInterval: 15 });

    await store.dispatch(checkActiveWorkspaceCollectionsForUpdates());
    expect(checkCalls()).toEqual(['shared']);
  });
});
