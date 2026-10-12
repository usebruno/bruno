import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { buildMockResponseEditorItem, mockResponseFromEditorItem } from 'utils/mock-server/mock-responses/editor';
import MockResponseTab from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

const TAB = { uid: 'mock-response-1', responseName: 'Get users' };

describe('MockResponseTab', () => {
  let mockDispatch;

  const renderTab = ({ dirty }) => {
    const item = buildMockResponseEditorItem({ uid: TAB.uid, name: TAB.responseName });
    const saved = mockResponseFromEditorItem(item, TAB.uid);
    const editor = { item, savedMockResponse: dirty ? { ...saved, name: 'Old name' } : saved };
    useSelector.mockImplementation((selector) => selector({ collections: { mockResponseEditors: { [TAB.uid]: editor } } }));
    render(
      <ThemeProvider>
        <MockResponseTab tab={TAB} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByTestId('request-tab-close-icon'));
  };

  beforeEach(() => {
    mockDispatch = jest.fn();
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('closes a tab without unsaved changes immediately', () => {
    renderTab({ dirty: false });

    expect(screen.queryByTestId('confirm-mock-response-close-modal')).not.toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));
  });

  it('closes a tab with unsaved changes after confirming', () => {
    renderTab({ dirty: true });
    expect(screen.getByTestId('confirm-mock-response-close-modal')).toBeVisible();
    expect(mockDispatch).not.toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockDispatch).toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));
  });

  it('keeps a tab with unsaved changes open after cancelling', async () => {
    renderTab({ dirty: true });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-mock-response-close-modal')).not.toBeInTheDocument());
    expect(mockDispatch).not.toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));
  });
});
