import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import useIpcEvents from './useIpcEvents';

jest.mock('nanoid', () => {
  let count = 0;
  return { customAlphabet: () => () => `mock-id-${(count += 1)}` };
});

const RECENT_COLLECTIONS_CHANGED = 'main:recent-collections-changed';
const GET_RECENT_COLLECTIONS = 'renderer:get-recent-collections';

const closedModal = openCollectionModalReducer(undefined, { type: 'init' });

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
    return renderHook(() => useIpcEvents(), { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });
  };

  it('reads the recent collections again when they change while the modal is open', async () => {
    renderWithModal({ ...closedModal, isOpen: true, page: 'recents' });

    await act(async () => {
      listeners[RECENT_COLLECTIONS_CHANGED]();
    });

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(GET_RECENT_COLLECTIONS);
  });

  it('does not read them while the modal is closed', async () => {
    renderWithModal(closedModal);

    await act(async () => {
      listeners[RECENT_COLLECTIONS_CHANGED]();
    });

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith(GET_RECENT_COLLECTIONS);
  });

  it('stops listening for changes when it unmounts', () => {
    const { unmount } = renderWithModal(closedModal);

    unmount();

    expect(removers[RECENT_COLLECTIONS_CHANGED]).toHaveBeenCalled();
  });
});
