jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import reducer, {
  scriptEnvironmentUpdateEvent,
  runtimeVariablesUpdateEvent,
  initRunRequestEvent,
  responseReceived,
  requestCancelled,
  runFolderEvent,
  _clearScriptCollectionBaselines
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ENV_UID = 'env-1';

const makeVar = (name, value, enabled = true) => ({
  uid: `uid-${name}`,
  name,
  value,
  type: 'text',
  secret: false,
  enabled
});

const makeState = ({ items = [], envVars = [] } = {}) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      activeEnvironmentUid: ENV_UID,
      environments: [
        {
          uid: ENV_UID,
          name: 'Test',
          variables: envVars
        }
      ],
      runtimeVariables: {},
      items
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

const makeItem = (uid) => ({
  uid,
  name: uid,
  type: 'http-request',
  request: { url: 'https://example.com/ping', method: 'GET' }
});

const getCollection = (state) => state.collections[0];
const getEnv = (state) => state.collections[0].environments[0];

const findItemEnvVar = (state, name) =>
  getEnv(state).variables.find((v) => v.name === name);

describe('_scriptRequestUids — bounded sliding window of recent script UIDs', () => {
  describe('window semantics (parallel iterations, in-flight nested runRequest)', () => {
    test('initRunRequestEvent for two distinct UIDs holds both in the window', () => {
      let state = makeState({ items: [makeItem('item-A'), makeItem('item-B')] });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-B',
        itemUid: 'item-B',
        collectionUid: COLLECTION_UID
      }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['req-A', 'req-B']);
    });

    test('scriptEnvironmentUpdateEvent accepts BOTH concurrent UIDs', () => {
      // Pre-fix this was the regression: req-B's initRunRequestEvent overwrote
      // _scriptRequestUid from req-A, and a late update from req-A was dropped
      // — even though req-A was still in-flight.
      let state = makeState({
        items: [makeItem('item-A'), makeItem('item-B')],
        envVars: [makeVar('HOST', 'https://old.com')]
      });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-B',
        itemUid: 'item-B',
        collectionUid: COLLECTION_UID
      }));

      state = reducer(state, scriptEnvironmentUpdateEvent({
        collectionUid: COLLECTION_UID,
        requestUid: 'req-A',
        envVariables: { HOST: 'from-A', __name__: 'Test' }
      }));
      expect(findItemEnvVar(state, 'HOST').value).toBe('from-A');

      state = reducer(state, scriptEnvironmentUpdateEvent({
        collectionUid: COLLECTION_UID,
        requestUid: 'req-B',
        envVariables: { HOST: 'from-B', __name__: 'Test' }
      }));
      expect(findItemEnvVar(state, 'HOST').value).toBe('from-B');
    });

    test('runtimeVariablesUpdateEvent honors the window the same way', () => {
      let state = makeState({ items: [makeItem('item-A'), makeItem('item-B')] });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-B',
        itemUid: 'item-B',
        collectionUid: COLLECTION_UID
      }));

      state = reducer(state, runtimeVariablesUpdateEvent({
        collectionUid: COLLECTION_UID,
        requestUid: 'req-A',
        runtimeVariables: { token: 'A' }
      }));
      expect(getCollection(state).runtimeVariables).toEqual({ token: 'A' });

      state = reducer(state, runtimeVariablesUpdateEvent({
        collectionUid: COLLECTION_UID,
        requestUid: 'req-B',
        runtimeVariables: { token: 'B' }
      }));
      expect(getCollection(state).runtimeVariables).toEqual({ token: 'B' });
    });

    test('initRunRequestEvent does not duplicate an already-in-flight UID', () => {
      let state = makeState({ items: [makeItem('item-A')] });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['req-A']);
    });
  });

  describe('stale-update rejection', () => {
    test('script update whose UID has never been in the window is dropped', () => {
      let state = makeState({
        items: [makeItem('item-A')],
        envVars: [makeVar('HOST', 'https://old.com')]
      });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));

      state = reducer(state, scriptEnvironmentUpdateEvent({
        collectionUid: COLLECTION_UID,
        requestUid: 'req-OLD',
        envVariables: { HOST: 'stale', __name__: 'Test' }
      }));

      expect(findItemEnvVar(state, 'HOST').value).toBe('https://old.com');
    });

    test('script update with no requestUid is accepted (e.g. WS/OAuth2 paths)', () => {
      let state = makeState({
        items: [makeItem('item-A')],
        envVars: [makeVar('HOST', 'https://old.com')]
      });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));

      state = reducer(state, scriptEnvironmentUpdateEvent({
        collectionUid: COLLECTION_UID,
        envVariables: { HOST: 'no-uid', __name__: 'Test' }
      }));

      expect(findItemEnvVar(state, 'HOST').value).toBe('no-uid');
    });

    test('script update accepted when window has never been initialized (cold start)', () => {
      let state = makeState({
        items: [makeItem('item-A')],
        envVars: [makeVar('HOST', 'https://old.com')]
      });

      state = reducer(state, scriptEnvironmentUpdateEvent({
        collectionUid: COLLECTION_UID,
        requestUid: 'req-X',
        envVariables: { HOST: 'cold-start', __name__: 'Test' }
      }));

      expect(findItemEnvVar(state, 'HOST').value).toBe('cold-start');
    });
  });

  describe('UID lifetime — no per-terminal-event cleanup (cross-channel IPC race)', () => {
    test('responseReceived does NOT remove the item\'s UID', () => {
      // Critical: webContents.send (script-env-update) and the invoke reply
      // that triggers responseReceived go through DIFFERENT IPC channels.
      // Electron only guarantees ordering within a channel. A late post-response
      // script-env-update can arrive AFTER responseReceived's microtask fires
      // — removing the UID here would gate it out, breaking persist-to-disk.
      let state = makeState({ items: [makeItem('item-A'), makeItem('item-B')] });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-B',
        itemUid: 'item-B',
        collectionUid: COLLECTION_UID
      }));

      state = reducer(state, responseReceived({
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID,
        response: { status: 200 }
      }));

      // Both UIDs still in window.
      expect(getCollection(state)._scriptRequestUids).toEqual(['req-A', 'req-B']);
    });

    test('a late update arriving AFTER responseReceived still lands (persist path)', () => {
      // The exact failure mode that broke the variable-persistence Playwright
      // suites: post-response bru.setEnvVar / bru.deleteEnvVar / setCollectionVar
      // emissions arrive at the renderer AFTER responseReceived because they're
      // on a different IPC channel. They MUST land or disk persistence breaks.
      let state = makeState({
        items: [makeItem('item-A')],
        envVars: [makeVar('HOST', 'https://old.com'), makeVar('tempToken', 'abc123')]
      });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      state = reducer(state, responseReceived({
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID,
        response: { status: 200 }
      }));

      // Post-response bru.deleteEnvVar('tempToken') arrives — must apply.
      state = reducer(state, scriptEnvironmentUpdateEvent({
        collectionUid: COLLECTION_UID,
        requestUid: 'req-A',
        envVariables: { HOST: 'https://old.com', __name__: 'Test' }
      }));

      expect(findItemEnvVar(state, 'tempToken')).toBeUndefined();
    });

    test('runFolderEvent response-received does NOT remove UID', () => {
      let state = makeState({ items: [makeItem('item-A')] });

      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: 'item-A',
        type: 'request-queued',
        requestUid: 'fr-A',
        iterationIndex: 0
      }));
      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: 'item-A',
        type: 'response-received',
        requestUid: 'fr-A',
        responseReceived: {},
        iterationIndex: 0
      }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['fr-A']);
    });

    test('runFolderEvent test-script-execution does NOT remove UID (cross-channel race)', () => {
      // test-script-execution and the test-script's sendVariableUpdates go through
      // different channels (main:run-folder-event vs main:script-environment-update).
      // Even though sendVariableUpdates is called first in main, test-script-execution
      // can reach the renderer first — removing here would drop the update.
      let state = makeState({ items: [makeItem('item-A')] });

      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: 'item-A',
        type: 'request-queued',
        requestUid: 'fr-A',
        iterationIndex: 0
      }));
      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: 'item-A',
        type: 'test-script-execution',
        requestUid: 'fr-A',
        errorMessage: null,
        iterationIndex: 0
      }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['fr-A']);
    });

    test('testrun-ended does NOT clear the window (parallel iterations share state)', () => {
      // For multi-iteration runs in parallel mode, an earlier iteration's
      // testrun-ended would clear UIDs from sibling iterations that are still
      // in-flight.
      let state = makeState({ items: [makeItem('item-A')] });

      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: 'item-A',
        type: 'request-queued',
        requestUid: 'fr-A',
        iterationIndex: 0
      }));
      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        type: 'testrun-ended',
        iterationIndex: 0
      }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['fr-A']);
    });

    test('requestCancelled DOES remove the cancelled request\'s UID (explicit signal)', () => {
      // The one path where we remove eagerly — cancellation is an explicit user
      // action AFTER which no future variable updates from that request should
      // ever land (the cancelled script's late emissions are exactly what we want
      // to gate out).
      let state = makeState({ items: [makeItem('item-A'), makeItem('item-B')] });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-B',
        itemUid: 'item-B',
        collectionUid: COLLECTION_UID
      }));

      state = reducer(state, requestCancelled({
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['req-B']);
    });
  });

  describe('_clearScriptCollectionBaselines preserves in-flight UIDs', () => {
    test('clearing baselines does NOT touch _scriptRequestUids (regression guard)', () => {
      let state = makeState({ items: [makeItem('item-A')] });

      state = reducer(state, initRunRequestEvent({
        requestUid: 'req-A',
        itemUid: 'item-A',
        collectionUid: COLLECTION_UID
      }));
      expect(getCollection(state)._scriptRequestUids).toEqual(['req-A']);

      state = reducer(state, _clearScriptCollectionBaselines({ collectionUid: COLLECTION_UID }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['req-A']);
      expect(getCollection(state)._scriptEnvBaseline).toBeUndefined();
      expect(getCollection(state)._scriptCollVarBaseline).toBeUndefined();
    });
  });

  describe('bounded window eviction', () => {
    test('oldest UID falls off when capacity is reached', () => {
      // Window capacity is 256 (see SCRIPT_REQUEST_UID_WINDOW in collections/index.js).
      // After 257 inits, the first UID should be evicted; the rest stay.
      let state = makeState({ items: [makeItem('item-A')] });

      for (let i = 0; i < 257; i++) {
        state = reducer(state, initRunRequestEvent({
          requestUid: `req-${i}`,
          itemUid: 'item-A',
          collectionUid: COLLECTION_UID
        }));
      }

      const uids = getCollection(state)._scriptRequestUids;
      expect(uids).toHaveLength(256);
      expect(uids[0]).toBe('req-1'); // req-0 evicted
      expect(uids[uids.length - 1]).toBe('req-256');
    });
  });

  describe('folder runner — parallel iterations', () => {
    test('two request-queued for different iterationIndexes both retained', () => {
      // The original regression: the single _scriptRequestUid slot was overwritten
      // by whichever request-queued fired most recently, dropping the older
      // iteration's still-in-flight script updates.
      let state = makeState({ items: [makeItem('item-A')] });

      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: 'item-A',
        type: 'request-queued',
        requestUid: 'fr-iter0',
        iterationIndex: 0
      }));
      state = reducer(state, runFolderEvent({
        collectionUid: COLLECTION_UID,
        folderUid: null,
        itemUid: 'item-A',
        type: 'request-queued',
        requestUid: 'fr-iter1',
        iterationIndex: 1
      }));

      expect(getCollection(state)._scriptRequestUids).toEqual(['fr-iter0', 'fr-iter1']);
    });
  });
});
