import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

const mockCodeEditor = jest.fn((props) => {
  return <div data-testid="codemirror-editor" />;
});

jest.mock('components/CodeEditor', () => mockCodeEditor);

jest.mock('components/MonacoEditor', () => ({
  __esModule: true,
  default: function MockMonacoEditor(props) {
    return <div data-testid="monaco-editor" />;
  }
}));

const MOCK_THEME = {
  codemirror: {
    bg: '#1e1e1e',
    border: '#333'
  }
};

const createMockStore = (monacoEnabled = false) => {
  return configureStore({
    reducer: {
      app: (state = {
        preferences: {
          beta: {
            'monaco-editor': monacoEnabled
          }
        }
      }) => state
    }
  });
};

const ScriptEditor = require('./index').default;

describe('ScriptEditor', () => {
  it('renders CodeEditor when Monaco beta feature is disabled', () => {
    const store = createMockStore(false);
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={MOCK_THEME}>
          <ScriptEditor />
        </ThemeProvider>
      </Provider>
    );

    expect(getByTestId('codemirror-editor')).toBeTruthy();
    expect(queryByTestId('monaco-editor')).toBeNull();
  });

  it('renders MonacoEditor when Monaco beta feature is enabled', async () => {
    const store = createMockStore(true);
    const { findByTestId, queryByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={MOCK_THEME}>
          <ScriptEditor />
        </ThemeProvider>
      </Provider>
    );

    expect(await findByTestId('monaco-editor')).toBeTruthy();
    expect(queryByTestId('codemirror-editor')).toBeNull();
  });

  it('passes props through to the selected editor', () => {
    const store = createMockStore(false);
    const mockOnEdit = jest.fn();
    mockCodeEditor.mockClear();

    render(
      <Provider store={store}>
        <ThemeProvider theme={MOCK_THEME}>
          <ScriptEditor mode="javascript" onEdit={mockOnEdit} />
        </ThemeProvider>
      </Provider>
    );

    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'javascript', onEdit: mockOnEdit }),
      undefined
    );
  });
});
