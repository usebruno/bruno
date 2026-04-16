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

const mockHandleCollectionItemDrop = jest.fn((payload) => ({
  type: 'collections/handleCollectionItemDrop',
  payload
}));

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, mockDragRef, jest.fn()],
  useDrop: (config) => {
    mockCapturedDropConfig = config;
    return [{ isOver: true, canDrop: true }, mockDropRef];
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
        { uid: 'req-a', pathname: '/tmp/collection/a.bru', filename: 'a.bru', type: 'http-request', sourceCollectionUid: 'col-1' },
        { getClientOffset: () => ({ x: 10, y: 130 }) }
      );
    });

    expect(row).toHaveClass('drop-target-below');

    await act(async () => {
      await mockCapturedDropConfig.drop(
        { uid: 'req-a', pathname: '/tmp/collection/a.bru', filename: 'a.bru', type: 'http-request', sourceCollectionUid: 'col-1' },
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
});
