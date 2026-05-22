import reducer, {
  initRunRequestEvent,
  runRequestEvent,
  runFolderEvent,
  collectionAddOauth2CredentialsByUrl
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'req-1';
const REQUEST_UID = 'run-1';

const makeInitialState = () => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: [
        {
          uid: ITEM_UID,
          name: 'user_info',
          type: 'http-request',
          request: { url: 'https://example.com/userinfo', method: 'GET' }
        }
      ]
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

const scriptedRequestEvent = (overrides = {}) => ({
  type: 'scripted-request',
  collectionUid: COLLECTION_UID,
  itemUid: ITEM_UID,
  requestUid: REQUEST_UID,
  phase: 'pre-request',
  source: 'sendRequest',
  scope: { type: 'collection', sourceFile: 'collection.bru' },
  timestamp: 1000,
  data: {
    request: { method: 'GET', url: 'https://example.com/ping', headers: {}, data: undefined },
    response: { statusCode: 200, statusText: 'OK', headers: {}, data: 'ok', dataBuffer: '', size: 0, duration: 1 }
  },
  ...overrides
});

describe('runRequestEvent — single-request flow', () => {
  test('appends a scripted-request entry to collection.timeline', () => {
    let state = makeInitialState();
    state = reducer(state, initRunRequestEvent({
      requestUid: REQUEST_UID, itemUid: ITEM_UID, collectionUid: COLLECTION_UID
    }));
    state = reducer(state, runRequestEvent(scriptedRequestEvent()));

    const collection = state.collections[0];
    expect(collection.timeline).toHaveLength(1);
    expect(collection.timeline[0]).toEqual(
      expect.objectContaining({
        type: 'scripted-request',
        itemUid: ITEM_UID,
        requestUid: REQUEST_UID,
        phase: 'pre-request',
        source: 'sendRequest',
        scope: { type: 'collection', sourceFile: 'collection.bru' },
        timestamp: 1000
      })
    );
  });

  test('keeps each phase distinct as separate entries', () => {
    let state = makeInitialState();
    state = reducer(state, initRunRequestEvent({
      requestUid: REQUEST_UID, itemUid: ITEM_UID, collectionUid: COLLECTION_UID
    }));
    state = reducer(state, runRequestEvent(scriptedRequestEvent({
      phase: 'pre-request', source: 'sendRequest', timestamp: 100
    })));
    state = reducer(state, runRequestEvent(scriptedRequestEvent({
      phase: 'post-response', source: 'runRequest', timestamp: 200
    })));
    state = reducer(state, runRequestEvent(scriptedRequestEvent({
      phase: 'tests', source: 'sendRequest', timestamp: 300
    })));

    const entries = state.collections[0].timeline;
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.phase)).toEqual(['pre-request', 'post-response', 'tests']);
    expect(entries.map((e) => e.source)).toEqual(['sendRequest', 'runRequest', 'sendRequest']);
  });

  test('ignores stale events whose requestUid no longer matches the item', () => {
    let state = makeInitialState();
    state = reducer(state, initRunRequestEvent({
      requestUid: REQUEST_UID, itemUid: ITEM_UID, collectionUid: COLLECTION_UID
    }));
    // Later invocation moves item.requestUid forward; earlier events must be dropped.
    state = reducer(state, initRunRequestEvent({
      requestUid: 'run-2', itemUid: ITEM_UID, collectionUid: COLLECTION_UID
    }));
    state = reducer(state, runRequestEvent(scriptedRequestEvent({ requestUid: REQUEST_UID })));

    expect(state.collections[0].timeline || []).toHaveLength(0);
  });
});

describe('runFolderEvent — runner flow', () => {
  // Seed runnerResult so the scripted-request / oauth2-debug reducers find it via findLast().
  const seedRunner = (state) => {
    state = reducer(state, runFolderEvent({
      type: 'testrun-started',
      collectionUid: COLLECTION_UID,
      folderUid: null,
      isRecursive: false,
      cancelTokenUid: 'cancel-1'
    }));
    state = reducer(state, runFolderEvent({
      type: 'request-queued',
      collectionUid: COLLECTION_UID,
      folderUid: null,
      itemUid: ITEM_UID
    }));
    return state;
  };

  test('routes scripted-request onto runnerItem.scriptedRequestEntries (not collection.timeline)', () => {
    let state = seedRunner(makeInitialState());
    state = reducer(state, runFolderEvent({
      type: 'scripted-request',
      collectionUid: COLLECTION_UID,
      folderUid: null,
      itemUid: ITEM_UID,
      phase: 'pre-request',
      source: 'sendRequest',
      scope: { type: 'collection', sourceFile: 'collection.bru' },
      timestamp: 500,
      data: { request: { method: 'GET', url: 'https://example.com/ping' }, response: null }
    }));

    const collection = state.collections[0];
    const runnerItem = collection.runnerResult.items.find((i) => i.uid === ITEM_UID);

    expect(runnerItem.scriptedRequestEntries).toHaveLength(1);
    expect(runnerItem.scriptedRequestEntries[0]).toEqual(
      expect.objectContaining({
        phase: 'pre-request',
        source: 'sendRequest',
        scope: { type: 'collection', sourceFile: 'collection.bru' },
        timestamp: 500
      })
    );
    // Isolation guarantee: must not bleed into the shared timeline.
    expect(collection.timeline || []).toHaveLength(0);
  });

  test('routes oauth2-debug onto runnerItem.oauth2DebugEntries (not collection.timeline)', () => {
    let state = seedRunner(makeInitialState());
    const debugInfo = [{ request: { url: 'token-url' }, response: { status: 200 } }];

    state = reducer(state, runFolderEvent({
      type: 'oauth2-debug',
      collectionUid: COLLECTION_UID,
      folderUid: null,
      itemUid: ITEM_UID,
      url: 'https://idp.example.com/token',
      credentialsId: 'credentials',
      debugInfo: { data: debugInfo }
    }));

    const collection = state.collections[0];
    const runnerItem = collection.runnerResult.items.find((i) => i.uid === ITEM_UID);

    expect(runnerItem.oauth2DebugEntries).toHaveLength(1);
    expect(runnerItem.oauth2DebugEntries[0]).toEqual(
      expect.objectContaining({
        url: 'https://idp.example.com/token',
        credentialsId: 'credentials',
        debugInfo
      })
    );
    expect(collection.timeline || []).toHaveLength(0);
  });

  test('appends per-phase scripted entries cumulatively on the runner item', () => {
    let state = seedRunner(makeInitialState());
    ['pre-request', 'post-response', 'tests'].forEach((phase, i) => {
      state = reducer(state, runFolderEvent({
        type: 'scripted-request',
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: ITEM_UID,
        phase,
        source: i === 1 ? 'runRequest' : 'sendRequest',
        scope: null,
        timestamp: 100 * (i + 1),
        data: { request: {}, response: null }
      }));
    });

    const runnerItem = state.collections[0].runnerResult.items.find((i) => i.uid === ITEM_UID);
    expect(runnerItem.scriptedRequestEntries.map((e) => e.phase)).toEqual(['pre-request', 'post-response', 'tests']);
    expect(runnerItem.scriptedRequestEntries.map((e) => e.source)).toEqual(['sendRequest', 'runRequest', 'sendRequest']);
  });

  test('multiple runner invocations of the same item keep their entries separate (findLast)', () => {
    let state = seedRunner(makeInitialState());
    state = reducer(state, runFolderEvent({
      type: 'scripted-request',
      collectionUid: COLLECTION_UID, folderUid: null, itemUid: ITEM_UID,
      phase: 'pre-request', source: 'sendRequest', scope: null, timestamp: 1,
      data: { request: { url: 'A' }, response: null }
    }));
    // Second invocation queues a fresh runner item for the same uid.
    state = reducer(state, runFolderEvent({
      type: 'request-queued',
      collectionUid: COLLECTION_UID, folderUid: null, itemUid: ITEM_UID
    }));
    state = reducer(state, runFolderEvent({
      type: 'scripted-request',
      collectionUid: COLLECTION_UID, folderUid: null, itemUid: ITEM_UID,
      phase: 'pre-request', source: 'sendRequest', scope: null, timestamp: 2,
      data: { request: { url: 'B' }, response: null }
    }));

    const items = state.collections[0].runnerResult.items.filter((i) => i.uid === ITEM_UID);
    expect(items).toHaveLength(2);
    expect(items[0].scriptedRequestEntries[0].data.request.url).toBe('A');
    expect(items[1].scriptedRequestEntries[0].data.request.url).toBe('B');
  });
});

describe('collectionAddOauth2CredentialsByUrl — executionMode gating', () => {
  const credentials = { access_token: 'abc', expires_in: 60 };
  const debugInfo = { data: [{ request: {}, response: {} }] };

  test('standalone runs push an oauth2 entry into collection.timeline', () => {
    let state = makeInitialState();
    state = reducer(state, collectionAddOauth2CredentialsByUrl({
      collectionUid: COLLECTION_UID,
      folderUid: null,
      itemUid: ITEM_UID,
      url: 'https://idp.example.com/token',
      credentials,
      credentialsId: 'credentials',
      debugInfo
    }));

    const collection = state.collections[0];
    expect(collection.timeline).toHaveLength(1);
    expect(collection.timeline[0]).toEqual(
      expect.objectContaining({ type: 'oauth2', itemUid: ITEM_UID })
    );
  });

  test('failed token requests (credentials=null) still push the oauth2 entry into timeline (#7776)', () => {
    let state = makeInitialState();
    state = reducer(state, collectionAddOauth2CredentialsByUrl({
      collectionUid: COLLECTION_UID,
      folderUid: null,
      itemUid: ITEM_UID,
      url: 'https://idp.example.com/token',
      credentials: null,
      credentialsId: 'credentials',
      debugInfo
    }));

    const collection = state.collections[0];
    expect(collection.timeline).toHaveLength(1);
    expect(collection.timeline[0]).toEqual(
      expect.objectContaining({ type: 'oauth2', itemUid: ITEM_UID })
    );
    expect(collection.timeline[0].data.credentials).toBeNull();
  });

  test('executionMode = "runner" updates the credential cache but skips the timeline push', () => {
    let state = makeInitialState();
    state = reducer(state, collectionAddOauth2CredentialsByUrl({
      collectionUid: COLLECTION_UID,
      folderUid: null,
      itemUid: ITEM_UID,
      url: 'https://idp.example.com/token',
      credentials,
      credentialsId: 'credentials',
      debugInfo,
      executionMode: 'runner'
    }));

    const collection = state.collections[0];
    expect(collection.oauth2Credentials).toHaveLength(1);
    expect(collection.oauth2Credentials[0]).toEqual(
      expect.objectContaining({ url: 'https://idp.example.com/token', credentialsId: 'credentials' })
    );
    // Runner oauth lives on the runner item via 'oauth2-debug' instead.
    expect(collection.timeline || []).toHaveLength(0);
  });
});
