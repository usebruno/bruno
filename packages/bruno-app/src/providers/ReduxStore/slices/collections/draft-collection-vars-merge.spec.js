jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, { initRunRequestEvent } from 'providers/ReduxStore/slices/collections';
import { collectionVariablesUpdateEvent } from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'req-1';
const REQUEST_UID = 'run-1';

const makeVar = (name, value, enabled = true) => ({
  uid: `uid-${name}`,
  name,
  value,
  enabled
});

beforeAll(() => {
  window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(true) };
});

const createStore = (rootVars = [], opts = {}) => {
  const root = {
    request: {
      vars: {
        req: rootVars
      }
    }
  };

  const preloadedState = {
    collections: {
      collections: [
        {
          uid: COLLECTION_UID,
          pathname: '/coll',
          root,
          draft: opts.draft !== undefined ? opts.draft : null,
          brunoConfig: { version: '1', name: 'test', type: 'collection' },
          environments: [],
          items: [
            {
              uid: ITEM_UID,
              name: 'ping',
              type: 'http-request',
              request: { url: 'https://example.com/ping', method: 'GET' }
            }
          ]
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

const getReqVars = (store) => {
  const col = store.getState().collections.collections[0];
  // scriptUpdateCollectionVars writes to root and syncs to draft if present
  const root = col.root || {};
  return root.request?.vars?.req || [];
};

const getCollection = (store) => store.getState().collections.collections[0];

describe('collectionVariablesUpdateEvent — draft-aware merge', () => {
  describe('no draft pending', () => {
    test('updates existing variable values', () => {
      const store = createStore([makeVar('HOST', 'https://old.com')]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://new.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars).toHaveLength(1);
      expect(vars[0].value).toBe('https://new.com');
    });

    test('adds new variables from script', () => {
      const store = createStore([makeVar('HOST', 'https://example.com')]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com', TOKEN: 'abc' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars).toHaveLength(2);
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('abc');
    });

    test('removes enabled variables deleted by script (deleteCollectionVar)', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('OLD_VAR', 'remove-me')
      ]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('HOST');
    });

    test('preserves disabled variables even if not in script output', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('DISABLED_VAR', 'keep', false)
      ]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars).toHaveLength(2);
      expect(vars.find((v) => v.name === 'DISABLED_VAR')).toBeDefined();
    });

    test('deleteAllCollectionVars removes all enabled variables', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('TOKEN', 'secret'),
        makeVar('DISABLED', 'keep', false)
      ]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: {},
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('DISABLED');
    });

    test('preserves typed values without stringifying', () => {
      const store = createStore([]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { count: 42, flag: true },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      const countVar = vars.find((v) => v.name === 'count');
      const flagVar = vars.find((v) => v.name === 'flag');
      expect(countVar.value).toBe(42);
      expect(countVar.dataType).toBe('number');
      expect(flagVar.value).toBe(true);
      expect(flagVar.dataType).toBe('boolean');
    });
  });

  describe('draft pending — baseline-diff mode', () => {
    test('preserves draft-only variables that script does not know about', () => {
      const rootVars = [makeVar('HOST', 'https://saved.com')];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://saved.com'), makeVar('DRAFT_NEW', 'from-user')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      // DRAFT_NEW was not in baseline — script can't delete it, so it survives
      expect(vars.find((v) => v.name === 'DRAFT_NEW')).toBeDefined();
      expect(vars.find((v) => v.name === 'DRAFT_NEW').value).toBe('from-user');
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://saved.com');
    });

    test('applies script modification over draft edit of same variable', () => {
      const rootVars = [makeVar('TOKEN', 'saved-token')];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('TOKEN', 'draft-token')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script changed TOKEN (different from saved)
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { TOKEN: 'script-token' },
        collectionUid: COLLECTION_UID
      }));

      // Script's change wins because it explicitly modified the value
      expect(getReqVars(store)[0].value).toBe('script-token');
    });

    test('preserves draft value when script returns unchanged value', () => {
      const rootVars = [makeVar('HOST', 'https://saved.com')];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://draft-edit.com')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script didn't change HOST, but added TOKEN
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com', TOKEN: 'new-token' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      // HOST: script didn't change it → draft value preserved
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft-edit.com');
      // TOKEN: new from script → added
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('new-token');
      // Baseline should be set
      expect(getCollection(store)._scriptCollVarBaseline).toEqual({ HOST: 'https://saved.com' });
    });

    test('user deletes variable in draft, script returns same value — stays deleted', () => {
      const rootVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('API_KEY', 'saved-key')
      ];
      // User deleted API_KEY in the draft
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://saved.com')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script returns API_KEY unchanged
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com', API_KEY: 'saved-key' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      // API_KEY was not modified by script (same as baseline), so user's delete wins
      expect(vars.find((v) => v.name === 'API_KEY')).toBeUndefined();
      expect(vars).toHaveLength(1);
    });

    test('user deletes variable in draft, script sets new value — variable re-added', () => {
      const rootVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('API_KEY', 'saved-key')
      ];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://saved.com')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script explicitly changed API_KEY
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com', API_KEY: 'new-key-from-script' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars.find((v) => v.name === 'API_KEY').value).toBe('new-key-from-script');
    });

    test('deleteCollectionVar removes variable that existed in saved state', () => {
      const rootVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token')
      ];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://draft.com'), makeVar('TOKEN', 'draft-token')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script deleted TOKEN (absent from output)
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      // TOKEN was in baseline and removed by script — should be gone
      expect(vars.find((v) => v.name === 'TOKEN')).toBeUndefined();
      // HOST draft value preserved (script didn't change it)
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
    });

    test('deleteAllCollectionVars with draft preserves draft-only vars', () => {
      const rootVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token')
      ];
      const draftRoot = {
        request: {
          vars: {
            req: [
              makeVar('HOST', 'https://draft.com'),
              makeVar('TOKEN', 'draft-token'),
              makeVar('DRAFT_ONLY', 'user-added')
            ]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script called bru.deleteAllCollectionVars() — empty output
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: {},
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      // HOST and TOKEN were in baseline and deleted by script — gone
      expect(vars.find((v) => v.name === 'HOST')).toBeUndefined();
      expect(vars.find((v) => v.name === 'TOKEN')).toBeUndefined();
      // DRAFT_ONLY was not in baseline — survives
      expect(vars.find((v) => v.name === 'DRAFT_ONLY').value).toBe('user-added');
    });
  });

  describe('baseline exists — subsequent script events', () => {
    test('subsequent script events reuse baseline and preserve draft edits', () => {
      const rootVars = [makeVar('HOST', 'https://saved.com')];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://draft.com')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // First event: creates baseline
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com', TOKEN: 'abc' },
        collectionUid: COLLECTION_UID
      }));

      expect(getReqVars(store).find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(getReqVars(store).find((v) => v.name === 'TOKEN').value).toBe('abc');

      // Second event: baseline still active, draft edits still preserved
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com', TOKEN: 'abc', RESULT: 'ok' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('abc');
      expect(vars.find((v) => v.name === 'RESULT').value).toBe('ok');
    });
  });

  describe('mixed operations — set + delete in same script', () => {
    test('script adds new var and deletes existing var', () => {
      const store = createStore([
        makeVar('HOST', 'https://example.com'),
        makeVar('OLD_TOKEN', 'remove-me')
      ]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://example.com', NEW_TOKEN: 'fresh' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars.find((v) => v.name === 'OLD_TOKEN')).toBeUndefined();
      expect(vars.find((v) => v.name === 'NEW_TOKEN').value).toBe('fresh');
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://example.com');
    });

    test('with draft: script adds, modifies, and deletes vars — draft edits preserved', () => {
      const rootVars = [
        makeVar('HOST', 'https://saved.com'),
        makeVar('TOKEN', 'saved-token'),
        makeVar('TO_DELETE', 'remove-me')
      ];
      const draftRoot = {
        request: {
          vars: {
            req: [
              makeVar('HOST', 'https://draft.com'),
              makeVar('TOKEN', 'draft-token'),
              makeVar('TO_DELETE', 'draft-value'),
              makeVar('DRAFT_NEW', 'from-user')
            ]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script: modified TOKEN, deleted TO_DELETE, added SCRIPT_NEW, left HOST unchanged
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: {
          HOST: 'https://saved.com',
          TOKEN: 'script-token',
          SCRIPT_NEW: 'from-script'
        },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      // HOST: unchanged by script → draft value preserved
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://draft.com');
      // TOKEN: modified by script → script wins
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('script-token');
      // TO_DELETE: was in baseline, absent from script → deleted
      expect(vars.find((v) => v.name === 'TO_DELETE')).toBeUndefined();
      // DRAFT_NEW: not in baseline → preserved
      expect(vars.find((v) => v.name === 'DRAFT_NEW').value).toBe('from-user');
      // SCRIPT_NEW: new from script → added
      expect(vars.find((v) => v.name === 'SCRIPT_NEW').value).toBe('from-script');
    });
  });

  describe('typed values — dataType inference', () => {
    test('infers number dataType when script sets a numeric value', () => {
      const store = createStore([makeVar('COUNT', '0')]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { COUNT: 42 },
        collectionUid: COLLECTION_UID
      }));

      const v = getReqVars(store).find((v) => v.name === 'COUNT');
      expect(v.dataType).toBe('number');
    });

    test('infers boolean dataType when script sets a boolean value', () => {
      const store = createStore([makeVar('FLAG', 'false')]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { FLAG: true },
        collectionUid: COLLECTION_UID
      }));

      const v = getReqVars(store).find((v) => v.name === 'FLAG');
      expect(v.dataType).toBe('boolean');
    });

    test('infers object dataType when script sets an object value', () => {
      const store = createStore([makeVar('CONFIG', '')]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { CONFIG: { port: 3000 } },
        collectionUid: COLLECTION_UID
      }));

      const v = getReqVars(store).find((v) => v.name === 'CONFIG');
      expect(v.dataType).toBe('object');
    });

    test('keeps existing dataType on a typed var the script did not touch', () => {
      const typedVar = { ...makeVar('COUNT', 42), dataType: 'number' };
      const store = createStore([typedVar, makeVar('HOST', 'https://example.com')]);

      // Script touched HOST only; the runtime payload still carries COUNT (unchanged).
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { COUNT: 42, HOST: 'https://new.com' },
        collectionUid: COLLECTION_UID
      }));

      const v = getReqVars(store).find((v) => v.name === 'COUNT');
      expect(v.dataType).toBe('number');
    });

    test('drops dataType when script replaces a typed value with a string', () => {
      const typedVar = { ...makeVar('COUNT', 42), dataType: 'number' };
      const store = createStore([typedVar]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { COUNT: 'not-a-number' },
        collectionUid: COLLECTION_UID
      }));

      const v = getReqVars(store).find((v) => v.name === 'COUNT');
      expect(v.dataType).toBeUndefined();
    });

    test('updates dataType when script changes the value type', () => {
      const typedVar = { ...makeVar('VAL', 42), dataType: 'number' };
      const store = createStore([typedVar]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { VAL: true },
        collectionUid: COLLECTION_UID
      }));

      const v = getReqVars(store).find((v) => v.name === 'VAL');
      expect(v.dataType).toBe('boolean');
    });
  });

  describe('baseline cleanup', () => {
    test('initRunRequestEvent clears collection var baseline', () => {
      const rootVars = [makeVar('HOST', 'https://saved.com')];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://draft.com')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Create baseline via script event
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://saved.com' },
        collectionUid: COLLECTION_UID
      }));

      expect(getCollection(store)._scriptCollVarBaseline).toBeDefined();

      // Start a new request — baseline should be cleared
      store.dispatch(initRunRequestEvent({
        requestUid: REQUEST_UID,
        itemUid: ITEM_UID,
        collectionUid: COLLECTION_UID
      }));

      expect(getCollection(store)._scriptCollVarBaseline).toBeUndefined();
    });
  });

  describe('description / annotations preservation across script-driven updates', () => {
    const annotations = [
      { name: 'number' },
      { name: 'description', value: 'server port' }
    ];

    test('script touching a sibling var must NOT erase annotations on untouched vars', () => {
      const annotated = { ...makeVar('PORT', 8080), dataType: 'number', annotations: annotations };
      const sibling = makeVar('TOKEN', 'abc');

      const store = createStore([annotated, sibling]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { PORT: 8080, TOKEN: 'new-token' },
        collectionUid: COLLECTION_UID
      }));

      const port = getReqVars(store).find((v) => v.name === 'PORT');
      expect(port.annotations).toEqual(annotations);
      expect(port.dataType).toBe('number');
    });

    test('script overwriting a var\'s value preserves its annotations', () => {
      const annotated = { ...makeVar('PORT', 8080), dataType: 'number', annotations: annotations };

      const store = createStore([annotated]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { PORT: 9090 },
        collectionUid: COLLECTION_UID
      }));

      const port = getReqVars(store).find((v) => v.name === 'PORT');
      expect(port.value).toBe(9090);
      expect(port.annotations).toEqual(annotations);
      expect(port.dataType).toBe('number');
    });
  });

  describe('object/array typed-var no-op writes preserve draft (deep-equal compare)', () => {
    test('script re-writing a structurally-equal object value does NOT clobber draft edit', () => {
      const savedVar = { ...makeVar('CFG', { port: 3000 }), dataType: 'object' };
      const draftVar = { ...makeVar('CFG', { port: 4000 }), dataType: 'object' };

      const draftRoot = { request: { vars: { req: [draftVar] } } };
      const store = createStore([savedVar], { draft: { root: draftRoot } });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { CFG: { port: 3000 } },
        collectionUid: COLLECTION_UID
      }));

      const cfg = getReqVars(store).find((v) => v.name === 'CFG');
      expect(cfg.value).toEqual({ port: 4000 });
    });
  });

  describe('disabled-var name collision — script targets enabled slot only', () => {
    test('script setting X writes to the enabled X, leaves the disabled X untouched', () => {
      const disabledX = makeVar('X', 'archived', false);
      const enabledX = makeVar('X', 'current');

      const store = createStore([disabledX, enabledX]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { X: 'updated' },
        collectionUid: COLLECTION_UID
      }));

      const xVars = getReqVars(store).filter((v) => v.name === 'X');
      expect(xVars).toHaveLength(2);
      expect(xVars.find((v) => v.enabled === false).value).toBe('archived');
      expect(xVars.find((v) => v.enabled === true).value).toBe('updated');
    });
  });
});
