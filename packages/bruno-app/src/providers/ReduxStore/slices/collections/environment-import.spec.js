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
const { importEnvironment } = require('providers/ReduxStore/slices/collections/actions');

const COLLECTION_UID = 'col-1';
const COLLECTION_PATH = '/workspace/collections/MyCollection';

const importIntoCollection = async (environment) => {
  const invoke = jest.fn().mockResolvedValue(null);
  window.ipcRenderer = { invoke };

  const store = configureStore({
    reducer: { collections: collectionsReducer },
    preloadedState: {
      collections: {
        collectionSortOrder: 'default',
        collections: [{
          uid: COLLECTION_UID,
          pathname: COLLECTION_PATH,
          environments: [],
          collapsed: false,
          items: []
        }],
        tempDirectories: {}
      }
    }
  });

  await store.dispatch(importEnvironment({ ...environment, collectionUid: COLLECTION_UID }));

  return invoke.mock.calls.find(([channel]) => channel === 'renderer:create-environment');
};

describe('importEnvironment — inheritance', () => {
  it('passes the extends reference of an imported environment through to the file write', async () => {
    const [, , , , , inheritedEnvironmentName] = await importIntoCollection({
      name: 'dev',
      variables: [],
      extends: 'Base'
    });

    expect(inheritedEnvironmentName).toBe('Base');
  });

  it('passes no extends reference for an environment that inherits from nothing', async () => {
    const [, , , , , inheritedEnvironmentName] = await importIntoCollection({ name: 'dev', variables: [] });

    expect(inheritedEnvironmentName).toBeUndefined();
  });
});
