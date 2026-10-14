import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ThemeProvider } from 'providers/Theme';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { saveMockResponseEditor } from 'providers/ReduxStore/slices/mock-server/actions';
import { buildMockResponseEditorItem, mockResponseFromEditorItem } from 'utils/mock-server/mock-responses/editor';
import MockResponseTab from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/mock-server/actions', () => ({
  saveMockResponseEditor: jest.fn(() => () => Promise.resolve())
}));

const TAB = { uid: 'mock-response-1', responseName: 'Get users' };
const UNSAVED_CHANGES_TEXT = /You have unsaved changes in mock response/;

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
  };

  const clickClose = () => fireEvent.click(screen.getByTestId('request-tab-close-icon'));

  beforeEach(() => {
    mockDispatch = jest.fn((action) => (typeof action === 'function' ? action() : action));
    useDispatch.mockReturnValue(mockDispatch);
    saveMockResponseEditor.mockImplementation(() => () => Promise.resolve());
  });

  it('closes a tab without unsaved changes immediately', () => {
    renderTab({ dirty: false });
    clickClose();

    expect(screen.queryByText(UNSAVED_CHANGES_TEXT)).not.toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));
  });

  it('shows the unsaved changes indicator when the mock response has unsaved changes', () => {
    renderTab({ dirty: true });

    expect(document.querySelector('.close-gradient')).toHaveClass('has-changes');
  });

  it('hides the unsaved changes indicator when the mock response matches what is saved', () => {
    renderTab({ dirty: false });

    expect(document.querySelector('.close-gradient')).not.toHaveClass('has-changes');
  });

  it('closes a tab with unsaved changes after choosing not to save', () => {
    renderTab({ dirty: true });
    clickClose();
    expect(screen.getByText(UNSAVED_CHANGES_TEXT)).toBeVisible();
    expect(mockDispatch).not.toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));

    fireEvent.click(screen.getByRole('button', { name: 'Don\'t Save' }));

    expect(saveMockResponseEditor).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));
  });

  it('saves the mock response and closes the tab after choosing to save', async () => {
    renderTab({ dirty: true });
    clickClose();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] })));
    expect(saveMockResponseEditor).toHaveBeenCalledWith(TAB.uid);
  });

  it('keeps the tab open and reports the error when saving fails', async () => {
    saveMockResponseEditor.mockImplementation(() => () => Promise.reject(new Error('Name is required')));
    renderTab({ dirty: true });
    clickClose();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Name is required'));
    expect(mockDispatch).not.toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));
  });

  it('keeps a tab with unsaved changes open after cancelling', async () => {
    renderTab({ dirty: true });
    clickClose();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText(UNSAVED_CHANGES_TEXT)).not.toBeInTheDocument());
    expect(mockDispatch).not.toHaveBeenCalledWith(closeTabs({ tabUids: [TAB.uid] }));
  });
});
