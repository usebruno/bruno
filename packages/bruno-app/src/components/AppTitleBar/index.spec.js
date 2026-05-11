import '@testing-library/jest-dom';
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('ui/MenuDropdown', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/ActionIcon', () => ({ children, onClick, label }) => (
  <button onClick={onClick} aria-label={label}>{children}</button>
));
jest.mock('components/ResponsePane/ResponseLayoutToggle', () => () => null);

import AppTitleBar from './index';

const theme = {
  text: '#333',
  sidebar: {
    bg: '#fff',
    color: '#333',
    muted: '#888',
    collection: { item: { hoverBg: '#eee' } }
  },
  dropdown: { color: '#333', mutedText: '#888', hoverBg: '#eee' }
};

const mockStore = configureStore({
  reducer: {
    workspaces: (state = { workspaces: [], activeWorkspaceUid: null }) => state,
    app: (state = { preferences: {}, sidebarCollapsed: false }) => state,
    logs: (state = { isConsoleOpen: false }) => state
  }
});

const renderWithProviders = () => render(
  <Provider store={mockStore}>
    <ThemeProvider theme={theme}>
      <AppTitleBar />
    </ThemeProvider>
  </Provider>
);

const getTitleBar = (container) => container.querySelector('.app-titlebar');

describe('AppTitleBar — fullscreen state sync', () => {
  let ipcListeners;

  beforeEach(() => {
    ipcListeners = {};
    window.ipcRenderer = {
      invoke: jest.fn().mockResolvedValue(false),
      send: jest.fn(),
      on: jest.fn((channel, cb) => {
        ipcListeners[channel] = cb;
        return jest.fn();
      })
    };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  describe('initial state on mount', () => {
    it('should query the main process for current fullscreen state', async () => {
      renderWithProviders();
      await waitFor(() => {
        expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:window-is-fullscreen');
      });
    });

    it('should apply fullscreen class when window is already fullscreen at mount', async () => {
      window.ipcRenderer.invoke = jest.fn().mockResolvedValue(true);

      const { container } = renderWithProviders();

      await waitFor(() => {
        expect(getTitleBar(container)).toHaveClass('fullscreen');
      });
    });

    it('should not apply fullscreen class when window is windowed at mount', async () => {
      const { container } = renderWithProviders();

      await waitFor(() => {
        expect(window.ipcRenderer.invoke).toHaveBeenCalled();
      });
      expect(getTitleBar(container)).not.toHaveClass('fullscreen');
    });
  });

  describe('fullscreen transitions after mount', () => {
    it('should add fullscreen class on main:enter-full-screen event', async () => {
      const { container } = renderWithProviders();

      await waitFor(() => {
        expect(window.ipcRenderer.invoke).toHaveBeenCalled();
      });

      act(() => {
        ipcListeners['main:enter-full-screen']();
      });

      expect(getTitleBar(container)).toHaveClass('fullscreen');
    });

    it('should remove fullscreen class on main:leave-full-screen event', async () => {
      window.ipcRenderer.invoke = jest.fn().mockResolvedValue(true);

      const { container } = renderWithProviders();

      await waitFor(() => {
        expect(getTitleBar(container)).toHaveClass('fullscreen');
      });

      act(() => {
        ipcListeners['main:leave-full-screen']();
      });

      expect(getTitleBar(container)).not.toHaveClass('fullscreen');
    });
  });
});
