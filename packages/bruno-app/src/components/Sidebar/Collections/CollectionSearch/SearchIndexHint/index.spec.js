import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ThemeProvider } from 'providers/Theme';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import SearchIndexHint from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: jest.fn((preferences) => ({ type: 'test/savePreferences', preferences }))
}));

const preferences = {
  cache: {
    file: { enabled: false },
    searchIndex: { enabled: false }
  }
};

const renderHint = ({ searchIndexEnabled = false } = {}) => {
  useSelector.mockImplementation((selector) => selector({
    app: {
      preferences: {
        ...preferences,
        cache: {
          ...preferences.cache,
          searchIndex: { enabled: searchIndexEnabled }
        }
      }
    }
  }));
  return render(
    <ThemeProvider>
      <SearchIndexHint />
    </ThemeProvider>
  );
};

describe('SearchIndexHint', () => {
  let mockDispatch;
  let savePreferencesOutcome;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    savePreferencesOutcome = () => Promise.resolve();
    mockDispatch = jest.fn((action) => {
      if (action.type === 'test/savePreferences') return savePreferencesOutcome();
    });
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('hides when the search index is already enabled', () => {
    renderHint({ searchIndexEnabled: true });

    expect(screen.queryByTestId('sidebar-search-index-hint')).not.toBeInTheDocument();
  });

  it('shows a one-line enable prompt when the search index is off', () => {
    renderHint();

    expect(screen.getByTestId('sidebar-search-index-hint')).toHaveTextContent('Enable Indexing?');
    expect(screen.getByTestId('sidebar-search-index-hint-enable')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-search-index-hint-info')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-search-index-hint-dismiss')).toBeInTheDocument();
  });

  it('hides after dismiss and stays hidden on remount', () => {
    const { unmount } = renderHint();

    fireEvent.click(screen.getByTestId('sidebar-search-index-hint-dismiss'));
    expect(screen.queryByTestId('sidebar-search-index-hint')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('bruno.searchIndexHint.dismissed')).toBe('true');

    unmount();
    renderHint();
    expect(screen.queryByTestId('sidebar-search-index-hint')).not.toBeInTheDocument();
  });

  it('enables the search index and toasts success', async () => {
    renderHint();

    fireEvent.click(screen.getByTestId('sidebar-search-index-hint-enable'));

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith({
        ...preferences,
        cache: {
          ...preferences.cache,
          searchIndex: { enabled: true }
        }
      });
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Search index enabled');
    });
  });

  it('toasts when enabling the search index fails', async () => {
    savePreferencesOutcome = () => Promise.reject(new Error('write failed'));
    renderHint();

    fireEvent.click(screen.getByTestId('sidebar-search-index-hint-enable'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to enable search index');
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
