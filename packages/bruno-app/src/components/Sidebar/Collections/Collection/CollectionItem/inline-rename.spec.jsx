import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { SidebarAccordionProvider } from 'components/Sidebar/SidebarAccordionContext';
import toast from 'react-hot-toast';
import CollectionItem from './index';

const mockRenameItem = jest.fn(() => () => Promise.resolve());

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  renameItem: (...args) => mockRenameItem(...args),
  handleCollectionItemDrop: () => ({ type: 'test/handleCollectionItemDrop' }),
  sendRequest: () => () => Promise.resolve(),
  showInFolder: () => () => Promise.resolve(),
  pasteItem: () => () => Promise.resolve(),
  saveRequest: () => () => Promise.resolve()
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()]
}));
jest.mock('react-dnd-html5-backend', () => ({ getEmptyImage: () => ({}) }));

// Child components are irrelevant to the rename flow and pull in heavy editors
jest.mock('./RenameCollectionItem', () => () => null);
jest.mock('./CloneCollectionItem', () => () => null);
jest.mock('./DeleteCollectionItem', () => () => null);
jest.mock('./RunCollectionItem', () => () => null);
jest.mock('./GenerateCodeItem', () => () => null);
jest.mock('./CollectionItemInfo/index', () => () => null);
jest.mock('./CollectionItemIcon', () => () => null);
jest.mock('./ExampleItem', () => () => null);
jest.mock('components/Icons/ExampleIcon', () => () => null);
jest.mock('components/ResponsePane/NetworkError/index', () => () => null);
jest.mock('components/ResponseExample/CreateExampleModal', () => () => null);
jest.mock('components/Sidebar/NewRequest', () => () => null);
jest.mock('components/Sidebar/NewFolder', () => () => null);
jest.mock('components/Sidebar/NewApp', () => () => null);
// Pulls in xterm, which needs a real canvas
jest.mock('utils/terminal', () => ({ openDevtoolsAndSwitchToTerminal: jest.fn() }));
jest.mock('ui/MenuDropdown', () => {
  const { forwardRef } = require('react');
  return { __esModule: true, default: forwardRef(({ children }, _ref) => children) };
});

const COLLECTION_UID = 'collection-1';
const COLLECTION_PATHNAME = '/home/user/my-collection';
const FOLDER_NAME = 'My Folder';
const REQUEST_NAME = 'My Request';

const buildFolder = (overrides = {}) => ({
  uid: 'folder-1',
  name: FOLDER_NAME,
  type: 'folder',
  pathname: `${COLLECTION_PATHNAME}/my-folder`,
  depth: 1,
  collapsed: true,
  items: [],
  ...overrides
});

const buildRequest = (overrides = {}) => ({
  uid: 'request-1',
  name: REQUEST_NAME,
  type: 'http-request',
  request: { method: 'GET', url: '' },
  pathname: `${COLLECTION_PATHNAME}/my-request.bru`,
  depth: 1,
  seq: 1,
  ...overrides
});

const buildStore = (item) => {
  const state = {
    collections: {
      collections: [
        {
          uid: COLLECTION_UID,
          name: 'My Collection',
          pathname: COLLECTION_PATHNAME,
          mountStatus: 'mounted',
          items: [item]
        }
      ]
    },
    tabs: { tabs: [], activeTabUid: null },
    app: {
      isDragging: false,
      clipboard: { hasCopiedItems: false },
      preferences: { keybindingsEnabled: false }
    }
  };

  return configureStore({
    reducer: (currentState = state) => currentState,
    preloadedState: state
  });
};

const renderItem = (item = buildFolder()) => {
  const store = buildStore(item);

  render(
    <Provider store={store}>
      <ThemeProvider>
        <SidebarAccordionProvider>
          <CollectionItem item={item} collectionUid={COLLECTION_UID} collectionPathname={COLLECTION_PATHNAME} searchText="" />
        </SidebarAccordionProvider>
      </ThemeProvider>
    </Provider>
  );

  return { item, store };
};

const startRenaming = (name = FOLDER_NAME) => {
  fireEvent.doubleClick(screen.getByText(name));
  return screen.getByRole('textbox');
};

describe('Folder inline rename', () => {
  it('opens an editable input seeded with the folder name on double click', () => {
    renderItem();

    const input = startRenaming();

    expect(input).toHaveValue(FOLDER_NAME);
    expect(screen.queryByText(FOLDER_NAME)).not.toBeInTheDocument();
  });

  it('does not start inline renaming for requests', () => {
    renderItem(buildRequest());

    fireEvent.doubleClick(screen.getByText(REQUEST_NAME));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(REQUEST_NAME)).toBeInTheDocument();
  });

  it('renames the folder when Enter is pressed', async () => {
    renderItem();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'Renamed Folder' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(mockRenameItem).toHaveBeenCalledWith({
        itemUid: 'folder-1',
        collectionUid: COLLECTION_UID,
        newName: 'Renamed Folder'
      })
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('renames the folder when the input loses focus', async () => {
    renderItem();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: '  Renamed On Blur  ' } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(mockRenameItem).toHaveBeenCalledWith(expect.objectContaining({ newName: 'Renamed On Blur' }))
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('surfaces an error toast when renaming fails', async () => {
    mockRenameItem.mockReturnValueOnce(() => Promise.reject(new Error('folder already exists')));
    renderItem();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'Duplicate' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('folder already exists'));
  });

  it('cancels renaming on Escape without dispatching a rename', () => {
    renderItem();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(FOLDER_NAME)).toBeInTheDocument();
    expect(mockRenameItem).not.toHaveBeenCalled();
  });

  it('exits renaming without dispatching when the name is blank', () => {
    renderItem();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(FOLDER_NAME)).toBeInTheDocument();
    expect(mockRenameItem).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('exits renaming without dispatching when the name is unchanged', () => {
    renderItem();
    const input = startRenaming();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mockRenameItem).not.toHaveBeenCalled();
  });

  it('rejects names longer than 255 characters and stays in rename mode', () => {
    renderItem();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'a'.repeat(256) } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(toast.error).toHaveBeenCalledWith('Name must be 255 characters or less');
    expect(mockRenameItem).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
