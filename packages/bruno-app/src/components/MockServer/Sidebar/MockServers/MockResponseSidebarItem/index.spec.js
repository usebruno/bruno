import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import MockResponseSidebarItem from './index';
import { addTab } from 'providers/ReduxStore/slices/tabs';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn()
}));

jest.mock('ui/MenuDropdown', () => ({ children }) => <div>{children}</div>);

jest.mock('providers/ReduxStore/slices/tabs', () => ({
  addTab: jest.fn((payload) => ({ type: 'add-tab', payload })),
  closeTabs: jest.fn(),
  updateTabMeta: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/mock-server/index', () => ({
  deleteMockResponse: jest.fn(),
  saveMockResponse: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  removeMockResponseEditor: jest.fn(),
  syncMockResponseEditorSaved: jest.fn()
}));

const response = { uid: 'resp-1', name: 'List pets' };
const instance = { uid: 'ms-1', collectionUid: 'col-1' };

const stateWithScratch = (scratchCollectionUid) => ({
  tabs: { activeTabUid: null },
  mockServer: { mockResponses: {} },
  workspaces: {
    activeWorkspaceUid: 'ws-1',
    workspaces: [{ uid: 'ws-1', scratchCollectionUid }]
  }
});

describe('MockResponseSidebarItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDispatch.mockReturnValue(jest.fn());
  });

  const renderItem = (scratchCollectionUid) => {
    useSelector.mockImplementation((selector) => selector(stateWithScratch(scratchCollectionUid)));
    return render(
      <ThemeProvider theme={themes.light}>
        <MockResponseSidebarItem
          response={response}
          instance={instance}
          collectionUid="col-1"
          location={{ mockServerUid: 'ms-1' }}
        />
      </ThemeProvider>
    );
  };

  it('opens the response in the workspace scratch collection', () => {
    renderItem('scratch-1');

    fireEvent.click(screen.getByRole('button', { name: 'List pets' }));

    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'resp-1',
      type: 'mock-response',
      collectionUid: 'scratch-1',
      mockServerUid: 'ms-1'
    }));
  });

  it('does not open the response when the workspace has no scratch collection', () => {
    renderItem(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'List pets' }));

    expect(addTab).not.toHaveBeenCalled();
  });
});
