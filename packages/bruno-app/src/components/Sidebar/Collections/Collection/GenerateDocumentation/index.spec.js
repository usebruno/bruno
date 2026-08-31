import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByTestId('generate-btn'));

    const [, options] = generateApiDocsHtml.mock.calls[0];
    expect(options.gitCollectionUrl).toBeUndefined();
  });
});
