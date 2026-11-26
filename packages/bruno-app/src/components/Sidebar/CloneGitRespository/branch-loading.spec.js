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
import { browseDirectory, cloneGitRepository, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
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

const typeUrl = (url) => fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: url } });

const renderFlow = ({ url, ...props } = {}, store = createStore()) => {
  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <CloneGitRepository onClose={jest.fn()} onFinish={jest.fn()} variant="inline" {...props} />
      </ThemeProvider>
    </Provider>
  );
  if (url) {
    typeUrl(url);
  }
  return view;
};

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

  it('still lists branches for a locked repository URL that carries credentials', async () => {
    const LOCKED_URL = 'https://ghp_token@github.com/acme/api.git';
    branchResponses[LOCKED_URL] = Promise.resolve({ branches: ['main', 'develop'], defaultBranch: 'develop' });
    renderFlow({ collectionRepositoryUrl: LOCKED_URL });

    await advance(0);

    expect(branchListCalls()).toEqual([['renderer:list-remote-branches-for-url', { url: LOCKED_URL }]]);
    expect(screen.getByTestId('clone-git-repository-branch-select')).toHaveTextContent('develop');
  });

  it('keeps a typed URL when the default location changes after mount', async () => {
    const store = createStore();
    renderFlow({}, store);
    typeUrl(API_URL);

    act(() => {
      store.dispatch({ type: SET_DEFAULT_LOCATION, payload: '/home/user/elsewhere' });
    });
    await advance(500);

    expect(screen.getByLabelText('Repository URL')).toHaveValue(API_URL);
    expect(screen.getByLabelText('Clone to location')).toHaveValue('/home/user/elsewhere');
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

  it('lists branches for a URL with only a username, like the ones Bitbucket and Azure DevOps give', async () => {
    const USERNAME_URL = 'https://jdoe@bitbucket.org/ws/repo.git';
    branchResponses[USERNAME_URL] = Promise.resolve({ branches: ['main'], defaultBranch: 'main' });
    renderFlow({ url: USERNAME_URL });

    await advance(500);

    expect(branchListCalls()).toEqual([['renderer:list-remote-branches-for-url', { url: USERNAME_URL }]]);
    expect(screen.getByTestId('clone-git-repository-branch-select')).toHaveTextContent('main');
  });

  describe('a URL with spaces around it', () => {
    const PADDED_URL = `  ${API_URL}  `;

    it('lists the branches of the trimmed URL', async () => {
      renderFlow({ url: PADDED_URL });

      await advance(500);

      expect(branchListCalls()).toEqual([['renderer:list-remote-branches-for-url', { url: API_URL }]]);
    });

    it('clones the trimmed URL', async () => {
      cloneGitRepository.mockImplementation(() => () => Promise.resolve());
      renderFlow({ url: PADDED_URL });

      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
      });

      expect(cloneGitRepository).toHaveBeenCalledWith(expect.objectContaining({ url: API_URL, path: '/home/user/collections/api' }));
    });

    it('says a URL of only spaces is required', async () => {
      renderFlow({ url: '   ' });

      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
      });

      expect(screen.getByTestId('clone-git-repository-url-error')).toHaveTextContent('Repository URL is required');
      expect(cloneGitRepository).not.toHaveBeenCalled();
    });
  });

  describe('a paste into the host of the URL', () => {
    const pasteUrl = (input, pastedText, selectionStart) => {
      input.setSelectionRange(selectionStart, selectionStart);
      fireEvent.paste(input, { clipboardData: { getData: () => pastedText } });
      fireEvent.change(input, { target: { value: `${input.value.slice(0, selectionStart)}${pastedText}${input.value.slice(selectionStart)}` } });
    };

    it('does not list branches when a token is pasted before the host and the @ is not typed yet', async () => {
      renderFlow({ url: API_URL });
      await advance(500);
      const input = screen.getByLabelText('Repository URL');

      pasteUrl(input, 'ghp_abcdefghijklmnop1234', 'https://'.length);
      await advance(1000);

      expect(input).toHaveValue('https://ghp_abcdefghijklmnop1234github.com/acme/api.git');
      expect(branchListCalls()).toEqual([['renderer:list-remote-branches-for-url', { url: API_URL }]]);
    });

    it('does not list branches once the @ is typed after the pasted token', async () => {
      renderFlow({ url: API_URL });
      await advance(500);
      const input = screen.getByLabelText('Repository URL');

      pasteUrl(input, 'ghp_abcdefghijklmnop1234', 'https://'.length);
      typeUrl('https://ghp_abcdefghijklmnop1234@github.com/acme/api.git');
      await advance(1000);

      expect(branchListCalls()).toHaveLength(1);
    });

    it('lists branches for a whole URL pasted into the field', async () => {
      renderFlow();
      const input = screen.getByLabelText('Repository URL');

      pasteUrl(input, OTHER_URL, 0);
      await advance(500);

      expect(branchListCalls()).toEqual([['renderer:list-remote-branches-for-url', { url: OTHER_URL }]]);
    });

    it('lists branches again after the next edit', async () => {
      renderFlow({ url: API_URL });
      await advance(500);
      const input = screen.getByLabelText('Repository URL');

      pasteUrl(input, 'git.', 'https://'.length);
      await advance(1000);
      expect(branchListCalls()).toHaveLength(1);

      typeUrl('https://git.github.com/acme/api');
      await advance(500);

      expect(branchListCalls()).toHaveLength(2);
    });
  });

  it('clears the URL error as soon as a valid URL is pasted after a failed Clone press', async () => {
    renderFlow();
    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });
    typeUrl('not a url');
    await act(async () => {});
    expect(screen.getByTestId('clone-git-repository-url-error')).toHaveTextContent('Please enter a valid git repository URL');

    typeUrl(API_URL);
    await act(async () => {});

    expect(screen.queryByTestId('clone-git-repository-url-error')).toBeNull();
  });

  describe('Enter in the inline form', () => {
    it('clones from the URL field', async () => {
      cloneGitRepository.mockImplementation(() => () => Promise.resolve());
      renderFlow({ url: API_URL });

      await act(async () => {
        fireEvent.keyDown(screen.getByLabelText('Repository URL'), { key: 'Enter' });
      });

      expect(cloneGitRepository).toHaveBeenCalledTimes(1);
      expect(cloneGitRepository).toHaveBeenCalledWith(expect.objectContaining({ url: API_URL }));
    });

    it('does not clone with a modifier key held', async () => {
      renderFlow({ url: API_URL });

      await act(async () => {
        fireEvent.keyDown(screen.getByLabelText('Repository URL'), { key: 'Enter', shiftKey: true });
      });

      expect(cloneGitRepository).not.toHaveBeenCalled();
    });

    it('picks a branch instead of cloning while the branch list is open', async () => {
      branchResponses[API_URL] = Promise.resolve({ branches: ['main', 'dev'], defaultBranch: 'main' });
      renderFlow({ url: API_URL });
      await advance(500);
      fireEvent.click(screen.getByTestId('clone-git-repository-branch-select'));
      await act(async () => {});
      const search = screen.getByRole('listbox').closest('.branch-select').querySelector('input');

      await act(async () => {
        fireEvent.keyDown(search, { key: 'ArrowDown' });
        fireEvent.keyDown(search, { key: 'Enter' });
      });

      expect(cloneGitRepository).not.toHaveBeenCalled();
    });

    it('shows the URL error for an invalid URL', async () => {
      renderFlow({ url: 'not a url' });

      await act(async () => {
        fireEvent.keyDown(screen.getByLabelText('Repository URL'), { key: 'Enter' });
      });

      expect(screen.getByTestId('clone-git-repository-url-error')).toHaveTextContent('Please enter a valid git repository URL');
      expect(cloneGitRepository).not.toHaveBeenCalled();
    });
  });

  describe('clone location', () => {
    it('keeps a folder picked with Browse when the default location changes', async () => {
      browseDirectory.mockImplementation(() => () => Promise.resolve('/home/user/picked'));
      const store = createStore();
      renderFlow({}, store);

      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-repository-browse'));
      });
      act(() => {
        store.dispatch({ type: SET_DEFAULT_LOCATION, payload: '/home/user/elsewhere' });
      });

      expect(screen.getByLabelText('Clone to location')).toHaveValue('/home/user/picked');
    });

    it('clones into a folder picked with Browse', async () => {
      browseDirectory.mockImplementation(() => () => Promise.resolve('/home/user/picked'));
      cloneGitRepository.mockImplementation(() => () => Promise.resolve());
      renderFlow({ url: API_URL });

      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-repository-browse'));
      });
      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
      });

      expect(cloneGitRepository).toHaveBeenCalledWith(expect.objectContaining({ path: '/home/user/picked/api' }));
    });

    it('says the location is required when Browse fails and clears it', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      browseDirectory.mockImplementation(() => () => Promise.reject(new Error('cancelled')));
      renderFlow({ url: API_URL });

      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-repository-browse'));
      });
      await act(async () => {
        fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
      });

      expect(screen.getByLabelText('Clone to location')).toHaveValue('');
      expect(screen.getByText('Location is required')).toBeInTheDocument();
      expect(cloneGitRepository).not.toHaveBeenCalled();
    });
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
    renderFlow({ url: API_URL });

    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(COLLECTION_SEARCH_CHANNEL, {
      requestId: expect.any(String),
      paths: [path.join('/home/user/collections', 'api')],
      wholeRepository: true
    });
    expect(screen.getByText('Orders API')).toBeInTheDocument();
    expect(screen.getByText('Billing API')).toBeInTheDocument();
    expect(screen.getByTestId('clone-git-inline-confirm')).toHaveTextContent('Open');
  });

  it('hides the inline footer while the clone runs and shows it again after the scan', async () => {
    const clone = deferred();
    cloneGitRepository.mockImplementation(() => () => clone.promise);
    collectionSearchResult.collections = [{ name: 'Orders API', path: '/home/user/collections/api/orders' }];
    renderFlow({ url: API_URL });

    await act(async () => {
      fireEvent.click(screen.getByTestId('clone-git-inline-confirm'));
    });
    expect(screen.getByText('Cloning repository')).toBeInTheDocument();
    expect(screen.queryByTestId('clone-git-inline-footer')).toBeNull();

    await act(async () => {
      clone.resolve();
    });
    expect(screen.getByTestId('clone-git-inline-footer')).toBeInTheDocument();
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
      renderFlow({ url: API_URL });

      const list = await cloneAndScan(() => screen.getByTestId('clone-git-inline-confirm'));

      expect(list.maxHeight).toBe('');
    });

    it('keeps the fixed list height in the modal variant', async () => {
      renderFlow({ variant: 'modal', url: API_URL });

      const list = await cloneAndScan(() => screen.getByRole('button', { name: 'Clone' }));

      expect(list.maxHeight).toBe('60px');
    });

    it('lets the inline content and the scan result fill the page height', async () => {
      renderFlow({ url: API_URL });

      await cloneAndScan(() => screen.getByTestId('clone-git-inline-confirm'));

      expect(screen.getByTestId('clone-git-repository-content')).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
      expect(screen.getByTestId('clone-git-scan-result')).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
    });

    it('does not stretch the content or the scan result in the modal variant', async () => {
      renderFlow({ variant: 'modal', url: API_URL });

      await cloneAndScan(() => screen.getByRole('button', { name: 'Clone' }));

      expect(screen.getByTestId('clone-git-repository-content')).not.toHaveClass('flex-1');
      expect(screen.getByTestId('clone-git-scan-result')).not.toHaveClass('flex-1');
      expect(screen.getByTestId('clone-git-scan-result')).not.toHaveClass('min-h-0');
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
      renderFlow({ url: API_URL });
      await cloneAndScan({ collections: [ORDERS], skippedPaths: [BROKEN_PATH] });

      expect(screen.getByText('1 collections were skipped because their config could not be read.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

      expect(screen.getByText(BROKEN_PATH)).toBeInTheDocument();
      expect(screen.getByText('Orders API')).toBeInTheDocument();
    });

    it('shows the skipped paths warning below the collection list', async () => {
      renderFlow({ url: API_URL });
      await cloneAndScan({ collections: [ORDERS], skippedPaths: [BROKEN_PATH] });

      const list = screen.getByTestId('selection-list');
      const warning = screen.getByText('1 collections were skipped because their config could not be read.');

      expect(list.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('shows only the skipped paths and the no-collections message when every collection was skipped', async () => {
      renderFlow({ url: API_URL });
      await cloneAndScan({ collections: [], skippedPaths: [BROKEN_PATH] });

      fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

      expect(screen.getByText(BROKEN_PATH)).toBeInTheDocument();
      expect(screen.getByText('No Bruno collections were found in this repository.')).toBeInTheDocument();
      expect(screen.queryByTestId('selection-list')).toBeNull();
    });

    it('shows how many collections are selected in the inline footer', async () => {
      renderFlow({ url: API_URL });
      await cloneAndScan();

      const footer = screen.getByTestId('clone-git-inline-footer');
      expect(footer).toContainElement(screen.getByTestId('clone-git-selected-count'));
      expect(screen.getByTestId('clone-git-selected-count')).toHaveTextContent('0 of 2 selected');

      fireEvent.click(screen.getByText('Billing API'));

      expect(screen.getByTestId('clone-git-selected-count')).toHaveTextContent('1 of 2 selected');
    });

    it('offers only Close when the inline variant finds no collections', async () => {
      renderFlow({ url: API_URL });
      await cloneAndScan({ collections: [] });

      expect(screen.getByText('No Bruno collections were found in this repository.')).toBeInTheDocument();
      expect(screen.getByTestId('clone-git-inline-confirm')).toHaveTextContent('Close');
      expect(screen.queryByTestId('clone-git-inline-cancel')).toBeNull();
    });

    it('hands the selected collections to onOpenCollections and leaves closing to it', async () => {
      const onOpenCollections = jest.fn();
      const onClose = jest.fn();
      const onFinish = jest.fn();
      renderFlow({ url: API_URL, onOpenCollections, onClose, onFinish });
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
      renderFlow({ variant: 'modal', url: API_URL, onClose, onFinish });
      await cloneAndScan({ confirm: () => screen.getByRole('button', { name: 'Clone' }) });

      fireEvent.click(screen.getByText('Orders API'));
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));

      expect(openMultipleCollections).toHaveBeenCalledWith([ORDERS.path]);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledTimes(1);
    });
  });

  describe('branch list placement', () => {
    const DEFAULT_BRANCH_LIST_MAX_HEIGHT = 250;

    const openBranchList = async () => {
      await advance(500);
      fireEvent.click(screen.getByTestId('clone-git-repository-branch-select'));
      await act(async () => {});
      return screen.getByRole('listbox');
    };

    beforeEach(() => {
      branchResponses[API_URL] = Promise.resolve({ branches: ['main', 'dev'], defaultBranch: 'main' });
    });

    it('keeps the branch list next to its trigger in the inline variant, so it stays inside the dialog', async () => {
      const { container } = renderFlow({ url: API_URL });

      const listbox = await openBranchList();

      expect(container).toContainElement(listbox);
      expect(screen.getByTestId('clone-git-repository-branch-select').closest('.branch-select')).toContainElement(listbox);
    });

    it('keeps the branch list next to its trigger in the modal variant', async () => {
      renderFlow({ variant: 'modal', url: API_URL });

      const listbox = await openBranchList();

      expect(screen.getByTestId('clone-git-repository-branch-select').closest('.branch-select')).toContainElement(listbox);
    });

    it('caps the branch list to the window space below its trigger in the inline variant', async () => {
      renderFlow({ url: API_URL });

      const listbox = await openBranchList();

      expect(listbox.style.maxHeight).not.toBe(`${DEFAULT_BRANCH_LIST_MAX_HEIGHT}px`);
      expect(listbox.style.maxHeight).toMatch(/^\d+px$/);
    });

    it('keeps the default branch list height in the modal variant', async () => {
      renderFlow({ variant: 'modal', url: API_URL });

      const listbox = await openBranchList();

      expect(listbox.style.maxHeight).toBe(`${DEFAULT_BRANCH_LIST_MAX_HEIGHT}px`);
    });
  });
});
