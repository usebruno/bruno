const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');

const saveRequest = jest.fn((itemUid, collectionUid) => ({ type: 'test/saveRequest', itemUid, collectionUid }));

jest.mock('../../slices/collections/actions', () => ({
  saveRequest: (...args) => saveRequest(...args),
  saveCollectionSettings: jest.fn(),
  saveFolderRoot: jest.fn(),
  saveFile: jest.fn(),
  saveEnvironment: jest.fn()
}));

jest.mock('../../slices/global-environments', () => ({
  saveGlobalEnvironment: jest.fn()
}));

jest.mock('react-hot-toast', () => ({ error: jest.fn() }));

const { autosaveMiddleware } = require('./middleware');

const INTERVAL = 500;

const createStore = (item) => {
  const state = {
    app: { preferences: { autoSave: { enabled: true, interval: INTERVAL } } },
    collections: {
      collections: [{ uid: 'c1', items: [item] }]
    },
    globalEnvironments: {}
  };
  const dispatch = jest.fn();
  const invoke = autosaveMiddleware({ dispatch, getState: () => state })(() => {});
  return { state, dispatch, invoke };
};

const request = (draft) => ({
  uid: 'r1',
  type: 'http-request',
  request: { url: 'https://example.com' },
  ...(draft ? { draft } : {})
});

const runEvent = (type) => ({
  type: 'collections/runRequestEvent',
  payload: { type, itemUid: 'r1', collectionUid: 'c1', requestUid: 'req-1' }
});

describe('autosaveMiddleware', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not save a request without a draft when it is run', () => {
    const { dispatch, invoke } = createStore(request());

    ['request-queued', 'request-sent', 'test-script-execution'].forEach((type) => invoke(runEvent(type)));
    jest.advanceTimersByTime(INTERVAL);

    expect(saveRequest).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('saves a request with unsaved changes when it is run', () => {
    const { dispatch, invoke } = createStore(request({ request: { url: 'https://example.com/edited' } }));

    invoke(runEvent('request-queued'));
    jest.advanceTimersByTime(INTERVAL);

    expect(saveRequest).toHaveBeenCalledTimes(1);
    expect(saveRequest).toHaveBeenCalledWith('r1', 'c1', true);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('saves a request after an edit creates a draft', () => {
    const { invoke } = createStore(request({ request: { url: 'https://example.com/edited' } }));

    invoke({ type: 'collections/requestUrlChanged', payload: { itemUid: 'r1', collectionUid: 'c1' } });
    jest.advanceTimersByTime(INTERVAL);

    expect(saveRequest).toHaveBeenCalledWith('r1', 'c1', true);
  });

  it('skips the pending save if the draft is gone when the timer fires', () => {
    const { state, invoke } = createStore(request({ request: { url: 'https://example.com/edited' } }));

    invoke({ type: 'collections/requestUrlChanged', payload: { itemUid: 'r1', collectionUid: 'c1' } });
    // e.g. saved manually with Ctrl+S before the auto-save interval elapsed
    delete state.collections.collections[0].items[0].draft;
    jest.advanceTimersByTime(INTERVAL);

    expect(saveRequest).not.toHaveBeenCalled();
  });
});
