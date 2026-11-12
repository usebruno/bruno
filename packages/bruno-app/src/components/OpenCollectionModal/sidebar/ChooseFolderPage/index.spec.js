import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VirtuosoMockContext } from 'react-virtuoso';
import toast from 'react-hot-toast';
import { ThemeProvider } from 'providers/Theme';
import { callIpc } from 'utils/common/ipc';
import { browseDirectories, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import appReducer from 'providers/ReduxStore/slices/app';
import openCollectionModalReducer, { folderSearchStarted } from 'providers/ReduxStore/slices/open-collection-modal';
import ChooseFolderPage from './index';

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'mock-id' }));
jest.mock('react-hot-toast', () => {
  const mockToast = jest.fn();
  mockToast.success = jest.fn();
  mockToast.error = jest.fn();
  return { __esModule: true, default: mockToast };
});
jest.mock('utils/common/ipc', () => ({ callIpc: jest.fn() }));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectories: jest.fn(),
  mountCollection: jest.fn(),
  openMultipleCollections: jest.fn()
}));

const closedModal = openCollectionModalReducer(undefined, { type: 'init' });

const listResult = {
  id: 'search-1',
  type: 'list',
  collections: [{ path: '/work/api', name: 'API' }, { path: '/work/billing', name: 'Billing' }],
  folders: ['/work'],
  preselect: ['/work/api'],
  note: { tone: 'info', text: 'work isn’t a collection itself, but it has 2 collections inside. Pick the ones to open.' }
};

const renderPage = ({ preferences = {}, chooseFolder = {} } = {}) => {
  const store = configureStore({
    reducer: {
      openCollectionModal: openCollectionModalReducer,
      app: appReducer,
      collections: (state = { collections: [] }) => state,
      workspaces: (state = { workspaces: [{ uid: 'workspace-1', collections: [] }], activeWorkspaceUid: 'workspace-1' }) => state
    },
    preloadedState: {
      openCollectionModal: {
        ...closedModal,
        isOpen: true,
        page: 'choose-folder',
        chooseFolder: { ...closedModal.chooseFolder, ...chooseFolder }
      },
      app: { ...appReducer(undefined, { type: 'init' }), preferences }
    }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <VirtuosoMockContext.Provider value={{ viewportHeight: 1000, itemHeight: 49 }}>
          <ChooseFolderPage />
        </VirtuosoMockContext.Provider>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const autoOpenCheckbox = () => screen.getByTestId('choose-folder-auto-open-picker');

describe('ChooseFolderPage', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(undefined), send: jest.fn() };
    callIpc.mockResolvedValue(undefined);
    browseDirectories.mockReturnValue(() => Promise.resolve([]));
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('shows the drop zone with the folder picker setting on by default', () => {
    renderPage();

    expect(screen.getByTestId('choose-folder-drop-zone')).toHaveTextContent('Drop Bruno collection folders here');
    expect(autoOpenCheckbox()).toBeChecked();
  });

  it('shows the saved folder picker setting', () => {
    renderPage({ preferences: { openCollection: { autoOpenFolderPicker: false } } });

    expect(autoOpenCheckbox()).not.toBeChecked();
  });

  it('opens the folder picker from the choose folders link', async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-folder-choose-link'));
    });

    expect(browseDirectories).toHaveBeenCalledTimes(1);
  });

  it('saves only the setting and does not open the folder picker', async () => {
    renderPage({ preferences: { general: { defaultLocation: '/collections' } } });

    fireEvent.click(autoOpenCheckbox());

    await waitFor(() => expect(callIpc).toHaveBeenCalledWith('renderer:save-auto-open-folder-picker', false));
    expect(autoOpenCheckbox()).not.toBeChecked();
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:save-preferences', expect.anything());
    expect(browseDirectories).not.toHaveBeenCalled();
  });

  it('puts the setting back and says so when saving fails', async () => {
    callIpc.mockRejectedValue(new Error('disk full'));
    renderPage();

    fireEvent.click(autoOpenCheckbox());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save preferences'));
    expect(autoOpenCheckbox()).toBeChecked();
  });

  it('shows the collections found and leaves the note to the modal', () => {
    renderPage({ chooseFolder: { result: listResult } });

    expect(screen.queryByTestId('open-collection-note')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('choose-folder-row')).toHaveLength(2);
    expect(screen.getByTestId('choose-folder-open-selected')).toHaveTextContent('Open 1 collection');
    expect(screen.queryByTestId('choose-folder-drop-zone')).not.toBeInTheDocument();
  });

  it('keeps the drop zone when nothing can be listed', () => {
    renderPage({
      chooseFolder: { result: { id: 'search-2', type: 'message', note: { tone: 'info', text: 'notes isn’t a Bruno collection.' } } }
    });

    expect(screen.getByTestId('choose-folder-drop-zone')).toBeInTheDocument();
    expect(screen.queryByTestId('choose-folder-list')).not.toBeInTheDocument();
  });

  it('opens the folder picker again from Choose other folders', async () => {
    renderPage({ chooseFolder: { result: { ...listResult, preselect: [] } } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-folder-choose-other'));
    });

    expect(browseDirectories).toHaveBeenCalledTimes(1);
  });

  it('opens the selected collections', () => {
    openMultipleCollections.mockReturnValue(() => new Promise(() => {}));
    renderPage({ chooseFolder: { result: listResult } });

    fireEvent.click(screen.getByTestId('choose-folder-open-selected'));

    expect(openMultipleCollections).toHaveBeenCalledWith(['/work/api'], { silent: true, dontSendDisplayErrors: true });
  });

  it('puts focus on the choose folders link when nothing else has it', () => {
    renderPage();

    expect(screen.getByTestId('choose-folder-choose-link')).toHaveFocus();
  });

  it('shows the search in progress, keeps the page out of reach and cancels it', () => {
    const store = renderPage({ chooseFolder: { status: 'searching', searchId: 'search-3', searchLabel: 'work' } });

    expect(screen.getByTestId('open-collection-busy')).toHaveTextContent('Looking for collections in work…');
    expect(screen.getByTestId('choose-folder-drop-zone').closest('.choose-folder-content')).toHaveAttribute('inert');
    expect(screen.getByTestId('open-collection-busy-cancel')).toHaveFocus();
    fireEvent.click(screen.getByTestId('open-collection-busy-cancel'));

    expect(callIpc).toHaveBeenCalledWith('renderer:collection-search:cancel', { requestId: 'search-3' });
    expect(store.getState().openCollectionModal.chooseFolder.status).toBe('idle');
    expect(screen.queryByTestId('open-collection-busy')).not.toBeInTheDocument();
  });

  it('gives focus back to the choose folders link once the search is cancelled', async () => {
    const store = renderPage();
    const link = screen.getByTestId('choose-folder-choose-link');
    expect(link).toHaveFocus();

    act(() => {
      store.dispatch(folderSearchStarted({ searchId: 'search-4', searchLabel: 'work' }));
    });
    expect(screen.getByTestId('open-collection-busy-cancel')).toHaveFocus();
    fireEvent.click(screen.getByTestId('open-collection-busy-cancel'));

    await waitFor(() => expect(link).toHaveFocus());
  });
});
