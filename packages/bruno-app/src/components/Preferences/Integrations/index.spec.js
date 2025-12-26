import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';

jest.mock('integrations/registry', () => {
  const mockRegistry = {
    getRegisteredMetadata: jest.fn()
  };
  return {
    __esModule: true,
    default: mockRegistry
  };
});

const mockRegistry = require('integrations/registry').default;

const mockSavePreferences = jest.fn((payload) => ({ type: 'app/savePreferences', payload }));

jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: (payload) => mockSavePreferences(payload)
}));

const Integrations = require('./index').default;

beforeAll(() => {
  // matchMedia is used by styled-components / theme logic in tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  });
});

beforeEach(() => {
  mockRegistry.getRegisteredMetadata.mockReset();
  mockSavePreferences.mockClear();
});

const createTestStore = (preferences) => {
  const appSlice = createSlice({
    name: 'app',
    initialState: {
      preferences
    },
    reducers: {
      savePreferences: (state, action) => {
        state.preferences = action.payload;
      }
    }
  });

  return configureStore({
    reducer: {
      app: appSlice.reducer
    }
  });
};

const renderWithProviders = (preferences) => {
  const store = createTestStore(preferences);
  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <Integrations />
        </ThemeProvider>
      </Provider>
    )
  };
};

describe('Preferences Integrations', () => {
  it('shows empty state when no integrations are registered', () => {
    mockRegistry.getRegisteredMetadata.mockReturnValue([]);

    renderWithProviders({ integrations: {} });

    expect(screen.getByText('No integrations are registered yet.')).toBeInTheDocument();
  });

  it('renders registered integrations and saves on toggle', () => {
    mockRegistry.getRegisteredMetadata.mockReturnValue([
      { id: 'alpha', label: 'Alpha Integration', description: 'A test integration' }
    ]);

    renderWithProviders({ integrations: { alpha: { enabled: false } } });

    const toggle = screen.getByLabelText('Alpha Integration toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(mockSavePreferences).toHaveBeenCalledTimes(1);
    const savedPrefs = mockSavePreferences.mock.calls[0][0];
    expect(savedPrefs.integrations.alpha.enabled).toBe(true);
  });
});
