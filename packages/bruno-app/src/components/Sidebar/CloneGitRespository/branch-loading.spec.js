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
import path from 'utils/common/path';
import { cloneGitRepository, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import CloneGitRepository from './index';

const mockListBranches = (url) => window.ipcRenderer.invoke('renderer:list-remote-branches-for-url', { url });

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  cloneGitRepository: jest.fn(),
  fetchBranchesForRepositoryUrl: (url) => () => mockListBranches(url),
  findCollectionsInClonedRepository: jest.requireActual('providers/ReduxStore/slices/collections/actions')
    .findCollectionsInClonedRepository,
  openMultipleCollections: jest.fn()
}));

const COLLECTION_SEARCH_CHANNEL = 'renderer:collection-search:find-in-folders';

const API_URL = 'https://github.com/acme/api.git';
const OTHER_URL = 'https://github.com/acme/web.git';

const SET_DEFAULT_LOCATION = 'test/setDefaultLocation';

const appReducer = (
  state = {
    gitVersion: '2.40.0',
    gitOperationProgress: {},
    preferences: { general: { defaultLocation: '/home/user/collections' } }
  },
  action
) => (action.type === SET_DEFAULT_LOCATION ? { ...state, preferences: { general: { defaultLocation: action.payload } } } : state);

const createStore = () =>
  configureStore({
    reducer: {
      app: appReducer,
      workspaces: () => ({ workspaces: [], activeWorkspaceUid: null })
    }
  });

const renderFlow = (props = {}, store = createStore()) =>
  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <CloneGitRepository onClose={jest.fn()} onFinish={jest.fn()} variant="inline" {...props} />
      </ThemeProvider>
    </Provider>
  );

const typeUrl = (url) => fireEvent.change(screen.getByLabelText('Git Repository URL'), { target: { value: url } });

const advance = (ms) => act(async () => {
  jest.advanceTimersByTime(ms);
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const branchListCalls = () =>
  window.ipcRenderer.invoke.mock.calls.filter(([channel]) => channel === 'renderer:list-remote-branches-for-url');

describe('CloneGitRepository branch loading', () => {
  let branchResponses;
  let collectionSearchResult;

  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    branchResponses = {};
    collectionSearchResult = { folders: [], collections: [], brokenCollectionPaths: [], unreadableFolderCount: 0, stoppedEarly: false };
    window.ipcRenderer = {
      invoke: jest.fn((channel, { url }) =>
        channel === COLLECTION_SEARCH_CHANNEL
          ? Promise.resolve(collectionSearchResult)
          : branchResponses[url] || Promise.resolve({ branches: [], defaultBranch: '' }))
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete window.ipcRenderer;
  });

  it('loads branches 500 ms after a valid URL is typed', async () => {
    renderFlow();
    typeUrl(API_URL);

    await advance(499);
    expect(branchListCalls()).toHaveLength(0);

    await advance(1);
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:list-remote-branches-for-url', { url: API_URL });
    expect(branchListCalls()).toHaveLength(1);
  });

  it.each([
    ['a user and token', 'https://user:token@github.com/acme/api.git'],
    ['a token as the user', 'https://ghp_token@github.com/acme/api.git']
  ])('does not list branches for a URL with credentials (%s)', async (_label, url) => {
    renderFlow();
    typeUrl(url);

    expect(screen.getByTestId('clone-git-repository-branch-select')).toHaveTextContent('Repository default');
    await advance(1000);
    expect(branchListCalls()).toHaveLength(0);
    expect(screen.getByTestId('clone-git-repository-branch-select')).toHaveTextContent('Repository default');
  });

  it('keeps a typed URL when the default location changes after mount', async () => {
    const store = createStore();
    renderFlow({}, store);
    typeUrl(API_URL);

    act(() => {
      store.dispatch({ type: SET_DEFAULT_LOCATION, payload: '/home/user/elsewhere' });
    });
    await advance(500);

    expect(screen.getByLabelText('Git Repository URL')).toHaveValue(API_URL);
    expect(screen.getByLabelText('Location')).toHaveValue('/home/user/elsewhere');
  });

  it('loads branches for an scp-style SSH URL and clones with it', async () => {
    const SSH_URL = 'git@github.com:acme/api.git';
    branchResponses[SSH_URL] = Promise.resolve({ branches: ['main', 'develop'], defaultBranch: 'main' });
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    renderFlow();

    typeUrl(SSH_URL);
    await advance(500);
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:list-remote-branches-for-url', { url: SSH_URL });
    expect(screen.getByTestId('clone-git-repository-branch-select')).toHaveTextContent('main');

    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(cloneGitRepository).toHaveBeenCalledWith(
      expect.objectContaining({ url: SSH_URL, branch: 'main', path: '/home/user/collections/api' })
    );
  });

  it('does not load branches for text that is not a Git URL', async () => {
    renderFlow();
    typeUrl('not a git url');

    await advance(1000);
    expect(branchListCalls()).toHaveLength(0);
  });

  it('loads branches once and right away for a locked URL', async () => {
    renderFlow({ collectionRepositoryUrl: API_URL });
    await act(async () => {});

    expect(branchListCalls()).toHaveLength(1);
    await advance(1000);
    expect(branchListCalls()).toHaveLength(1);
  });

  it('loads branches for a URL passed through initialUrl', async () => {
    renderFlow({ initialUrl: API_URL });
    await advance(500);

    expect(branchListCalls()).toHaveLength(1);
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:list-remote-branches-for-url', { url: API_URL });
  });

  it('ignores a branch list that arrives for an older URL', async () => {
    const older = deferred();
    const newer = deferred();
    branchResponses[API_URL] = older.promise;
    branchResponses[OTHER_URL] = newer.promise;
    renderFlow();

    typeUrl(API_URL);
    await advance(500);
    typeUrl(OTHER_URL);
    await advance(500);

    await act(async () => {
      newer.resolve({ branches: ['main', 'web-dev'], defaultBranch: 'main' });
    });
    await act(async () => {
      older.resolve({ branches: ['legacy'], defaultBranch: 'legacy' });
    });

    expect(screen.getByTestId('clone-git-repository-branch-select')).toHaveTextContent('main');
    expect(screen.getByTestId('clone-git-repository-branch-select')).not.toHaveTextContent('legacy');
  });

  it('loads branches for a locked URL that is not a hosted Git URL', async () => {
    renderFlow({ collectionRepositoryUrl: 'file:///tmp/repo.git' });
    await act(async () => {});

    expect(branchListCalls()).toHaveLength(1);
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:list-remote-branches-for-url', { url: 'file:///tmp/repo.git' });
  });

  it('ignores a branch list failure that arrives for an older URL', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const older = deferred();
    const newer = deferred();
    branchResponses[API_URL] = older.promise;
    branchResponses[OTHER_URL] = newer.promise;
    renderFlow();

    typeUrl(API_URL);
    await advance(500);
    typeUrl(OTHER_URL);
    await advance(500);

    await act(async () => {
      newer.resolve({ branches: ['main'], defaultBranch: 'main' });
    });
    await act(async () => {
      older.reject(new Error('ls-remote failed'));
    });

    expect(screen.getByTestId('clone-git-repository-branch-select')).toHaveTextContent('main');
    expect(screen.queryByText(/Branches could not be listed/)).toBeNull();
  });

  it('preselects the default branch and clears the picked branch when the URL changes', async () => {
    branchResponses[API_URL] = Promise.resolve({ branches: ['main', 'develop'], defaultBranch: 'main' });
    branchResponses[OTHER_URL] = Promise.resolve({ branches: ['trunk', 'beta'], defaultBranch: 'trunk' });
    renderFlow();

    typeUrl(API_URL);
    await advance(500);
    const select = screen.getByTestId('clone-git-repository-branch-select');
    expect(select).toHaveTextContent('main');

    fireEvent.click(select);
    fireEvent.click(screen.getByText('develop'));
    expect(select).toHaveTextContent('develop');

    typeUrl(OTHER_URL);
    await advance(500);
    expect(select).toHaveTextContent('trunk');
    expect(select).not.toHaveTextContent('develop');
  });

  it('does not offer the previous repository\'s branches while the new URL is debouncing', async () => {
    branchResponses[API_URL] = Promise.resolve({ branches: ['main', 'develop'], defaultBranch: 'main' });
    renderFlow();

    typeUrl(API_URL);
    await advance(500);
    const select = screen.getByTestId('clone-git-repository-branch-select');
    expect(select).toHaveTextContent('main');

    typeUrl(OTHER_URL);
    expect(select).toHaveTextContent('Loading branches...');
    expect(select).not.toHaveTextContent('main');
    fireEvent.click(select);
    expect(screen.queryByText('develop')).toBeNull();

    await advance(500);
  });

  it('shows "Branches could not be listed for this repository. Cloning will use the default branch." when listing fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const failing = deferred();
    branchResponses[API_URL] = failing.promise;
    renderFlow();

    typeUrl(API_URL);
    await advance(500);
    await act(async () => {
      failing.reject(new Error('ls-remote failed'));
    });

    expect(
      screen.getByText('Branches could not be listed for this repository. Cloning will use the default branch.')
    ).toBeInTheDocument();
  });

  it('clones with the picked branch', async () => {
    branchResponses[API_URL] = Promise.resolve({ branches: ['main', 'develop'], defaultBranch: 'main' });
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    renderFlow();

    typeUrl(API_URL);
    await advance(500);
    fireEvent.click(screen.getByTestId('clone-git-repository-branch-select'));
    fireEvent.click(screen.getByText('develop'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(cloneGitRepository).toHaveBeenCalledWith(
      expect.objectContaining({ url: API_URL, branch: 'develop' })
    );
  });

  it('clones with the repository default when Clone is pressed before the new branch list loads', async () => {
    branchResponses[API_URL] = Promise.resolve({ branches: ['main', 'develop'], defaultBranch: 'main' });
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    renderFlow();

    typeUrl(API_URL);
    await advance(500);
    typeUrl(OTHER_URL);

    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(cloneGitRepository).toHaveBeenCalledWith(expect.objectContaining({ url: OTHER_URL, branch: '' }));
  });

  it('lists the collections found after clone', async () => {
    cloneGitRepository.mockImplementation(() => () => Promise.resolve());
    collectionSearchResult.collections = [
      { name: 'Orders API', path: '/home/user/collections/api/orders' },
      { name: 'Billing API', path: '/home/user/collections/api/billing' }
    ];
    renderFlow({ initialUrl: API_URL });

    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(COLLECTION_SEARCH_CHANNEL, {
      requestId: expect.any(String),
      paths: [path.join('/home/user/collections', 'api')],
      pruneByName: false
    });
    expect(screen.getByText('Orders API')).toBeInTheDocument();
    expect(screen.getByText('Billing API')).toBeInTheDocument();
    expect(screen.getByTestId('clone-git-inline-confirm')).toHaveTextContent('Open');
  });

  describe('collections list height', () => {
    const cloneAndScan = async (confirm) => {
      cloneGitRepository.mockImplementation(() => () => Promise.resolve());
      collectionSearchResult.collections = [{ name: 'Orders API', path: '/home/user/collections/api/orders' }];
      await act(async () => {
        fireEvent.click(confirm());
      });
      return getComputedStyle(await screen.findByTestId('selection-list'));
    };

    it('lets the inline variant fill the page height', async () => {
      renderFlow({ initialUrl: API_URL });

      const list = await cloneAndScan(() => screen.getByTestId('clone-git-inline-confirm'));

      expect(list.maxHeight).toBe('');
    });

    it('keeps the fixed list height in the modal variant', async () => {
      renderFlow({ variant: 'modal', initialUrl: API_URL });

      const list = await cloneAndScan(() => screen.getByRole('button', { name: 'Clone' }));

      expect(list.maxHeight).toBe('60px');
    });
  });

  describe('after the scan', () => {
    const ORDERS = { name: 'Orders API', path: '/home/user/collections/api/orders' };
    const BILLING = { name: 'Billing API', path: '/home/user/collections/api/billing' };
    const BROKEN_PATH = '/home/user/collections/api/broken';

    const cloneAndScan = async ({ collections = [ORDERS, BILLING], skippedPaths = [], confirm = 'clone-git-inline-confirm' } = {}) => {
      cloneGitRepository.mockImplementation(() => () => Promise.resolve());
      collectionSearchResult.collections = collections;
      collectionSearchResult.brokenCollectionPaths = skippedPaths;
      await act(async () => {
        fireEvent.click(typeof confirm === 'string' ? screen.getByTestId(confirm) : confirm());
      });
    };

    it('lists the skipped paths under View Details', async () => {
      renderFlow({ initialUrl: API_URL });
      await cloneAndScan({ collections: [ORDERS], skippedPaths: [BROKEN_PATH] });

      expect(screen.getByText('1 collections were skipped because their config could not be read.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

      expect(screen.getByText(BROKEN_PATH)).toBeInTheDocument();
      expect(screen.getByText('Orders API')).toBeInTheDocument();
    });

    it('shows only the skipped paths and the no-collections message when every collection was skipped', async () => {
      renderFlow({ initialUrl: API_URL });
      await cloneAndScan({ collections: [], skippedPaths: [BROKEN_PATH] });

      fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

      expect(screen.getByText(BROKEN_PATH)).toBeInTheDocument();
      expect(screen.getByText('No Bruno collections were found in this repository.')).toBeInTheDocument();
      expect(screen.queryByTestId('selection-list')).toBeNull();
    });

    it('offers only Close when the inline variant finds no collections', async () => {
      renderFlow({ initialUrl: API_URL });
      await cloneAndScan({ collections: [] });

      expect(screen.getByText('No Bruno collections were found in this repository.')).toBeInTheDocument();
      expect(screen.getByTestId('clone-git-inline-confirm')).toHaveTextContent('Close');
      expect(screen.queryByTestId('clone-git-inline-cancel')).toBeNull();
    });

    it('hands the selected collections to onOpenCollections and leaves closing to it', async () => {
      const onOpenCollections = jest.fn();
      const onClose = jest.fn();
      const onFinish = jest.fn();
      renderFlow({ initialUrl: API_URL, onOpenCollections, onClose, onFinish });
      await cloneAndScan();

      fireEvent.click(screen.getByText('Billing API'));
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));

      expect(onOpenCollections).toHaveBeenCalledTimes(1);
      expect(onOpenCollections).toHaveBeenCalledWith([BILLING.path]);
      expect(openMultipleCollections).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(onFinish).not.toHaveBeenCalled();
    });

    it('opens the selected collections itself and closes in the modal variant', async () => {
      openMultipleCollections.mockReturnValue({ type: 'test/openMultipleCollections' });
      const onClose = jest.fn();
      const onFinish = jest.fn();
      renderFlow({ variant: 'modal', initialUrl: API_URL, onClose, onFinish });
      await cloneAndScan({ confirm: () => screen.getByRole('button', { name: 'Clone' }) });

      fireEvent.click(screen.getByText('Orders API'));
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));

      expect(openMultipleCollections).toHaveBeenCalledWith([ORDERS.path]);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledTimes(1);
    });
  });

  describe('branch list placement', () => {
    const openBranchList = async () => {
      await advance(500);
      fireEvent.click(screen.getByTestId('clone-git-repository-branch-select'));
      await act(async () => {});
      return screen.getByRole('listbox');
    };

    beforeEach(() => {
      branchResponses[API_URL] = Promise.resolve({ branches: ['main', 'dev'], defaultBranch: 'main' });
    });

    it('attaches the branch list to the document body in the inline variant', async () => {
      const { container } = renderFlow({ initialUrl: API_URL });

      const listbox = await openBranchList();

      expect(listbox.closest('[data-tippy-root]').parentElement).toBe(document.body);
      expect(container).not.toContainElement(listbox);
    });

    it('keeps the branch list next to its trigger in the modal variant', async () => {
      renderFlow({ variant: 'modal', initialUrl: API_URL });

      const listbox = await openBranchList();

      expect(screen.getByTestId('clone-git-repository-branch-select').closest('.branch-select')).toContainElement(listbox);
    });
  });
});
