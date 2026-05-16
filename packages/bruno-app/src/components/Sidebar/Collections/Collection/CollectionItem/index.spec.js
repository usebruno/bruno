import '@testing-library/jest-dom';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import CollectionItem from './index';

jest.mock('components/Sidebar/NewRequest', () => () => null);
jest.mock('components/Sidebar/NewFolder', () => () => null);
jest.mock('./RenameCollectionItem', () => () => null);
jest.mock('./CloneCollectionItem', () => () => null);
jest.mock('./DeleteCollectionItem', () => () => null);
jest.mock('./RunCollectionItem', () => () => null);
jest.mock('./GenerateCodeItem', () => () => null);
jest.mock('components/ResponsePane/NetworkError/index', () => () => null);
jest.mock('./CollectionItemInfo/index', () => () => null);
jest.mock('./CollectionItemIcon', () => () => null);
jest.mock('./ExampleItem', () => () => null);
jest.mock('components/ResponseExample/CreateExampleModal', () => () => null);
jest.mock('ui/ActionIcon', () => ({ children }) => children || null);
jest.mock('ui/MenuDropdown', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});

const mockDragRef = jest.fn();
const mockDropRef = jest.fn();
let mockCapturedDropConfig;
let mockIsOver = true;
let mockDraggedItem = null;
let mockClientOffset = { x: 10, y: 130 };

const mockHandleCollectionItemDrop = jest.fn((payload) => ({
  type: 'collections/handleCollectionItemDrop',
  payload
}));

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, mockDragRef, jest.fn()],
  useDrop: (config) => {
    mockCapturedDropConfig = config;
    const monitor = {
      isOver: () => mockIsOver,
      canDrop: () => config.canDrop?.(mockDraggedItem, monitor) ?? false,
      getClientOffset: () => mockClientOffset
    };

    return [config.collect ? config.collect(monitor) : { isOver: mockIsOver, canDrop: monitor.canDrop() }, mockDropRef];
  }
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  handleCollectionItemDrop: (payload) => mockHandleCollectionItemDrop(payload),
  sendRequest: jest.fn(),
  showInFolder: jest.fn(),
  pasteItem: jest.fn(),
  saveRequest: jest.fn()
}));

jest.mock('hooks/useKeybinding', () => () => {});
jest.mock('components/Sidebar/SidebarAccordionContext', () => ({
  useSidebarAccordion: () => ({ dropdownContainerRef: { current: null } })
}));
jest.mock('src/selectors/tab', () => ({
  isTabForItemActive: () => () => false,
  isTabForItemPresent: () => () => false
}), { virtual: true });
jest.mock('utils/terminal', () => ({
  openDevtoolsAndSwitchToTerminal: jest.fn()
}));

const createStore = () =>
  configureStore({
    reducer: {
      app: (state = { isDragging: false, clipboard: { hasCopiedItems: false } }) => state,
      collections: (state = {
        collections: [{ uid: 'col-1', pathname: '/tmp/collection', items: [] }]
      }) => state,
      tabs: (state = { tabs: [], activeTabUid: null }) => state
    }
  });

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
});

beforeEach(() => {
  mockIsOver = true;
  mockDraggedItem = null;
  mockClientOffset = { x: 10, y: 130 };
  mockHandleCollectionItemDrop.mockClear();
});

describe('CollectionItem drag placement', () => {
  it('shows the bottom drop indicator and dispatches after placement for request targets', async () => {
    const store = createStore();
    const item = {
      uid: 'req-b',
      type: 'http-request',
      name: 'Request B',
      pathname: '/tmp/collection/b.bru',
      filename: 'b.bru',
      depth: 0,
      seq: 2
    };
    const draggedItem = {
      uid: 'req-a',
      pathname: '/tmp/collection/a.bru',
      filename: 'a.bru',
      type: 'http-request',
      sourceCollectionUid: 'col-1'
    };
    mockDraggedItem = draggedItem;

    render(
      <Provider store={store}>
        <ThemeProvider>
          <CollectionItem item={item} collectionUid="col-1" collectionPathname="/tmp/collection" searchText="" />
        </ThemeProvider>
      </Provider>
    );

    const row = screen.getByTestId('sidebar-collection-item-row');
    row.getBoundingClientRect = () => ({ top: 100, height: 40 });

    act(() => {
      mockCapturedDropConfig.hover(
        draggedItem,
        { getClientOffset: () => ({ x: 10, y: 130 }) }
      );
    });

    expect(row).toHaveClass('drop-target-below');

    await act(async () => {
      await mockCapturedDropConfig.drop(
        draggedItem,
        { getClientOffset: () => ({ x: 10, y: 130 }) }
      );
    });

    expect(mockHandleCollectionItemDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        targetItem: item,
        collectionUid: 'col-1',
        placement: 'after'
      })
    );
  });

  it('does not show droppable hover state for invalid descendant folder drops', () => {
    const store = createStore();
    const item = {
      uid: 'folder-child',
      type: 'folder',
      name: 'Child Folder',
      pathname: '/tmp/collection/folder-parent/folder-child',
      filename: 'folder-child',
      depth: 1,
      seq: 2,
      items: []
    };
    const draggedItem = {
      uid: 'folder-parent',
      type: 'folder',
      name: 'Parent Folder',
      pathname: '/tmp/collection/folder-parent',
      filename: 'folder-parent',
      sourceCollectionUid: 'col-1'
    };
    mockDraggedItem = draggedItem;
    const monitor = {
      getClientOffset: () => ({ x: 10, y: 130 })
    };

    const { rerender } = render(
      <Provider store={store}>
        <ThemeProvider>
          <CollectionItem item={item} collectionUid="col-1" collectionPathname="/tmp/collection" searchText="" />
        </ThemeProvider>
      </Provider>
    );

    const row = screen.getByTestId('sidebar-collection-item-row');
    row.getBoundingClientRect = () => ({ top: 100, height: 60 });

    act(() => {
      mockCapturedDropConfig.hover(draggedItem, monitor);
    });

    rerender(
      <Provider store={store}>
        <ThemeProvider>
          <CollectionItem item={item} collectionUid="col-1" collectionPathname="/tmp/collection" searchText="" />
        </ThemeProvider>
      </Provider>
    );

    const updatedRow = screen.getByTestId('sidebar-collection-item-row');
    expect(mockCapturedDropConfig.canDrop(draggedItem, monitor)).toBe(false);

    expect(updatedRow).not.toHaveClass('item-hovered');
    expect(updatedRow).not.toHaveClass('drop-target');
    expect(updatedRow).not.toHaveClass('drop-target-above');
    expect(updatedRow).not.toHaveClass('drop-target-below');
  });
});
