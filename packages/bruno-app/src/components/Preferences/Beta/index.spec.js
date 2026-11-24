import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ThemeProvider } from 'providers/Theme';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { closeDisabledMockServerTabs, saveMockResponseEditor } from 'providers/ReduxStore/slices/mock-server/actions';
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

jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: jest.fn((preferences) => ({ type: 'test/savePreferences', preferences })),
  updateActivePreferencesTab: jest.fn((payload) => ({ type: 'test/updateActivePreferencesTab', payload }))
}));

jest.mock('providers/ReduxStore/slices/mock-server/actions', () => ({
  closeDisabledMockServerTabs: jest.fn(() => ({ type: 'test/closeDisabledMockServerTabs' })),
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
const savedMockServerFlags = () => savePreferences.mock.calls.map(([preferences]) => preferences.beta['mock-server']);

describe('Beta preferences: Mock Server toggle', () => {
  let mockDispatch;
  let saveResult;
  let savePreferencesOutcome;

  beforeEach(() => {
    jest.clearAllMocks();
    saveResult = Promise.resolve();
    savePreferencesOutcome = () => Promise.resolve();
    mockDispatch = jest.fn((action) => {
      if (action.type === 'test/saveMockResponseEditor') return saveResult;
      if (action.type === 'test/savePreferences') return savePreferencesOutcome();
    });
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('closes the mock server tabs once turning Mock Server off is saved', async () => {
    renderBeta({ mockServerEnabled: true });

    fireEvent.click(mockServerToggle());

    expect(screen.queryByText(UNSAVED_PROMPT)).not.toBeInTheDocument();
    await waitFor(() => expect(mockServerToggle()).not.toBeChecked());
    expect(closeDisabledMockServerTabs).not.toHaveBeenCalled();
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(closeDisabledMockServerTabs()));
    expect(savedMockServerFlags()).toEqual([false]);
  });

  it('keeps the mock server tabs open when saving the preference fails', async () => {
    savePreferencesOutcome = () => Promise.reject(new Error('Failed to save preferences'));
    renderBeta({ mockServerEnabled: true });

    fireEvent.click(mockServerToggle());

    await waitFor(() => expect(savedMockServerFlags()).toEqual([false]));
    await act(() => Promise.resolve());
    expect(closeDisabledMockServerTabs).not.toHaveBeenCalled();
  });

  it('leaves tabs alone when Mock Server is turned on', async () => {
    renderBeta({ mockServerEnabled: false });

    fireEvent.click(mockServerToggle());

    await waitFor(() => expect(savedMockServerFlags()).toEqual([true]));
    await act(() => Promise.resolve());
    expect(closeDisabledMockServerTabs).not.toHaveBeenCalled();
  });

  it('asks before turning Mock Server off when mock responses have unsaved changes', () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());

    expect(screen.getByText(UNSAVED_PROMPT)).toBeVisible();
    expect(screen.getByText('Get user (saved)')).toBeVisible();
    expect(screen.queryByText('List users')).not.toBeInTheDocument();
    expect(closeDisabledMockServerTabs).not.toHaveBeenCalled();
  });

  it('keeps Mock Server on when the prompt is cancelled', async () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText(UNSAVED_PROMPT)).not.toBeInTheDocument());
    expect(closeDisabledMockServerTabs).not.toHaveBeenCalled();
    expect(saveMockResponseEditor).not.toHaveBeenCalled();
    expect(mockServerToggle()).toBeChecked();
  });

  it('turns Mock Server off without saving when Don\'t Save is chosen', async () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Don\'t Save' }));

    expect(saveMockResponseEditor).not.toHaveBeenCalled();
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(closeDisabledMockServerTabs()));
    expect(savedMockServerFlags()).toEqual([false]);
  });

  it('saves the unsaved mock responses before turning Mock Server off', async () => {
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(closeDisabledMockServerTabs()));
    expect(saveMockResponseEditor).toHaveBeenCalledTimes(1);
    expect(saveMockResponseEditor).toHaveBeenCalledWith('response-1');
    expect(savedMockServerFlags()).toEqual([false]);
  });

  it('keeps Mock Server on when the prompt is cancelled while the mock responses are saving', async () => {
    let finishSaving;
    saveResult = new Promise((resolve) => {
      finishSaving = resolve;
    });
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await act(async () => {
      finishSaving();
      await saveResult;
    });

    expect(saveMockResponseEditor).toHaveBeenCalledWith('response-1');
    expect(screen.queryByText(UNSAVED_PROMPT)).not.toBeInTheDocument();
    expect(mockServerToggle()).toBeChecked();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(savePreferences).not.toHaveBeenCalled();
    expect(closeDisabledMockServerTabs).not.toHaveBeenCalled();
  });

  it('keeps Mock Server on and reports the error when saving fails', async () => {
    saveResult = Promise.reject(new Error('Name is required'));
    renderBeta({ mockServerEnabled: true, editors: UNSAVED_EDITORS });

    fireEvent.click(mockServerToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Name is required'));
    expect(closeDisabledMockServerTabs).not.toHaveBeenCalled();
    expect(savePreferences).not.toHaveBeenCalled();
    expect(mockServerToggle()).toBeChecked();
  });
});
