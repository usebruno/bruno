jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, {
  appSetRuntimeVariable,
  appUnsetRuntimeVariable
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';

const createStore = ({ runtimeVariables } = {}) => {
  const collection = {
    uid: COLLECTION_UID,
    pathname: '/coll',
    root: {},
    draft: null,
    items: []
  };
  if (runtimeVariables !== undefined) {
    collection.runtimeVariables = runtimeVariables;
  }

  return configureStore({
    reducer: {
      collections: collectionsReducer
    },
    preloadedState: {
      collections: {
        collections: [collection],
        collectionSortOrder: 'default',
        activeWorkspaceUid: null
      }
    }
  });
};

const getRuntimeVariables = (store) => store.getState().collections.collections[0].runtimeVariables;

describe('appUnsetRuntimeVariable', () => {
  test('removes only the named runtime variable and keeps the others', () => {
    const store = createStore({ runtimeVariables: { token: 'abc', userId: 42 } });

    store.dispatch(appUnsetRuntimeVariable({ collectionUid: COLLECTION_UID, key: 'token' }));

    expect(getRuntimeVariables(store)).toEqual({ userId: 42 });
    expect(Object.hasOwn(getRuntimeVariables(store), 'token')).toBe(false);
  });

  test('a set followed by an unset leaves the variable absent', () => {
    const store = createStore({ runtimeVariables: {} });

    store.dispatch(appSetRuntimeVariable({ collectionUid: COLLECTION_UID, key: 'hello', value: 'world' }));
    expect(getRuntimeVariables(store)).toEqual({ hello: 'world' });

    store.dispatch(appUnsetRuntimeVariable({ collectionUid: COLLECTION_UID, key: 'hello' }));
    expect(getRuntimeVariables(store)).toEqual({});
  });

  test('is a no-op when the variable does not exist', () => {
    const store = createStore({ runtimeVariables: { token: 'abc' } });

    store.dispatch(appUnsetRuntimeVariable({ collectionUid: COLLECTION_UID, key: 'missing' }));

    expect(getRuntimeVariables(store)).toEqual({ token: 'abc' });
  });

  test('does not throw when the collection has no runtime variables yet', () => {
    const store = createStore();

    expect(() => {
      store.dispatch(appUnsetRuntimeVariable({ collectionUid: COLLECTION_UID, key: 'token' }));
    }).not.toThrow();
    expect(getRuntimeVariables(store)).toBeUndefined();
  });

  test('is a no-op for an unknown collection', () => {
    const store = createStore({ runtimeVariables: { token: 'abc' } });

    store.dispatch(appUnsetRuntimeVariable({ collectionUid: 'unknown', key: 'token' }));

    expect(getRuntimeVariables(store)).toEqual({ token: 'abc' });
  });
});
