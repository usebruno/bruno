const mockSaveRequest = jest.fn(() => ({ type: 'save-request' }));

jest.mock('../../slices/collections/actions', () => ({
  saveRequest: (...args) => mockSaveRequest(...args),
  saveCollectionSettings: jest.fn(),
  saveFolderRoot: jest.fn(),
  saveFile: jest.fn(),
  saveEnvironment: jest.fn()
}));
jest.mock('../../slices/global-environments', () => ({
  saveGlobalEnvironment: jest.fn()
}));
jest.mock('utils/collections', () => ({
  flattenItems: (items) => items,
  isItemARequest: (item) => item?.type === 'http-request',
  isItemAFolder: (item) => item?.type === 'folder',
  findItemInCollection: (collection, itemUid) => collection.items.find((item) => item.uid === itemUid),
  findCollectionByUid: (collections, collectionUid) => collections.find((collection) => collection.uid === collectionUid),
  isItemTransientRequest: (item) => item?.isTransient === true
}));
jest.mock('utils/environments', () => ({
  isEnvironmentValidationError: () => false
}));
jest.mock('react-hot-toast', () => ({
  error: jest.fn()
}));

const { autosaveMiddleware } = require('./middleware');

describe('autosaveMiddleware transient requests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSaveRequest.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('keeps a pending transient save when autosave is disabled', () => {
    const state = {
      app: {
        preferences: {
          autoSave: {
            enabled: true,
            interval: 100
          }
        }
      },
      collections: {
        collections: [
          {
            uid: 'collection-1',
            items: [{ uid: 'request-1', type: 'http-request', isTransient: true }]
          }
        ]
      }
    };
    const dispatch = jest.fn();
    const next = jest.fn((action) => {
      if (action.type === 'app/updatePreferences') {
        state.app.preferences.autoSave.enabled = action.payload.autoSave.enabled;
      }
      return action;
    });
    const invoke = autosaveMiddleware({ dispatch, getState: () => state })(next);

    invoke({
      type: 'collections/requestUrlChanged',
      payload: { itemUid: 'request-1', collectionUid: 'collection-1' }
    });
    invoke({
      type: 'app/updatePreferences',
      payload: { autoSave: { enabled: false } }
    });
    jest.advanceTimersByTime(100);

    expect(mockSaveRequest).toHaveBeenCalledWith('request-1', 'collection-1', true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'save-request' });
  });
});
