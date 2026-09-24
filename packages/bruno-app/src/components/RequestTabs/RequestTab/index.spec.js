import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import RequestTab from './index';

const mockCloseTabs = jest.fn((payload) => ({ type: 'collections/closeTabs', payload }));
const mockSaveRequest = jest.fn(() => ({ type: 'collections/saveRequest' }));
const mockFindItemInCollection = jest.fn();
const mockFindItemInCollectionByPathname = jest.fn();
const mockHasRequestChanges = jest.fn();
const mockHasExampleChanges = jest.fn();

const mockTheme = {
  bg: '#ffffff',
  border: { radius: { base: '4px' } },
  request: {
    methods: {
      get: '#22c55e'
    }
  },
  requestTabs: {
    bg: '#f8fafc',
    icon: {
      color: '#64748b',
      hoverBg: '#e2e8f0',
      hoverColor: '#0f172a'
    },
    example: {
      iconColor: '#64748b'
    }
  }
};

jest.mock('hooks/useKeybinding', () => jest.fn());

jest.mock('providers/Theme', () => ({
  useTheme: () => ({ theme: mockTheme })
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  closeTabs: (payload) => mockCloseTabs(payload),
  saveRequest: (...args) => mockSaveRequest(...args),
  saveCollectionRoot: jest.fn(),
  saveFolderRoot: jest.fn(),
  saveEnvironment: jest.fn(),
  saveCollectionSettings: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/tabs', () => ({
  makeTabPermanent: (payload) => ({ type: 'tabs/makeTabPermanent', payload }),
  syncTabUid: (payload) => ({ type: 'tabs/syncTabUid', payload })
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  deleteRequestDraft: (payload) => ({ type: 'collections/deleteRequestDraft', payload }),
  deleteCollectionDraft: jest.fn(),
  deleteFolderDraft: jest.fn(),
  clearEnvironmentsDraft: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/global-environments', () => ({
  clearGlobalEnvironmentDraft: jest.fn(),
  saveGlobalEnvironment: jest.fn()
}));

jest.mock('utils/collections', () => ({
  findItemInCollection: (...args) => mockFindItemInCollection(...args),
  findItemInCollectionByPathname: (...args) => mockFindItemInCollectionByPathname(...args),
  hasRequestChanges: (...args) => mockHasRequestChanges(...args),
  hasExampleChanges: (...args) => mockHasExampleChanges(...args),
  areItemsLoading: jest.fn(() => false)
}));

jest.mock('utils/collections/index', () => ({
  findItemInCollection: (...args) => mockFindItemInCollection(...args),
  findItemInCollectionByPathname: (...args) => mockFindItemInCollectionByPathname(...args),
  hasRequestChanges: (...args) => mockHasRequestChanges(...args),
  hasExampleChanges: (...args) => mockHasExampleChanges(...args),
  areItemsLoading: jest.fn(() => false),
  flattenItems: jest.fn(() => [])
}));

jest.mock('utils/network/index', () => ({
  closeWsConnection: jest.fn()
}));

jest.mock('./GradientCloseButton', () => ({ onClick, hasChanges }) => (
  <button data-testid="request-tab-close-icon" data-has-changes={hasChanges} onClick={onClick} />
));

jest.mock('ui/MenuDropdown', () => {
  const React = require('react');
  return React.forwardRef(({ children }, ref) => {
    React.useImperativeHandle(ref, () => ({
      show: jest.fn(),
      hide: jest.fn(),
      state: { isShown: false }
    }));

    return <>{children}</>;
  });
});

const createStore = () => configureStore({
  reducer: {
    tabs: (state = { activeTabUid: 'request-1' }) => state,
    globalEnvironments: (state = { globalEnvironmentDraft: null }) => state
  }
});

const renderRequestTab = () => {
  const item = {
    uid: 'request-1',
    type: 'http-request',
    name: 'Users',
    request: {
      method: 'GET'
    }
  };
  const collection = {
    uid: 'collection-1',
    items: [item]
  };
  const tab = {
    uid: 'request-1',
    type: 'http-request',
    collectionUid: 'collection-1'
  };

  mockFindItemInCollection.mockReturnValue(item);
  mockFindItemInCollectionByPathname.mockReturnValue(null);
  mockHasRequestChanges.mockReturnValue(false);

  return render(
    <Provider store={createStore()}>
      <ThemeProvider theme={mockTheme}>
        <RequestTab
          tab={tab}
          collection={collection}
          tabIndex={0}
          collectionRequestTabs={[tab]}
        />
      </ThemeProvider>
    </Provider>
  );
};

const renderResponseExampleTab = () => {
  const example = {
    uid: 'example-1',
    name: 'Success'
  };
  const item = {
    uid: 'request-1',
    type: 'http-request',
    name: 'Users',
    request: {
      method: 'GET'
    },
    examples: [example]
  };
  const collection = {
    uid: 'collection-1',
    items: [item]
  };
  const tab = {
    uid: 'example-1',
    itemUid: 'request-1',
    type: 'response-example',
    collectionUid: 'collection-1'
  };

  mockFindItemInCollection.mockReturnValue(item);
  mockFindItemInCollectionByPathname.mockReturnValue(null);
  mockHasRequestChanges.mockReturnValue(false);
  mockHasExampleChanges.mockReturnValue(false);

  return render(
    <Provider store={createStore()}>
      <ThemeProvider theme={mockTheme}>
        <RequestTab
          tab={tab}
          collection={collection}
          tabIndex={0}
          collectionRequestTabs={[tab]}
        />
      </ThemeProvider>
    </Provider>
  );
};

describe('RequestTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes a request tab when middle-clicking anywhere on the tab container', () => {
    const { container } = renderRequestTab();
    const tabContainer = container.querySelector('.tab-container');

    fireEvent.mouseDown(tabContainer, { button: 1 });
    fireEvent.mouseUp(tabContainer, { button: 1 });

    expect(mockCloseTabs).toHaveBeenCalledWith({ tabUids: ['request-1'] });
  });

  it('closes a response example tab when middle-clicking anywhere on the tab container', () => {
    const { container } = renderResponseExampleTab();
    const tabContainer = container.querySelector('.tab-container');

    fireEvent.mouseDown(tabContainer, { button: 1 });
    fireEvent.mouseUp(tabContainer, { button: 1 });

    expect(mockCloseTabs).toHaveBeenCalledWith({ tabUids: ['example-1'] });
  });
});
