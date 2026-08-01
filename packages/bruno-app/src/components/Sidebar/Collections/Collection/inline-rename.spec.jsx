import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { SidebarAccordionProvider } from 'components/Sidebar/SidebarAccordionContext';
import toast from 'react-hot-toast';
import Collection from './index';

const mockRenameCollection = jest.fn(() => () => Promise.resolve());
const mockMountCollection = jest.fn(() => ({ type: 'test/mountCollection' }));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  renameCollection: (...args) => mockRenameCollection(...args),
  mountCollection: (...args) => mockMountCollection(...args),
  moveCollectionAndPersist: () => ({ type: 'test/moveCollectionAndPersist' }),
  handleCollectionItemDrop: () => ({ type: 'test/handleCollectionItemDrop' }),
  pasteItem: () => () => Promise.resolve(),
  showInFolder: () => () => Promise.resolve(),
  saveCollectionSecurityConfig: () => ({ type: 'test/saveCollectionSecurityConfig' })
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
jest.mock('./CollectionItem', () => () => null);
jest.mock('./CollectionItem/CollectionItemDragPreview/index', () => ({
  CollectionItemDragPreview: () => null
}));
jest.mock('./RenameCollection', () => () => null);
jest.mock('./RemoveCollection', () => () => null);
jest.mock('./MoveToWorkspace', () => () => null);
jest.mock('./CloneCollection', () => () => null);
jest.mock('./GenerateDocumentation', () => () => null);
jest.mock('components/Sidebar/NewRequest', () => () => null);
jest.mock('components/Sidebar/NewFolder', () => () => null);
jest.mock('components/Sidebar/NewApp', () => () => null);
jest.mock('components/ShareCollection/index', () => () => null);
// Pulls in xterm, which needs a real canvas
jest.mock('utils/terminal', () => ({ openDevtoolsAndSwitchToTerminal: jest.fn() }));
jest.mock('ui/MenuDropdown', () => {
  const { forwardRef } = require('react');
  return { __esModule: true, default: forwardRef(({ children }, _ref) => children) };
});

const COLLECTION_NAME = 'My Collection';

const buildCollection = (overrides = {}) => ({
  uid: 'collection-1',
  name: COLLECTION_NAME,
  pathname: '/home/user/my-collection',
  mountStatus: 'mounted',
  collapsed: true,
  items: [],
  brunoConfig: {},
  securityConfig: { jsSandboxMode: 'safe' },
  ...overrides
});

const buildStore = (collection) => {
  const state = {
    collections: { collections: [collection] },
    tabs: { tabs: [], activeTabUid: null },
    app: {
      clipboard: { hasCopiedItems: false },
      preferences: { keybindingsEnabled: false }
    },
    workspaces: { workspaces: [], activeWorkspaceUid: null }
  };

  return configureStore({
    reducer: (currentState = state) => currentState,
    preloadedState: state
  });
};

const renderCollection = (collection = buildCollection()) => {
  const store = buildStore(collection);
  const dispatchSpy = jest.spyOn(store, 'dispatch');

  render(
    <Provider store={store}>
      <ThemeProvider>
        <SidebarAccordionProvider>
          <Collection collection={collection} searchText="" />
        </SidebarAccordionProvider>
      </ThemeProvider>
    </Provider>
  );

  return { collection, dispatchSpy };
};

const startRenaming = (name = COLLECTION_NAME) => {
  fireEvent.doubleClick(screen.getByText(name));
  return screen.getByRole('textbox');
};

describe('Collection inline rename', () => {
  it('opens an editable input seeded with the collection name on double click', () => {
    renderCollection();

    const input = startRenaming();

    expect(input).toHaveValue(COLLECTION_NAME);
    expect(screen.queryByText(COLLECTION_NAME)).not.toBeInTheDocument();
  });

  it('renames the collection when Enter is pressed', async () => {
    renderCollection();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'Renamed Collection' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mockRenameCollection).toHaveBeenCalledWith('Renamed Collection', 'collection-1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Collection renamed!'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renames the collection when the input loses focus', async () => {
    renderCollection();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: '  Renamed On Blur  ' } });
    fireEvent.blur(input);

    await waitFor(() => expect(mockRenameCollection).toHaveBeenCalledWith('Renamed On Blur', 'collection-1'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('surfaces an error toast when renaming fails', async () => {
    mockRenameCollection.mockReturnValueOnce(() => Promise.reject(new Error('collection already exists')));
    renderCollection();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'Duplicate' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('collection already exists'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('cancels renaming on Escape without dispatching a rename', async () => {
    renderCollection();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(COLLECTION_NAME)).toBeInTheDocument();
    expect(mockRenameCollection).not.toHaveBeenCalled();
  });

  it('exits renaming without dispatching when the name is blank', () => {
    renderCollection();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(COLLECTION_NAME)).toBeInTheDocument();
    expect(mockRenameCollection).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('exits renaming without dispatching when the name is unchanged', () => {
    renderCollection();
    const input = startRenaming();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mockRenameCollection).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('rejects names longer than 255 characters and stays in rename mode', () => {
    renderCollection();
    const input = startRenaming();

    fireEvent.change(input, { target: { value: 'a'.repeat(256) } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(toast.error).toHaveBeenCalledWith('Name must be 255 characters or less');
    expect(mockRenameCollection).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('mounts an unmounted collection before renaming it', () => {
    renderCollection(buildCollection({ mountStatus: 'unmounted' }));

    startRenaming();

    expect(mockMountCollection).toHaveBeenCalledWith(
      expect.objectContaining({ collectionUid: 'collection-1' })
    );
  });
});
