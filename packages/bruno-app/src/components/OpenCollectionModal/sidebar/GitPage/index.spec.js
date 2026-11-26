jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import openCollectionModalReducer, { hideOpenCollectionModal, pageBusyChanged } from 'providers/ReduxStore/slices/open-collection-modal';
import { cloneGitRepository, fetchBranchesForRepositoryUrl, findCollectionsInClonedRepository, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import GitPage from './index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), custom: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  cloneGitRepository: jest.fn(),
  fetchBranchesForRepositoryUrl: jest.fn(() => () => Promise.resolve({ branches: [], defaultBranch: '' })),
  findCollectionsInClonedRepository: jest.fn(),
  openMultipleCollections: jest.fn()
}));

const SOURCE_URL = 'https://gitlab.com/acme/api.git';

const createModalStore = (modal = {}) =>
  configureStore({
    reducer: {
      app: () => ({ gitVersion: '2.40.0', gitOperationProgress: {}, preferences: { general: { defaultLocation: '/home/user/collections' } } }),
      workspaces: () => ({ workspaces: [], activeWorkspaceUid: null }),
      openCollectionModal: openCollectionModalReducer,
      actionTypes: (state = [], action) => [...state, action.type]
    },
    preloadedState: {
      openCollectionModal: { ...openCollectionModalReducer(undefined, { type: 'init' }), isOpen: true, page: 'git', ...modal }
    }
  });

const renderPageWithStore = (store) =>
  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <GitPage />
      </ThemeProvider>
    </Provider>
  );

const renderPage = (modal = {}) => {
  const store = createModalStore(modal);
  renderPageWithStore(store);
  return store;
};

describe('GitPage', () => {
  afterEach(() => {
    toast.success.mockClear();
  });

  it('lets the page and its panel fill the modal height so the panel can shrink', async () => {
    renderPage();
    await act(async () => {});

    const panel = screen.getByTestId('open-collection-git-panel');
    expect(panel.parentElement).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
    expect(panel).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
  });

  it('says the URL is not valid and does not clone it', async () => {
    cloneGitRepository.mockClear();
    renderPage();
    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: 'github.com/acme/api' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(screen.getByTestId('clone-git-repository-url-error')).toHaveTextContent('Please enter a valid git repository URL');
    expect(cloneGitRepository).not.toHaveBeenCalled();
  });

  it('marks the page busy while the clone runs and frees it when the clone ends', async () => {
    let finishClone;
    cloneGitRepository.mockImplementation(() => () => new Promise((resolve) => {
      finishClone = resolve;
    }));
    findCollectionsInClonedRepository.mockImplementation(() => () => Promise.resolve({ items: [], skippedItems: [] }));
    const store = renderPage();
    const pageBusy = () => store.getState().openCollectionModal.pageBusy;

    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });
    expect(pageBusy()).toBe(true);

    await act(async () => {
      finishClone();
    });
    expect(pageBusy()).toBe(false);
  });

  it('keeps the page busy until the scan after a clone finishes', async () => {
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    let finishScan;
    findCollectionsInClonedRepository.mockImplementation(() => () => new Promise((resolve) => {
      finishScan = resolve;
    }));
    const store = renderPage();
    const pageBusy = () => store.getState().openCollectionModal.pageBusy;

    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });
    expect(screen.getByText('Scanning for Bruno files')).toBeInTheDocument();
    expect(pageBusy()).toBe(true);

    await act(async () => {
      finishScan({ items: [], skippedItems: [] });
    });
    expect(pageBusy()).toBe(false);
  });

  it('marks only the scan step failed when the scan fails after a clone', async () => {
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    findCollectionsInClonedRepository.mockImplementation(() => () => Promise.reject(new Error('scan failed')));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const store = renderPage();

    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(screen.getByText('Scan failed')).toBeInTheDocument();
    expect(screen.queryByText('Cloning failed')).toBeNull();
    expect(screen.queryByTestId('clone-git-scan-result')).toBeNull();
    expect(screen.getByTestId('clone-git-repository-modal-back-btn')).toBeInTheDocument();
    expect(screen.getByTestId('clone-git-inline-confirm')).toHaveTextContent('Close');
    expect(store.getState().openCollectionModal.pageBusy).toBe(false);
    consoleError.mockRestore();
  });

  it('keeps the page busy for a second clone when a clone from a closed Git page ends', async () => {
    const finishers = [];
    cloneGitRepository.mockImplementation(() => () => new Promise((resolve) => {
      finishers.push(resolve);
    }));
    findCollectionsInClonedRepository.mockImplementation(() => () => Promise.resolve({ items: [], skippedItems: [] }));
    const store = createModalStore();
    const pageBusy = () => store.getState().openCollectionModal.pageBusy;
    const startClone = async () => {
      fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
      });
    };

    const first = renderPageWithStore(store);
    await startClone();
    expect(pageBusy()).toBe(true);

    first.unmount();
    act(() => {
      store.dispatch(pageBusyChanged(false));
    });
    renderPageWithStore(store);
    await startClone();
    expect(pageBusy()).toBe(true);

    await act(async () => {
      finishers[0]();
    });
    expect(pageBusy()).toBe(true);

    await act(async () => {
      finishers[1]();
    });
    expect(pageBusy()).toBe(false);
  });

  it('keeps cloning after the modal closes and says when the clone is done', async () => {
    let finishClone;
    cloneGitRepository.mockImplementation(() => () => new Promise((resolve) => {
      finishClone = resolve;
    }));
    findCollectionsInClonedRepository.mockImplementation(() => () => Promise.resolve({ items: [], skippedItems: [] }));
    const store = createModalStore();
    const page = renderPageWithStore(store);
    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    page.unmount();
    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });
    expect(store.getState().openCollectionModal.pageBusy).toBe(false);
    await act(async () => {
      finishClone();
    });

    expect(toast.success).toHaveBeenCalledWith('Repository cloned successfully');
    expect(store.getState().openCollectionModal.pageBusy).toBe(false);
  });

  it('frees the page when the clone fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    cloneGitRepository.mockImplementation(() => () => Promise.reject(new Error('clone failed')));
    const store = renderPage();

    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(store.getState().openCollectionModal.pageBusy).toBe(false);
    console.error.mockRestore();
  });

  it('opens the selected collections after the clone and closes the modal once', async () => {
    const collection = { name: 'Orders API', pathname: '/home/user/collections/api/orders' };
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    findCollectionsInClonedRepository.mockImplementation(() => () => Promise.resolve({ items: [collection], skippedItems: [] }));
    openMultipleCollections.mockImplementation((paths) => () => Promise.resolve({ opened: paths, failed: [], invalid: [] }));
    const store = renderPage();

    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });
    fireEvent.click(screen.getByText('Orders API'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(openMultipleCollections).toHaveBeenCalledTimes(1);
    expect(openMultipleCollections).toHaveBeenCalledWith([collection.pathname], { silent: true, dontSendDisplayErrors: true });
    expect(store.getState().openCollectionModal.isOpen).toBe(false);
    expect(store.getState().actionTypes.filter((type) => type === hideOpenCollectionModal.type)).toHaveLength(1);
  });

  it('closes the modal from Close after a failed clone', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    cloneGitRepository.mockImplementation(() => () => Promise.reject(new Error('clone failed')));
    const store = renderPage();

    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });
    fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));

    expect(store.getState().openCollectionModal.isOpen).toBe(false);
    console.error.mockRestore();
  });
});
