import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import SidebarPosition from './index';

const mockSavePreferences = jest.fn((payload) => ({
  type: 'app/savePreferences',
  payload
}));

jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: (payload) => mockSavePreferences(payload)
}));

const createTestStore = (preferences) => {
  const appSlice = createSlice({
    name: 'app',
    initialState: { preferences },
    reducers: {
      savePreferences: (state, action) => {
        state.preferences = action.payload;
      }
    }
  });

  return configureStore({
    reducer: { app: appSlice.reducer }
  });
};

const renderWithProviders = (preferences = {}) => {
  const store = createTestStore(preferences);

  return render(
    <Provider store={store}>
      <SidebarPosition />
    </Provider>
  );
};

describe('SidebarPosition', () => {
  beforeEach(() => {
    mockSavePreferences.mockClear();
  });

  it('defaults to the left sidebar position', () => {
    renderWithProviders({
      layout: {
        responsePaneOrientation: 'horizontal'
      }
    });

    expect(screen.getByLabelText('Left')).toBeChecked();
  });

  it('saves the right sidebar position', () => {
    renderWithProviders({
      layout: {
        responsePaneOrientation: 'horizontal',
        sidebarPosition: 'left'
      }
    });

    fireEvent.click(screen.getByLabelText('Right'));

    expect(mockSavePreferences).toHaveBeenCalledWith({
      layout: {
        responsePaneOrientation: 'horizontal',
        sidebarPosition: 'right'
      }
    });
  });
});
