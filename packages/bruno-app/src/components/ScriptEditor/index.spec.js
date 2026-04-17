import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

jest.mock('components/CodeEditor', () => {
  return function MockCodeEditor(props) {
    return <div data-testid="codemirror-editor" />;
  };
});

jest.mock('components/MonacoEditor', () => {
  return function MockMonacoEditor(props) {
    return <div data-testid="monaco-editor" />;
  };
});

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

  it('renders MonacoEditor when Monaco beta feature is enabled', () => {
    const store = createMockStore(true);
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={MOCK_THEME}>
          <ScriptEditor />
        </ThemeProvider>
      </Provider>
    );

    expect(getByTestId('monaco-editor')).toBeTruthy();
    expect(queryByTestId('codemirror-editor')).toBeNull();
  });

  it('passes props through to the selected editor', () => {
    const store = createMockStore(false);
    const mockOnEdit = jest.fn();

    jest.isolateModules(() => {
      jest.doMock('components/CodeEditor', () => {
        return function MockCodeEditor(props) {
          return <div data-testid="codemirror-editor" data-mode={props.mode} />;
        };
      });
    });

    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={MOCK_THEME}>
          <ScriptEditor mode="javascript" onEdit={mockOnEdit} />
        </ThemeProvider>
      </Provider>
    );

    expect(getByTestId('codemirror-editor')).toBeTruthy();
  });
});
