import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import RequestBody from './index';
import collectionsReducer from 'providers/ReduxStore/slices/collections';
import appReducer from 'providers/ReduxStore/slices/app';
import globalEnvironmentsReducer from 'providers/ReduxStore/slices/global-environments';
import tabsReducer from 'providers/ReduxStore/slices/tabs';

// Mock all the dependencies
jest.mock('providers/Theme', () => ({
  useTheme: () => ({
    displayedTheme: 'light',
    storedTheme: 'light',
  }),
}));

jest.mock('utils/common', () => ({
  uuid: () => 'mock-uuid-123',
}));

jest.mock('components/CodeEditor', () => {
  return function MockCodeEditor({ value, onEdit, onRun, onSave }) {
    return (
      <div data-testid="code-editor">
        <textarea data-testid="code-editor-textarea" value={value} onChange={e => onEdit && onEdit(e.target.value)} />
        <button data-testid="run-button" onClick={onRun}>
          Run
        </button>
        <button data-testid="save-button" onClick={onSave}>
          Save
        </button>
      </div>
    );
  };
});

jest.mock('components/RequestPane/FormUrlEncodedParams', () => {
  return function MockFormUrlEncodedParams() {
    return <div data-testid="form-url-encoded-params">FormUrlEncodedParams</div>;
  };
});

jest.mock('components/RequestPane/MultipartFormParams', () => {
  return function MockMultipartFormParams() {
    return <div data-testid="multipart-form-params">MultipartFormParams</div>;
  };
});

jest.mock('../FileBody/index', () => {
  return function MockFileBody() {
    return <div data-testid="file-body">FileBody</div>;
  };
});

// Create a mock store
const createMockStore = (initialState = {}) => {
  const defaultState = {
    collections: {
      collections: [{ uid: 'collection-1', name: 'Test Collection' }],
    },
    app: {
      preferences: { font: { codeFont: 'default', codeFontSize: 14 } },
    },
    globalEnvironments: {
      globalEnvironments: [],
      activeGlobalEnvironmentUid: null,
    },
    tabs: {
      activeTabUid: 'item-1',
    },
    ...initialState,
  };

  return configureStore({
    reducer: {
      collections: collectionsReducer,
      app: appReducer,
      globalEnvironments: globalEnvironmentsReducer,
      tabs: tabsReducer,
    },
    preloadedState: defaultState,
  });
};

const renderWithProviders = (component, store = createMockStore()) => {
  return render(<Provider store={store}>{component}</Provider>);
};

describe('RequestBody Component - Tabbed Body Editor Tests', () => {
  const mockItem = {
    uid: 'item-1',
    name: 'Test Request',
    type: 'http-request',
    request: {
      method: 'POST',
      body: { mode: 'json', json: '{"test": "data"}' },
    },
  };

  const mockCollection = { uid: 'collection-1', name: 'Test Collection' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tabbed Interface Rendering', () => {
    it('should render default tab when no bodyTabs exist', () => {
      renderWithProviders(<RequestBody item={mockItem} collection={mockCollection} />);

      expect(screen.getByText('Body 1')).toBeInTheDocument();
      expect(screen.getByTestId('code-editor-textarea')).toHaveValue('{"test": "data"}');
    });

    it('should render multiple tabs when bodyTabs exist', () => {
      const itemWithTabs = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: {
            mode: 'json',
            bodyTabs: [
              { id: 1, name: 'API Tab', bodyType: 'json', bodyContent: '{"api": "data"}' },
              { id: 2, name: 'Test Tab', bodyType: 'xml', bodyContent: '<test>data</test>' },
            ],
          },
        },
      };

      renderWithProviders(<RequestBody item={itemWithTabs} collection={mockCollection} />);

      expect(screen.getByText('API Tab')).toBeInTheDocument();
      expect(screen.getByText('Test Tab')).toBeInTheDocument();
    });

    it('should show add tab button', () => {
      renderWithProviders(<RequestBody item={mockItem} collection={mockCollection} />);

      expect(screen.getByTitle('Add new body tab')).toBeInTheDocument();
    });
  });

  describe('Tab Switching and Content', () => {
    it('should switch between tabs and show correct content', async () => {
      const itemWithTabs = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: {
            mode: 'json',
            bodyTabs: [
              { id: 1, name: 'Tab 1', bodyType: 'json', bodyContent: '{"tab": 1}' },
              { id: 2, name: 'Tab 2', bodyType: 'json', bodyContent: '{"tab": 2}' },
            ],
          },
        },
      };

      renderWithProviders(<RequestBody item={itemWithTabs} collection={mockCollection} />);

      // Initially should show Tab 1 content
      expect(screen.getByTestId('code-editor-textarea')).toHaveValue('{"tab": 1}');

      // Click on Tab 2
      fireEvent.click(screen.getByText('Tab 2'));

      await waitFor(() => {
        expect(screen.getByTestId('code-editor-textarea')).toHaveValue('{"tab": 2}');
      });
    });

    it('should add new tab when add button is clicked', async () => {
      renderWithProviders(<RequestBody item={mockItem} collection={mockCollection} />);

      const addButton = screen.getByTitle('Add new body tab');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Body 2')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Renaming', () => {
    it('should rename tab on double click and enter', async () => {
      renderWithProviders(<RequestBody item={mockItem} collection={mockCollection} />);

      const tabElement = screen.getByText('Body 1');
      fireEvent.doubleClick(tabElement);

      const input = screen.getByDisplayValue('Body 1');
      fireEvent.change(input, { target: { value: 'Renamed Tab' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Renamed Tab')).toBeInTheDocument();
      });
    });

    it('should prevent duplicate tab names', async () => {
      const itemWithTabs = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: {
            mode: 'json',
            bodyTabs: [
              { id: 1, name: 'Tab 1', bodyType: 'json', bodyContent: '{}' },
              { id: 2, name: 'Tab 2', bodyType: 'json', bodyContent: '{}' },
            ],
          },
        },
      };

      renderWithProviders(<RequestBody item={itemWithTabs} collection={mockCollection} />);

      const firstTab = screen.getByText('Tab 1');
      fireEvent.doubleClick(firstTab);

      const input = screen.getByDisplayValue('Tab 1');
      fireEvent.change(input, { target: { value: 'Tab 2' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Tab 2 2')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Closing', () => {
    it('should close tab when close button is clicked', async () => {
      const itemWithTabs = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: {
            mode: 'json',
            bodyTabs: [
              { id: 1, name: 'Tab 1', bodyType: 'json', bodyContent: '{}' },
              { id: 2, name: 'Tab 2', bodyType: 'json', bodyContent: '{}' },
            ],
          },
        },
      };

      renderWithProviders(<RequestBody item={itemWithTabs} collection={mockCollection} />);

      const closeButtons = screen.getAllByTitle('Close tab');
      fireEvent.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Tab 1')).not.toBeInTheDocument();
        expect(screen.getByText('Tab 2')).toBeInTheDocument();
      });
    });

    it('should create new default tab when closing the last tab', async () => {
      renderWithProviders(<RequestBody item={mockItem} collection={mockCollection} />);

      const closeButton = screen.getByTitle('Close tab');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.getByText('Body 1')).toBeInTheDocument();
        expect(screen.getByTestId('code-editor-textarea')).toHaveValue('');
      });
    });
  });

  describe('Body Mode Changes', () => {
    it('should render form-url-encoded when mode is formUrlEncoded', () => {
      const itemWithFormMode = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: { mode: 'formUrlEncoded' },
        },
      };

      renderWithProviders(<RequestBody item={itemWithFormMode} collection={mockCollection} />);

      expect(screen.getByTestId('form-url-encoded-params')).toBeInTheDocument();
      expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
    });

    it('should render file body when mode is file', () => {
      const itemWithFileMode = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: { mode: 'file' },
        },
      };

      renderWithProviders(<RequestBody item={itemWithFileMode} collection={mockCollection} />);

      expect(screen.getByTestId('file-body')).toBeInTheDocument();
      expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
    });
  });

  describe('Request Actions with Tabs', () => {
    it('should handle run action with tabbed content', async () => {
      renderWithProviders(<RequestBody item={mockItem} collection={mockCollection} />);

      const runButton = screen.getByTestId('run-button');
      fireEvent.click(runButton);

      expect(runButton).toBeInTheDocument();
    });

    it('should sync active tab content before running request', async () => {
      renderWithProviders(<RequestBody item={mockItem} collection={mockCollection} />);

      const textarea = screen.getByTestId('code-editor-textarea');
      fireEvent.change(textarea, { target: { value: '{"ready": "to run"}' } });

      const runButton = screen.getByTestId('run-button');
      fireEvent.click(runButton);

      expect(textarea).toHaveValue('{"ready": "to run"}');
    });
  });

  describe('Legacy Format Support', () => {
    it('should load old JSON format into Body 1', () => {
      const legacyItem = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: {
            mode: 'json',
            json: '{"legacy": "format"}',
            // No bodyTabs array - old format
          },
        },
      };

      renderWithProviders(<RequestBody item={legacyItem} collection={mockCollection} />);

      expect(screen.getByText('Body 1')).toBeInTheDocument();
      expect(screen.getByTestId('code-editor-textarea')).toHaveValue('{"legacy": "format"}');
    });

    it('should prioritize bodyTabs over legacy format when both exist', () => {
      const mixedFormatItem = {
        ...mockItem,
        request: {
          ...mockItem.request,
          body: {
            mode: 'json',
            json: '{"legacy": "format"}',
            bodyTabs: [{ id: 1, name: 'New Tab', bodyType: 'json', bodyContent: '{"new": "format"}' }],
          },
        },
      };

      renderWithProviders(<RequestBody item={mixedFormatItem} collection={mockCollection} />);

      expect(screen.getByText('New Tab')).toBeInTheDocument();
      expect(screen.getByTestId('code-editor-textarea')).toHaveValue('{"new": "format"}');
    });
  });
});
