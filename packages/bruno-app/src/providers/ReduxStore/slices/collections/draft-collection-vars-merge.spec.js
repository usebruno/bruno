jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, { setCollectionVars, saveCollectionDraft } from 'providers/ReduxStore/slices/collections';
import { collectionVariablesUpdateEvent } from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_UID = 'col-1';

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

const getReqVars = (store) => {
  const col = store.getState().collections.collections[0];
  // After setCollectionVars, vars live in draft.root; after saveCollectionDraft, they're in root
  const root = col.draft?.root || col.root || {};
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

    test('converts values to strings', () => {
      const store = createStore([]);

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { count: 42, flag: true },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars.find((v) => v.name === 'count').value).toBe('42');
      expect(vars.find((v) => v.name === 'flag').value).toBe('true');
    });
  });

  describe('with draft pending — reads from draft.root', () => {
    test('applies script changes on top of draft variables', () => {
      const rootVars = [makeVar('HOST', 'https://saved.com')];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://draft.com'), makeVar('DRAFT_NEW', 'from-user')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://new-from-script.com', TOKEN: 'abc' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      // HOST: script updated it
      expect(vars.find((v) => v.name === 'HOST').value).toBe('https://new-from-script.com');
      // DRAFT_NEW: not in script output → removed (it was enabled and script didn't return it)
      // This is the expected behavior since collectionVariablesUpdateEvent doesn't do baseline diffing
      expect(vars.find((v) => v.name === 'DRAFT_NEW')).toBeUndefined();
      // TOKEN: new from script
      expect(vars.find((v) => v.name === 'TOKEN').value).toBe('abc');
    });

    test('deleteCollectionVar removes variable from draft', () => {
      const rootVars = [makeVar('HOST', 'https://saved.com'), makeVar('TOKEN', 'saved')];
      const draftRoot = {
        request: {
          vars: {
            req: [makeVar('HOST', 'https://draft.com'), makeVar('TOKEN', 'draft-token')]
          }
        }
      };
      const store = createStore(rootVars, { draft: { root: draftRoot } });

      // Script deleted TOKEN
      store.dispatch(collectionVariablesUpdateEvent({
        collectionVariables: { HOST: 'https://draft.com' },
        collectionUid: COLLECTION_UID
      }));

      const vars = getReqVars(store);
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('HOST');
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
  });
});
