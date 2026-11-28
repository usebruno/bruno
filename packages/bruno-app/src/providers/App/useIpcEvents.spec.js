import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import openCollectionModalReducer, { myComputerScanStarted } from 'providers/ReduxStore/slices/open-collection-modal';
import useIpcEvents from './useIpcEvents';

jest.mock('nanoid', () => {
  let count = 0;
  return { customAlphabet: () => () => `mock-id-${(count += 1)}` };
});

const RECENT_COLLECTIONS_CHANGED = 'main:recent-collections-changed';
const LIST_RECENT_COLLECTIONS = 'datastore:recent_collections:list_recent_collections';
const COLLECTION_SCAN_BATCH = 'main:collection-scan:batch';
const COLLECTION_SCAN_DONE = 'main:collection-scan:done';

const closedModal = openCollectionModalReducer(undefined, { type: 'init' });
const scanningModal = (scanId) => openCollectionModalReducer({ ...closedModal, isOpen: true, page: 'my-computer' }, myComputerScanStarted(scanId));

const api = { path: '/work/api', name: 'API', mtime: 1700000000000, locationId: '/work' };
const doneLocations = [{ id: '/work', path: '/work', kind: 'user', status: 'done', found: 1 }];

describe('useIpcEvents', () => {
  let listeners;
  let removers;

  beforeEach(() => {
    listeners = {};
    removers = {};
    window.ipcRenderer = {
      on: jest.fn((channel, listener) => {
        listeners[channel] = listener;
        removers[channel] = jest.fn();
        return removers[channel];
      }),
      invoke: jest.fn().mockResolvedValue([])
    };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  const renderWithModal = (openCollectionModal) => {
    const store = configureStore({
      reducer: { openCollectionModal: openCollectionModalReducer },
      preloadedState: { openCollectionModal }
    });
    return { store, ...renderHook(() => useIpcEvents(), { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> }) };
  };

  const myComputerState = (store) => store.getState().openCollectionModal.myComputer;

  it('reads the recent collections again when they change while the modal is open', async () => {
    renderWithModal({ ...closedModal, isOpen: true, page: 'recents' });

    await act(async () => {
      listeners[RECENT_COLLECTIONS_CHANGED]();
    });

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
  });

  it('does not read them while the modal is closed', async () => {
    renderWithModal(closedModal);

    await act(async () => {
      listeners[RECENT_COLLECTIONS_CHANGED]();
    });

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
  });

  it('stops listening for changes when it unmounts', () => {
    const { unmount } = renderWithModal(closedModal);

    unmount();

    expect(removers[RECENT_COLLECTIONS_CHANGED]).toHaveBeenCalled();
  });

  it('adds the collections a scan finds and its final locations to My computer', () => {
    const { store } = renderWithModal(scanningModal('scan-1'));

    act(() => {
      listeners[COLLECTION_SCAN_BATCH]({ scanId: 'scan-1', collections: [api] });
    });
    expect(myComputerState(store).collections).toEqual([api]);

    act(() => {
      listeners[COLLECTION_SCAN_DONE]({ scanId: 'scan-1', locations: doneLocations, error: null });
    });
    expect(myComputerState(store)).toMatchObject({ status: 'done', locations: doneLocations, collections: [api] });
  });

  it('ignores the events of a scan that is not the current one', () => {
    const scanning = scanningModal('scan-2');
    const { store } = renderWithModal(scanning);

    act(() => {
      listeners[COLLECTION_SCAN_BATCH]({ scanId: 'scan-1', collections: [api] });
      listeners[COLLECTION_SCAN_DONE]({ scanId: 'scan-1', locations: doneLocations, error: null });
    });

    expect(myComputerState(store)).toEqual(scanning.myComputer);
  });

  it('stops listening for scan events when it unmounts', () => {
    const { unmount } = renderWithModal(closedModal);

    unmount();

    expect(removers[COLLECTION_SCAN_BATCH]).toHaveBeenCalled();
    expect(removers[COLLECTION_SCAN_DONE]).toHaveBeenCalled();
  });
});
