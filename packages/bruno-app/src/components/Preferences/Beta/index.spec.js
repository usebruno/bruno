import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ThemeProvider } from 'providers/Theme';
import { closeMockServerTabs, saveMockResponseEditor } from 'providers/ReduxStore/slices/mock-server/actions';
import { buildMockResponseEditorItem, mockResponseFromEditorItem } from 'utils/mock-server/mock-responses/editor';
import Beta from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/mock-server/actions', () => ({
  closeMockServerTabs: jest.fn(() => ({ type: 'test/closeMockServerTabs' })),
  saveMockResponseEditor: jest.fn((responseUid) => ({ type: 'test/saveMockResponseEditor', responseUid }))
}));

const buildEditor = ({ uid, name, dirty }) => {
  const item = buildMockResponseEditorItem({ uid, name });
  const saved = mockResponseFromEditorItem(item, uid);
  return { item, savedMockResponse: dirty ? { ...saved, name: `${name} (saved)` } : saved };
};

const UNSAVED_EDITORS = {
  'response-1': buildEditor({ uid: 'response-1', name: 'Get user', dirty: true }),
  'response-2': buildEditor({ uid: 'response-2', name: 'List users', dirty: false })
};

const renderBeta = ({ mockServerEnabled, editors = {} }) => {
  useSelector.mockImplementation((selector) => selector({
    app: { preferences: { beta: { 'mock-server': mockServerEnabled } } },
    collections: { mockResponseEditors: editors }
  }));
  render(
    <ThemeProvider>
      <Beta />
    </ThemeProvider>
  );
};

const mockServerToggle = () => screen.getByTestId('mock-server-beta-toggle').querySelector('input[type="checkbox"]');
const UNSAVED_PROMPT = /You have unsaved changes in mock response/;

describe('Beta preferences: Mock Server toggle', () => {
  let mockDispatch;
  let saveResult;

  beforeEach(() => {
    jest.clearAllMocks();
    saveResult = Promise.resolve();
    mockDispatch = jest.fn((action) => (action.type === 'test/saveMockResponseEditor' ? saveResult : undefined));
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('closes the mock server tabs when Mock Server is turned off with nothing unsaved', async () => {
    renderBeta({ mockServerEnabled: true });

    fireEvent.click(mockServerToggle());

    expect(screen.queryByText(UNSAVED_PROMPT)).not.toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(closeMockServerTabs());
    await waitFor(() => expect(mockServerToggle()).not.toBeChecked());
  });

  it('leaves tabs alone when Mock Server is turned on', async () => {
    renderBeta({ mockServerEnabled: false });

    fireEvent.click(mockServerToggle());

    await waitFor(() => expect(mockServerToggle()).toBeChecked());
    expect(closeMockServerTabs).not.toHaveBeenCalled();
  });

  it('asks before turning Mock Server off when mock responses have unsaved changes', () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());

    expect(screen.getByText(UNSAVED_PROMPT)).toBeVisible();
    expect(screen.getByText('Get user (saved)')).toBeVisible();
    expect(screen.queryByText('List users')).not.toBeInTheDocument();
    expect(closeMockServerTabs).not.toHaveBeenCalled();
  });

  it('keeps Mock Server on when the prompt is cancelled', async () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText(UNSAVED_PROMPT)).not.toBeInTheDocument());
    expect(closeMockServerTabs).not.toHaveBeenCalled();
    expect(saveMockResponseEditor).not.toHaveBeenCalled();
    expect(mockServerToggle()).toBeChecked();
  });

  it('turns Mock Server off without saving when Don\'t Save is chosen', async () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Don\'t Save' }));

    expect(saveMockResponseEditor).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(closeMockServerTabs());
    await waitFor(() => expect(mockServerToggle()).not.toBeChecked());
  });

  it('saves the unsaved mock responses before turning Mock Server off', async () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(closeMockServerTabs()));
    expect(saveMockResponseEditor).toHaveBeenCalledTimes(1);
    expect(saveMockResponseEditor).toHaveBeenCalledWith('response-1');
    await waitFor(() => expect(mockServerToggle()).not.toBeChecked());
  });

  it('keeps Mock Server on and reports the error when saving fails', async () => {
    saveResult = Promise.reject(new Error('Name is required'));
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Name is required'));
    expect(closeMockServerTabs).not.toHaveBeenCalled();
    expect(mockServerToggle()).toBeChecked();
  });
});
