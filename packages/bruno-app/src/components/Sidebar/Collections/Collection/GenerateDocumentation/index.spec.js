import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import * as FileSaver from 'file-saver';
import { generateApiDocsHtml } from '@usebruno/common';
import GenerateDocumentation from './index';

let mockGitRemote = { gitCollectionUrl: null, isResolved: true };

jest.mock('hooks/useCollectionGitRemoteUrl', () => ({
  __esModule: true,
  default: () => mockGitRemote
}));

jest.mock('providers/App', () => ({
  useApp: () => ({ version: '1.2.3' })
}));

jest.mock('components/Portal', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));

jest.mock('components/Modal', () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="mock-modal">
      <div data-testid="modal-title">{props.title}</div>
      {props.children}
      <button data-testid="generate-btn" disabled={props.confirmDisabled} onClick={props.handleConfirm}>
        {props.confirmText}
      </button>
      <button data-testid="cancel-btn" onClick={props.handleCancel}>
        {props.cancelText}
      </button>
    </div>
  )
}));

jest.mock('file-saver', () => ({ saveAs: jest.fn() }));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('utils/collections/index', () => ({
  ...jest.requireActual('utils/collections/index'),
  transformCollectionToSaveToExportAsFile: (collection) => collection
}));

jest.mock('@usebruno/common', () => ({
  ...jest.requireActual('@usebruno/common'),
  generateApiDocsHtml: jest.fn(() => '<html>docs</html>')
}));

const buildCollection = (overrides = {}) => ({
  uid: 'col-1',
  name: 'My Collection',
  pathname: '/tmp/my-collection',
  brunoConfig: { opencollection: '1.0.0', name: 'My Collection', version: '2.0' },
  root: {},
  items: [],
  environments: [],
  ...overrides
});

const buildTaggedCollection = () => buildCollection({
  items: [
    {
      uid: 'folder-users',
      name: 'Users',
      type: 'folder',
      items: [
        { uid: 'req-list-users', name: 'List users', type: 'http-request', tags: ['smoke'], request: {} },
        { uid: 'req-delete-user', name: 'Delete user', type: 'http-request', tags: ['wip'], request: {} }
      ]
    },
    {
      uid: 'folder-admin',
      name: 'Admin',
      type: 'folder',
      items: [{ uid: 'req-audit-log', name: 'Audit log', type: 'http-request', tags: ['wip'], request: {} }]
    },
    { uid: 'req-health', name: 'Health', type: 'http-request', tags: ['smoke'], request: {} },
    { uid: 'req-ping', name: 'Ping', type: 'http-request', tags: [], request: {} }
  ]
});

const switchToTagFilter = () => {
  fireEvent.click(screen.getByTestId('docs-advanced-toggle'));
  fireEvent.click(screen.getByTestId('docs-requests-filter'));
};

const addTag = (listLabel, tag) => {
  const input = screen.getByLabelText(listLabel);
  fireEvent.change(input, { target: { value: tag } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const expectSummary = (folders, requests) => {
  const summary = within(screen.getByTestId('version-summary'));
  expect(summary.getByText(folders)).toBeInTheDocument();
  expect(summary.getByText(requests)).toBeInTheDocument();
};

const renderModal = (collection, onClose = jest.fn()) => {
  const collections = collection ? [collection] : [];
  const slice = createSlice({ name: 'collections', initialState: { collections }, reducers: {} });
  const store = configureStore({ reducer: { collections: slice.reducer } });
  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <GenerateDocumentation collectionUid="col-1" onClose={onClose} />
      </ThemeProvider>
    </Provider>
  );
  return { ...utils, onClose };
};

beforeEach(() => {
  mockGitRemote = { gitCollectionUrl: null, isResolved: true };
  generateApiDocsHtml.mockClear();
  FileSaver.saveAs.mockClear();
});

describe('GenerateDocumentation', () => {
  it('shows a "Collection not found" message when the collection is missing', () => {
    renderModal(null);
    expect(screen.getByText(/Collection not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('docs-advanced-toggle')).not.toBeInTheDocument();
  });

  it('keeps Generate disabled until the git remote url has resolved', () => {
    mockGitRemote = { gitCollectionUrl: null, isResolved: false };
    renderModal(buildCollection());
    expect(screen.getByTestId('generate-btn')).toBeDisabled();
  });

  it('enables Generate once the git remote url has resolved', () => {
    mockGitRemote = { gitCollectionUrl: 'https://github.com/org/repo.git', isResolved: true };
    renderModal(buildCollection());
    expect(screen.getByTestId('generate-btn')).toBeEnabled();
  });

  it('generates docs with the resolved git url, the shared filename, and the format-aware version', () => {
    mockGitRemote = { gitCollectionUrl: 'https://github.com/org/repo.git', isResolved: true };
    const { onClose } = renderModal(buildCollection({ name: 'My Collection' }));

    fireEvent.click(screen.getByTestId('generate-btn'));

    expect(generateApiDocsHtml).toHaveBeenCalledTimes(1);
    const [, options] = generateApiDocsHtml.mock.calls[0];
    expect(options.gitCollectionUrl).toBe('https://github.com/org/repo.git');
    expect(options.collectionVersion).toBe('2.0');
    expect(options.tags).toEqual({ include: [], exclude: [] });
    expect(FileSaver.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'My Collection-documentation.html');
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the git url when the include-git-link toggle is turned off', () => {
    mockGitRemote = { gitCollectionUrl: 'https://github.com/org/repo.git', isResolved: true };
    renderModal(buildCollection());

    fireEvent.click(screen.getByTestId('docs-advanced-toggle'));
    fireEvent.click(screen.getByTestId('docs-git-link-toggle').querySelector('input[type="checkbox"]'));

    fireEvent.click(screen.getByTestId('generate-btn'));

    const [, options] = generateApiDocsHtml.mock.calls[0];
    expect(options.gitCollectionUrl).toBeUndefined();
  });

  it('hides the git repo URL toggle when the collection has no git url', () => {
    mockGitRemote = { gitCollectionUrl: null, isResolved: true };
    renderModal(buildCollection());

    fireEvent.click(screen.getByTestId('docs-advanced-toggle'));

    expect(screen.queryByTestId('docs-git-link')).not.toBeInTheDocument();
  });

  it('shows the git repo URL toggle switched on by default when a git url is present', () => {
    mockGitRemote = { gitCollectionUrl: 'https://github.com/org/repo.git', isResolved: true };
    renderModal(buildCollection());

    fireEvent.click(screen.getByTestId('docs-advanced-toggle'));

    expect(screen.getByTestId('docs-git-link')).toBeInTheDocument();
    expect(screen.getByTestId('docs-git-link-toggle').querySelector('input[type="checkbox"]')).toBeChecked();
  });

  describe('folder and request counts', () => {
    it('shows every folder and request when no tag filter is applied', () => {
      renderModal(buildTaggedCollection());
      expectSummary('2 Folders', '5 requests');
    });

    it('counts only the requests that carry an included tag, and only the folders that still hold one', () => {
      renderModal(buildTaggedCollection());
      switchToTagFilter();
      addTag('Include tags', 'smoke');
      expectSummary('1 Folder', '2 requests');
    });

    it('leaves out the requests that carry an excluded tag and any folder that ends up empty', () => {
      renderModal(buildTaggedCollection());
      switchToTagFilter();
      addTag('Exclude tags', 'wip');
      expectSummary('1 Folder', '3 requests');
    });

    it('goes back to the full counts when the user switches to All requests', () => {
      renderModal(buildTaggedCollection());
      switchToTagFilter();
      addTag('Include tags', 'smoke');
      expectSummary('1 Folder', '2 requests');

      fireEvent.click(screen.getByTestId('docs-requests-all'));
      expectSummary('2 Folders', '5 requests');
    });

    it('generates the docs with the same tags the counts were based on', () => {
      renderModal(buildTaggedCollection());
      switchToTagFilter();
      addTag('Include tags', 'smoke');
      addTag('Exclude tags', 'wip');
      expectSummary('1 Folder', '2 requests');

      fireEvent.click(screen.getByTestId('generate-btn'));

      const [, options] = generateApiDocsHtml.mock.calls[0];
      expect(options.tags).toEqual({ include: ['smoke'], exclude: ['wip'] });
    });
  });
});
