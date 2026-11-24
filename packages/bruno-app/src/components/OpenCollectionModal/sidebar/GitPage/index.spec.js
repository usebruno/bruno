jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import openCollectionModalReducer, { hideOpenCollectionModal, pageBusyChanged } from 'providers/ReduxStore/slices/open-collection-modal';
import { cloneGitRepository, openMultipleCollections, scanForBrunoFiles } from 'providers/ReduxStore/slices/collections/actions';
import GitUrlTab from './GitUrlTab';
import GitPage from './index';

const mockTabs = { current: null };

jest.mock('./tabs', () => ({
  get GIT_PAGE_TABS() {
    return mockTabs.current || jest.requireActual('./tabs').GIT_PAGE_TABS;
  }
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  cloneGitRepository: jest.fn(),
  fetchBranchesForRepositoryUrl: jest.fn(() => () => Promise.resolve({ branches: [], defaultBranch: '' })),
  openMultipleCollections: jest.fn(),
  scanForBrunoFiles: jest.fn()
}));

const SOURCE_URL = 'https://gitlab.com/acme/api.git';

const OpensGitUrlTab = ({ openTab }) => (
  <button type="button" data-testid="open-git-url" onClick={() => openTab('git-url', { url: SOURCE_URL })}>
    open
  </button>
);

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

const twoTabs = () => [
  { id: 'other', label: 'Other', component: OpensGitUrlTab },
  { id: 'git-url', label: 'From Git repo URL', component: GitUrlTab }
];

describe('GitPage', () => {
  afterEach(() => {
    mockTabs.current = null;
  });

  it('shows no tab bar when there is one tab', async () => {
    mockTabs.current = [{ id: 'git-url', label: 'From Git repo URL', component: GitUrlTab }];
    renderPage();
    await act(async () => {});

    expect(screen.queryByTestId('open-collection-git-tabs')).toBeNull();
    expect(screen.getByTestId('open-collection-git-panel-git-url')).toBeVisible();
  });

  it('shows a tab bar and switches tabs when there are two tabs', async () => {
    mockTabs.current = twoTabs();
    renderPage();
    await act(async () => {});

    expect(screen.getByTestId('open-collection-git-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('open-collection-git-tab-other')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('open-collection-git-panel-other')).toBeInTheDocument();
    expect(screen.queryByTestId('open-collection-git-panel-git-url')).toBeNull();

    fireEvent.click(screen.getByTestId('open-collection-git-tab-git-url'));
    await act(async () => {});

    expect(screen.getByTestId('open-collection-git-tab-git-url')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('open-collection-git-tab-other')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('open-collection-git-panel-git-url')).toBeInTheDocument();
    expect(screen.queryByTestId('open-collection-git-panel-other')).toBeNull();
  });

  it('switches tabs with the keyboard', async () => {
    mockTabs.current = twoTabs();
    renderPage();

    fireEvent.keyDown(screen.getByTestId('open-collection-git-tab-git-url'), { key: 'Enter' });
    await act(async () => {});

    expect(screen.getByTestId('open-collection-git-tab-git-url')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('open-collection-git-panel-git-url')).toBeInTheDocument();
  });

  it('passes params to the tab opened with openTab', async () => {
    mockTabs.current = twoTabs();
    renderPage();

    fireEvent.click(screen.getByTestId('open-git-url'));
    await act(async () => {});

    expect(screen.getByLabelText('Git Repository URL')).toHaveValue(SOURCE_URL);
  });

  it('remounts the tab with new params when openTab targets the active tab', async () => {
    const SelfOpener = ({ params, openTab }) => (
      <div>
        <span data-testid="seen-url">{params.url || 'none'}</span>
        <input data-testid="draft" defaultValue="" />
        <button type="button" data-testid="reopen" onClick={() => openTab('self', { url: SOURCE_URL })}>
          reopen
        </button>
      </div>
    );
    mockTabs.current = [{ id: 'self', label: 'Self', component: SelfOpener }];
    renderPage();

    fireEvent.change(screen.getByTestId('draft'), { target: { value: 'typed' } });
    expect(screen.getByTestId('draft')).toHaveValue('typed');

    fireEvent.click(screen.getByTestId('reopen'));

    expect(screen.getByTestId('seen-url')).toHaveTextContent(SOURCE_URL);
    expect(screen.getByTestId('draft')).toHaveValue('');
  });

  it('keeps the tab input when the active tab is clicked again', () => {
    const Draft = () => <input data-testid="draft" defaultValue="" />;
    mockTabs.current = [
      { id: 'a', label: 'A', component: Draft },
      { id: 'b', label: 'B', component: Draft }
    ];
    renderPage();

    fireEvent.change(screen.getByTestId('draft'), { target: { value: 'typed' } });
    fireEvent.click(screen.getByTestId('open-collection-git-tab-a'));

    expect(screen.getByTestId('draft')).toHaveValue('typed');
  });

  it('ignores openTab for an unknown tab id', () => {
    const Unknown = ({ openTab }) => (
      <div>
        <input data-testid="draft" defaultValue="" />
        <button type="button" data-testid="open-unknown" onClick={() => openTab('missing', {})}>
          open
        </button>
      </div>
    );
    mockTabs.current = [{ id: 'a', label: 'A', component: Unknown }];
    renderPage();

    fireEvent.change(screen.getByTestId('draft'), { target: { value: 'typed' } });
    fireEvent.click(screen.getByTestId('open-unknown'));

    expect(screen.getByTestId('open-collection-git-panel-a')).toBeInTheDocument();
    expect(screen.getByTestId('draft')).toHaveValue('typed');
  });

  describe('while the page is busy', () => {
    it('does not switch tabs', () => {
      mockTabs.current = twoTabs();
      renderPage({ pageBusy: true });

      fireEvent.click(screen.getByTestId('open-collection-git-tab-git-url'));

      expect(screen.getByTestId('open-collection-git-tab-other')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('open-collection-git-panel-other')).toBeInTheDocument();
    });

    it('ignores openTab', () => {
      mockTabs.current = twoTabs();
      renderPage({ pageBusy: true });

      fireEvent.click(screen.getByTestId('open-git-url'));

      expect(screen.getByTestId('open-collection-git-panel-other')).toBeInTheDocument();
    });
  });

  it('marks the page busy while the clone runs and frees it when the clone ends', async () => {
    let finishClone;
    cloneGitRepository.mockImplementation(() => () => new Promise((resolve) => {
      finishClone = resolve;
    }));
    scanForBrunoFiles.mockImplementation(() => () => Promise.resolve({ items: [], skippedItems: [] }));
    const store = renderPage();
    const pageBusy = () => store.getState().openCollectionModal.pageBusy;

    fireEvent.change(screen.getByLabelText('Git Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });
    expect(pageBusy()).toBe(true);

    await act(async () => {
      finishClone();
    });
    expect(pageBusy()).toBe(false);
  });

  it('keeps the page busy for a second clone when a clone from a closed Git page ends', async () => {
    const finishers = [];
    cloneGitRepository.mockImplementation(() => () => new Promise((resolve) => {
      finishers.push(resolve);
    }));
    scanForBrunoFiles.mockImplementation(() => () => Promise.resolve({ items: [], skippedItems: [] }));
    const store = createModalStore();
    const pageBusy = () => store.getState().openCollectionModal.pageBusy;
    const startClone = async () => {
      fireEvent.change(screen.getByLabelText('Git Repository URL'), { target: { value: SOURCE_URL } });
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

  it('frees the page when the clone fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    cloneGitRepository.mockImplementation(() => () => Promise.reject(new Error('clone failed')));
    const store = renderPage();

    fireEvent.change(screen.getByLabelText('Git Repository URL'), { target: { value: SOURCE_URL } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(store.getState().openCollectionModal.pageBusy).toBe(false);
    console.error.mockRestore();
  });

  it('opens the selected collections after the clone and closes the modal once', async () => {
    const collection = { name: 'Orders API', pathname: '/home/user/collections/api/orders' };
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    scanForBrunoFiles.mockImplementation(() => () => Promise.resolve({ items: [collection], skippedItems: [] }));
    openMultipleCollections.mockImplementation((paths) => () => Promise.resolve({ opened: paths, failed: [], invalid: [] }));
    const store = renderPage();

    fireEvent.change(screen.getByLabelText('Git Repository URL'), { target: { value: SOURCE_URL } });
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

  it('closes the modal when the tab asks to close', async () => {
    const Closer = ({ closeModal }) => (
      <button type="button" data-testid="closer" onClick={closeModal}>
        close
      </button>
    );
    mockTabs.current = [{ id: 'closer', label: 'Closer', component: Closer }];
    const store = renderPage();

    fireEvent.click(screen.getByTestId('closer'));

    expect(store.getState().openCollectionModal.isOpen).toBe(false);
  });
});
