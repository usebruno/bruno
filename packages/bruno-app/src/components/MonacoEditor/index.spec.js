import React from 'react';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

const mockDispose = jest.fn();
const mockGetValue = jest.fn(() => '');
const mockSetValue = jest.fn();
const mockGetPosition = jest.fn(() => ({ lineNumber: 1, column: 1 }));
const mockSetPosition = jest.fn();
const mockSetScrollTop = jest.fn();
const mockGetScrollTop = jest.fn(() => 0);
const mockUpdateOptions = jest.fn();
const mockAddCommand = jest.fn();
const mockOnDidChangeModelContent = jest.fn(() => ({ dispose: jest.fn() }));
const mockGetDomNode = jest.fn(() => ({
  querySelector: jest.fn(() => ({
    classList: { add: jest.fn() }
  }))
}));
const mockGetModel = jest.fn(() => ({
  getValue: jest.fn(() => ''),
  getPositionAt: jest.fn(() => ({ lineNumber: 1, column: 1 }))
}));
const mockDeltaDecorations = jest.fn(() => []);

const mockEditor = {
  dispose: mockDispose,
  getValue: mockGetValue,
  setValue: mockSetValue,
  getPosition: mockGetPosition,
  setPosition: mockSetPosition,
  setScrollTop: mockSetScrollTop,
  getScrollTop: mockGetScrollTop,
  updateOptions: mockUpdateOptions,
  addCommand: mockAddCommand,
  onDidChangeModelContent: mockOnDidChangeModelContent,
  getDomNode: mockGetDomNode,
  getModel: mockGetModel,
  deltaDecorations: mockDeltaDecorations
};

jest.mock('utils/monaco/workers', () => {});

jest.mock('monaco-editor', () => ({
  editor: {
    create: jest.fn(() => mockEditor),
    setTheme: jest.fn(),
    setModelLanguage: jest.fn(),
    defineTheme: jest.fn()
  },
  languages: {
    typescript: {
      javascriptDefaults: {
        addExtraLib: jest.fn(),
        setDiagnosticsOptions: jest.fn(),
        setCompilerOptions: jest.fn()
      },
      ScriptTarget: { ES2020: 7 }
    },
    registerHoverProvider: jest.fn(() => ({ dispose: jest.fn() }))
  },
  KeyMod: { CtrlCmd: 2048 },
  KeyCode: { Enter: 3, KeyS: 49 },
  Range: jest.fn()
}));

jest.mock('utils/monaco/brunoTheme', () => ({
  registerBrunoTheme: jest.fn(() => 'bruno-light-123')
}));

jest.mock('utils/monaco/brunoApiTypes', () => ({
  registerBrunoApiTypes: jest.fn()
}));

jest.mock('utils/monaco/variableHighlighting', () => ({
  setupVariableHighlighting: jest.fn(() => jest.fn()),
  registerVariableHoverProvider: jest.fn(() => ({ dispose: jest.fn() }))
}));

const MOCK_THEME = {
  codemirror: {
    bg: '#1e1e1e',
    border: '#333',
    variable: {
      valid: '#247c2f',
      invalid: '#b82e28',
      prompt: '#0078d4'
    },
    tokens: {
      definition: '#0078d4',
      property: '#0078d4',
      string: '#6f402f',
      number: '#d63384',
      atom: '#a6142a',
      variable: '#d63384',
      keyword: '#a6142a',
      comment: '#808080',
      operator: '#838383',
      tag: '#a6142a',
      tagBracket: '#838383'
    }
  },
  textLink: '#007acc'
};

// Import after mocks are set up
const MonacoEditor = require('./index').default;
const monaco = require('monaco-editor');
const { registerBrunoTheme } = require('utils/monaco/brunoTheme');
const { setupVariableHighlighting, registerVariableHoverProvider } = require('utils/monaco/variableHighlighting');

describe('MonacoEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetValue.mockReturnValue('');
  });

  const renderEditor = (props = {}) => {
    return render(
      <ThemeProvider theme={MOCK_THEME}>
        <MonacoEditor {...props} />
      </ThemeProvider>
    );
  };

  it('renders without crashing', () => {
    const { container } = renderEditor();
    expect(container.querySelector('.monaco-editor-container')).toBeTruthy();
  });

  it('creates a Monaco editor instance on mount', () => {
    renderEditor({ value: 'const x = 1;' });
    expect(monaco.editor.create).toHaveBeenCalledTimes(1);
    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        value: 'const x = 1;'
      })
    );
  });

  it('registers Bruno theme on mount', () => {
    renderEditor({ theme: 'dark' });
    expect(registerBrunoTheme).toHaveBeenCalledWith(MOCK_THEME, 'dark');
  });

  it('uses the correct language for javascript mode', () => {
    renderEditor({ mode: 'application/javascript' });
    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        language: 'javascript'
      })
    );
  });

  it('applies readOnly option', () => {
    renderEditor({ readOnly: true });
    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        readOnly: true
      })
    );
  });

  it('applies font and fontSize', () => {
    renderEditor({ font: 'Fira Code', fontSize: 16 });
    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        fontFamily: 'Fira Code',
        fontSize: 16
      })
    );
  });

  it('applies word wrap settings', () => {
    renderEditor({ enableLineWrapping: true });
    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        wordWrap: 'on'
      })
    );
  });

  it('registers keybindings for onRun and onSave', () => {
    renderEditor({ onRun: jest.fn(), onSave: jest.fn() });
    expect(mockAddCommand).toHaveBeenCalledTimes(2);
  });

  it('disposes editor on unmount', () => {
    const { unmount } = renderEditor();
    act(() => {
      unmount();
    });
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('sets up variable highlighting when collection is provided', () => {
    const collection = { uid: 'col-1' };
    const item = { uid: 'item-1' };
    renderEditor({ collection, item });
    expect(setupVariableHighlighting).toHaveBeenCalledWith(mockEditor, collection, item);
    expect(registerVariableHoverProvider).toHaveBeenCalledWith(collection, item);
  });

  it('does not set up variable highlighting when collection is not provided', () => {
    renderEditor({});
    expect(setupVariableHighlighting).not.toHaveBeenCalled();
  });

  it('adds mousetrap class to textarea', () => {
    renderEditor();
    expect(mockGetDomNode).toHaveBeenCalled();
  });

  it('applies initial scroll position', () => {
    renderEditor({ initialScroll: 100 });
    expect(mockSetScrollTop).toHaveBeenCalledWith(100);
  });

  it('does not apply scroll when initialScroll is 0', () => {
    renderEditor({ initialScroll: 0 });
    expect(mockSetScrollTop).not.toHaveBeenCalled();
  });
});
