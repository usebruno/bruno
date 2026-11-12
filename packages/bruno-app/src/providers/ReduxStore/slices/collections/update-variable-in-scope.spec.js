jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer from 'providers/ReduxStore/slices/collections';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_UID = 'col-1';
const FOLDER_UID = 'folder-1';

const makeFolderVar = (name, value) => ({
  uid: `uid-${name}`,
  name,
  value,
  enabled: true
});

const createStore = () => {
  const folder = {
    uid: FOLDER_UID,
    name: 'Auth folder',
    type: 'folder',
    pathname: '/collection/Auth folder',
    root: {
      request: {
        vars: {
          req: [
            makeFolderVar('redirectUrl', 'http://127.0.0.1:1664'),
            makeFolderVar('other', 'kept')
          ],
          res: []
        },
        auth: {
          mode: 'oauth2',
          oauth2: {
            grantType: 'authorization_code',
            callbackUrl: '{{redirectUrl}}'
          }
        }
      }
    }
  };

  return configureStore({
    reducer: {
      collections: collectionsReducer
    },
    preloadedState: {
      collections: {
        collections: [
          {
            uid: COLLECTION_UID,
            pathname: '/collection',
            format: 'bru',
            brunoConfig: { version: '1', name: 'test', type: 'collection' },
            root: { request: { vars: { req: [] } } },
            environments: [
              {
                uid: 'env-1',
                name: 'Local',
                variables: [makeFolderVar('redirectUrl', 'http://env.example/callback')]
              }
            ],
            activeEnvironmentUid: 'env-1',
            items: [folder]
          }
        ],
        collectionSortOrder: 'default',
        activeWorkspaceUid: null
      }
    }
  });
};

const getFolderReqVars = (store) => store.getState().collections.collections[0].items[0].root.request.vars.req;

describe('updateVariableInScope', () => {
  beforeEach(() => {
    if (typeof window === 'undefined') {
      global.window = {};
    }
    window.ipcRenderer = {
      invoke: jest.fn().mockResolvedValue(true)
    };
  });

  it('deletes a folder variable when its value is cleared', async () => {
    const store = createStore();
    const folder = store.getState().collections.collections[0].items[0];
    const variable = folder.root.request.vars.req.find((v) => v.name === 'redirectUrl');

    await store.dispatch(updateVariableInScope('redirectUrl', '', {
      type: 'folder',
      data: { folder, variable }
    }, COLLECTION_UID));

    expect(getFolderReqVars(store)).toEqual([
      expect.objectContaining({ name: 'other', value: 'kept' })
    ]);
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:save-folder-root',
      expect.objectContaining({
        root: expect.objectContaining({
          request: expect.objectContaining({
            vars: {
              req: [expect.objectContaining({ name: 'other', value: 'kept' })],
              res: []
            }
          })
        })
      })
    );
  });
});
