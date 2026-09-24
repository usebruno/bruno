jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer from 'providers/ReduxStore/slices/collections';
import { collectionVariablesUpdateEvent } from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_UID = 'col-1';

const makeVar = (name, value, enabled = true) => ({
  uid: `uid-${name}`,
  name,
  value,
  enabled
});

const makeHeader = (name, value, enabled = true) => ({
  uid: `hdr-${name}`,
  name,
  value,
  description: '',
  enabled
});

let invokedSaveArgs = [];

beforeEach(() => {
  invokedSaveArgs = [];
  window.ipcRenderer = {
    invoke: jest.fn((...args) => {
      invokedSaveArgs.push(args);
      return Promise.resolve(true);
    })
  };
});

const createStore = ({ rootVars = [], rootHeaders = [], rootAuth, draft } = {}) => {
  const root = {
    request: {
      headers: rootHeaders,
      auth: rootAuth || { mode: 'none' },
      script: { req: '', res: '' },
      vars: {
        req: rootVars,
        res: []
      },
      tests: ''
    }
  };

  const preloadedState = {
    collections: {
      collections: [
        {
          uid: COLLECTION_UID,
          pathname: '/coll',
          root,
          draft: draft !== undefined ? draft : null,
          brunoConfig: { version: '1', name: 'test', type: 'collection' },
          environments: [],
          items: []
        }
      ],
      collectionSortOrder: 'default',
      activeWorkspaceUid: null
    }
  };

  return configureStore({
    reducer: {
      collections: collectionsReducer
    },
    preloadedState
  });
};

const getCollection = (store) => store.getState().collections.collections[0];
const getRootVars = (store) => getCollection(store).root?.request?.vars?.req || [];
const getRootHeaders = (store) => getCollection(store).root?.request?.headers || [];
const getRootAuth = (store) => getCollection(store).root?.request?.auth;
const getDraftHeaders = (store) => getCollection(store).draft?.root?.request?.headers;
const getDraft = (store) => getCollection(store).draft;

const getSavedRootPayload = () => {
  const call = invokedSaveArgs.find(([channel]) => channel === 'renderer:save-collection-root');
  // [channel, pathname, collectionRootToSave, brunoConfig]
  return call ? call[2] : null;
};

describe('collectionVariablesUpdateEvent — draft isolation', () => {
  describe('does not persist draft headers to disk', () => {
    test('draft headers are NOT written to disk when script updates collection vars', () => {
      const rootVars = [makeVar('HOST', 'https://saved.com')];
      const rootHeaders = [makeHeader('X-Saved', 'original')];

      const draftRoot = {
        request: {
          headers: [makeHeader('X-Saved', 'original'), makeHeader('X-Draft-Only', 'draft-value')],
          auth: { mode: 'bearer', bearer: { token: 'draft-token' } },
          script: { req: 'console.log("draft")', res: '' },
          vars: {
            req: [makeVar('HOST', 'https://saved.com')],
            res: []
          },
          tests: ''
        }
      };

      const store = createStore({
        rootVars,
        rootHeaders,
        draft: { root: draftRoot }
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://updated.com' },
        collectionUid: COLLECTION_UID
      }));

      const savedRoot = getSavedRootPayload();
      expect(savedRoot).not.toBeNull();

      // Saved headers should be from root, not draft
      expect(savedRoot.request.headers).toHaveLength(1);
      expect(savedRoot.request.headers[0].name).toBe('X-Saved');
      expect(savedRoot.request.headers[0].value).toBe('original');

      // Draft header should NOT be persisted
      expect(savedRoot.request.headers.find((h) => h.name === 'X-Draft-Only')).toBeUndefined();
    });

    test('draft auth is NOT written to disk when script updates collection vars', () => {
      const rootAuth = { mode: 'none' };
      const draftRoot = {
        request: {
          headers: [],
          auth: { mode: 'bearer', bearer: { token: 'draft-secret-token' } },
          script: { req: '', res: '' },
          vars: { req: [makeVar('HOST', 'https://saved.com')], res: [] },
          tests: ''
        }
      };

      const store = createStore({
        rootVars: [makeVar('HOST', 'https://saved.com')],
        rootAuth,
        draft: { root: draftRoot }
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://updated.com' },
        collectionUid: COLLECTION_UID
      }));

      const savedRoot = getSavedRootPayload();
      expect(savedRoot).not.toBeNull();
      // Auth on disk should be from root (none), not draft (bearer)
      expect(savedRoot.request.auth).toEqual({ mode: 'none' });
      // Root auth in Redux should also remain unchanged
      expect(getRootAuth(store)).toEqual({ mode: 'none' });
    });

    test('draft scripts are NOT written to disk when script updates collection vars', () => {
      const draftRoot = {
        request: {
          headers: [],
          auth: { mode: 'none' },
          script: { req: 'console.log("draft script")', res: 'console.log("draft post")' },
          vars: { req: [], res: [] },
          tests: 'test("draft test", () => {})'
        }
      };

      const store = createStore({
        draft: { root: draftRoot }
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { NEW_VAR: 'value' },
        collectionUid: COLLECTION_UID
      }));

      const savedRoot = getSavedRootPayload();
      expect(savedRoot).not.toBeNull();
      // Scripts and tests on disk should be from root (empty), not draft
      expect(savedRoot.request.script).toEqual({ req: '', res: '' });
      expect(savedRoot.request.tests).toBe('');
    });
  });

  describe('vars are saved correctly from root', () => {
    test('updated vars are persisted to disk from saved state', () => {
      const store = createStore({
        rootVars: [makeVar('HOST', 'https://saved.com')]
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://updated.com' },
        collectionUid: COLLECTION_UID
      }));

      const savedRoot = getSavedRootPayload();
      expect(savedRoot).not.toBeNull();
      expect(savedRoot.request.vars.req).toHaveLength(1);
      expect(savedRoot.request.vars.req[0].value).toBe('https://updated.com');
    });

    test('new vars from script are persisted to disk', () => {
      const store = createStore({ rootVars: [] });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { TOKEN: 'abc123' },
        collectionUid: COLLECTION_UID
      }));

      const savedRoot = getSavedRootPayload();
      const vars = savedRoot.request.vars.req;
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('TOKEN');
      expect(vars[0].value).toBe('abc123');
    });
  });

  describe('draft is preserved after script-driven save', () => {
    test('draft with header edits is NOT cleared by collectionVariablesUpdateEvent', () => {
      const draftRoot = {
        request: {
          headers: [makeHeader('X-Draft', 'draft-val')],
          auth: { mode: 'none' },
          script: { req: '', res: '' },
          vars: { req: [makeVar('HOST', 'https://saved.com')], res: [] },
          tests: ''
        }
      };

      const store = createStore({
        rootVars: [makeVar('HOST', 'https://saved.com')],
        rootHeaders: [],
        draft: { root: draftRoot }
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://updated.com' },
        collectionUid: COLLECTION_UID
      }));

      // Draft should still exist (not cleared)
      const draft = getDraft(store);
      expect(draft).not.toBeNull();

      // Draft headers should be untouched
      const draftHeaders = getDraftHeaders(store);
      expect(draftHeaders).toHaveLength(1);
      expect(draftHeaders[0].name).toBe('X-Draft');
    });

    test('draft vars are synced with script changes while draft remains', () => {
      const draftRoot = {
        request: {
          headers: [makeHeader('X-Draft', 'keep-me')],
          auth: { mode: 'none' },
          script: { req: '', res: '' },
          vars: { req: [makeVar('HOST', 'https://draft.com')], res: [] },
          tests: ''
        }
      };

      const store = createStore({
        rootVars: [makeVar('HOST', 'https://saved.com')],
        draft: { root: draftRoot }
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://script.com', NEW: 'val' },
        collectionUid: COLLECTION_UID
      }));

      // Root should have the updated vars
      const rootVars = getRootVars(store);
      expect(rootVars.find((v) => v.name === 'HOST').value).toBe('https://script.com');
      expect(rootVars.find((v) => v.name === 'NEW').value).toBe('val');

      // Draft vars should also be synced
      const col = getCollection(store);
      const draftVars = col.draft.root.request.vars.req;
      expect(draftVars.find((v) => v.name === 'HOST').value).toBe('https://script.com');
      expect(draftVars.find((v) => v.name === 'NEW').value).toBe('val');

      // Draft headers should be untouched
      expect(col.draft.root.request.headers[0].name).toBe('X-Draft');
    });
  });

  describe('disabled vars are preserved', () => {
    test('disabled collection vars survive when script returns only enabled vars', () => {
      const store = createStore({
        rootVars: [
          makeVar('HOST', 'https://example.com'),
          makeVar('DEBUG', 'true', false) // disabled
        ]
      });

      // Script only returns enabled vars (disabled are not passed to script runtime)
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getRootVars(store);
      expect(vars).toHaveLength(2);
      expect(vars.find((v) => v.name === 'DEBUG')).toBeDefined();
      expect(vars.find((v) => v.name === 'DEBUG').enabled).toBe(false);
    });

    test('disabled vars survive when script adds a new var', () => {
      const store = createStore({
        rootVars: [
          makeVar('HOST', 'https://example.com'),
          makeVar('OLD_SECRET', 'hidden', false) // disabled
        ]
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com', TOKEN: 'new-token' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getRootVars(store);
      expect(vars).toHaveLength(3);
      expect(vars.find((v) => v.name === 'OLD_SECRET')).toBeDefined();
      expect(vars.find((v) => v.name === 'OLD_SECRET').enabled).toBe(false);
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('new-token');
    });

    test('disabled vars survive when script deletes an enabled var', () => {
      const store = createStore({
        rootVars: [
          makeVar('HOST', 'https://example.com'),
          makeVar('REMOVE_ME', 'bye'),
          makeVar('KEEP_DISABLED', 'secret', false) // disabled
        ]
      });

      // Script deleted REMOVE_ME (not in output)
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getRootVars(store);
      expect(vars).toHaveLength(2);
      expect(vars.find((v) => v.name === 'HOST')).toBeDefined();
      expect(vars.find((v) => v.name === 'KEEP_DISABLED')).toBeDefined();
      expect(vars.find((v) => v.name === 'KEEP_DISABLED').enabled).toBe(false);
      expect(vars.find((v) => v.name === 'REMOVE_ME')).toBeUndefined();
    });

    test('disabled vars are persisted to disk', () => {
      const store = createStore({
        rootVars: [
          makeVar('HOST', 'https://example.com'),
          makeVar('DISABLED_VAR', 'keep-me', false) // disabled
        ]
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://updated.com' },
        collectionUid: COLLECTION_UID
      }));

      const savedRoot = getSavedRootPayload();
      expect(savedRoot).not.toBeNull();
      const savedVars = savedRoot.request.vars.req;
      expect(savedVars).toHaveLength(2);
      expect(savedVars.find((v) => v.name === 'DISABLED_VAR')).toBeDefined();
      expect(savedVars.find((v) => v.name === 'DISABLED_VAR').enabled).toBe(false);
    });

    test('preserves var that user disabled in draft even when script does not return it', () => {
      const draftRoot = {
        request: {
          headers: [],
          auth: { mode: 'none' },
          script: { req: '', res: '' },
          vars: {
            req: [
              makeVar('HOST', 'https://example.com'),
              makeVar('TOKEN', 'secret', false) // disabled in draft only
            ],
            res: []
          },
          tests: ''
        }
      };

      const store = createStore({
        rootVars: [
          makeVar('HOST', 'https://example.com'),
          makeVar('TOKEN', 'secret') // still enabled in root
        ],
        draft: { root: draftRoot }
      });

      // Script only returns enabled vars — TOKEN is disabled in draft, so not included
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getRootVars(store);
      expect(vars).toHaveLength(2);
      expect(vars.find((v) => v.name === 'TOKEN')).toBeDefined();
      // The var should be preserved with its draft disabled state
      expect(vars.find((v) => v.name === 'TOKEN').enabled).toBe(false);
    });

    test('disabled vars survive when collectionVariables is empty (no collection vars defined)', () => {
      const store = createStore({
        rootVars: [
          makeVar('ONLY_DISABLED', 'value', false) // disabled
        ]
      });

      // Empty collectionVariables — happens when no enabled vars exist
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: {},
        collectionUid: COLLECTION_UID
      }));

      const vars = getRootVars(store);
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('ONLY_DISABLED');
      expect(vars[0].enabled).toBe(false);
    });
  });

  describe('no draft — root headers remain unchanged', () => {
    test('existing root headers are preserved when vars are updated', () => {
      const store = createStore({
        rootVars: [makeVar('HOST', 'https://saved.com')],
        rootHeaders: [makeHeader('Authorization', 'Bearer saved-token')]
      });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://updated.com' },
        collectionUid: COLLECTION_UID
      }));

      // Root headers should not change
      const headers = getRootHeaders(store);
      expect(headers).toHaveLength(1);
      expect(headers[0].value).toBe('Bearer saved-token');

      // No draft should be created
      expect(getDraft(store)).toBeNull();
    });
  });
});
