import React from 'react';
import { render, act } from '@testing-library/react';
import CodeEditor from './index';
import { ThemeProvider } from 'styled-components';
import { LONG_LINE_LIMIT } from 'utils/common/long-lines';
import darkTheme from 'themes/dark/dark';

const CodeMirror = require('codemirror');

jest.mock('codemirror', () => {
  const codemirror = require('test-utils/mocks/codemirror');
  return codemirror;
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => selector({ app: { preferences: {} } }))
}));

jest.mock('providers/ReduxStore', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
    subscribe: jest.fn()
  }
}));

jest.mock('utils/codemirror/autocomplete', () => ({
  setupAutoComplete: jest.fn(() => jest.fn()),
  showRootHints: jest.fn()
}));

jest.mock('utils/codemirror/aiGhostText', () => ({
  setupAiAutocomplete: jest.fn(() => jest.fn())
}));

jest.mock('utils/codemirror/lint-errors', () => ({
  setupLintErrorTooltip: jest.fn(() => jest.fn())
}));

jest.mock('utils/codemirror/resize', () => ({
  setupCodeMirrorResizeRefresh: jest.fn(() => jest.fn())
}));

jest.mock('components/CodeMirrorSearch/searchKeyBindings', () => ({
  buildSearchKeyBindings: jest.fn(() => ({}))
}));

jest.mock('./state-persistence', () => {
  const actual = jest.requireActual('./state-persistence');
  return {
    ...actual,
    applyEditorState: jest.fn(),
    captureEditorState: jest.fn(),
    readPersistedEditorState: jest.fn(),
    writePersistedEditorState: jest.fn()
  };
});

jest.mock('utils/collections', () => ({
  getAllVariables: jest.fn(() => ({})),
  getRequestTypeFromCollectionPresets: jest.fn(() => undefined)
}));

jest.mock('utils/common/codemirror', () => ({
  defineCodeMirrorBrunoVariablesMode: jest.fn()
}));

const mockDestroyLinkAware = jest.fn();
const mockResolveLinkClickHandler = jest.fn((item, collection) => (collection?.uid ? jest.fn() : undefined));
jest.mock('utils/codemirror/linkClickHandler', () => ({
  resolveLinkClickHandler: (...args) => mockResolveLinkClickHandler(...args)
}));

const mockSetupLinkAware = jest.fn((editor) => {
  editor._destroyLinkAware = mockDestroyLinkAware;
});
jest.mock('utils/codemirror/linkAware', () => ({
  setupLinkAware: (...args) => mockSetupLinkAware(...args)
}));

const setupEditorWithRef = (props = {}) => {
  const ref = React.createRef();
  const view = render(
    <ThemeProvider theme={darkTheme}>
      <CodeEditor ref={ref} {...props} />
    </ThemeProvider>
  );
  return {
    ref,
    ...view,
    rerender: (nextProps) => view.rerender(
      <ThemeProvider theme={darkTheme}>
        <CodeEditor ref={ref} {...nextProps} />
      </ThemeProvider>
    )
  };
};

const getStatusBarToggle = (view) => view.getByTestId('editor-status-bar-toggle');

const itemA = { uid: 'item-a', type: 'http-request' };
const collectionA = { uid: 'collection-a' };
const itemB = { uid: 'item-b', type: 'graphql-request' };
const collectionB = { uid: 'collection-b' };

const renderEditor = (props) =>
  render(
    <ThemeProvider theme={darkTheme}>
      <CodeEditor value="http://example.test/foo" {...props} />
    </ThemeProvider>
  );

describe('CodeEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts in degraded mode for a pathological line', () => {
    const view = setupEditorWithRef({ value: 'x'.repeat(LONG_LINE_LIMIT + 1) });

    expect(CodeMirror).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lineNumbers: false,
        mode: null,
        lint: false,
        autoCloseBrackets: false,
        matchBrackets: false,
        foldGutter: false,
        gutters: []
      })
    );
    expect(view.getByTestId('editor-status-bar')).toHaveTextContent('editor features turned off for performance');
  });

  it('enters degraded mode before loading a pathological external value', () => {
    const { rerender } = setupEditorWithRef({ value: 'short', mode: 'application/json' });
    const editor = CodeMirror.mock.results[0].value;

    rerender({ value: 'x'.repeat(LONG_LINE_LIMIT + 1), mode: 'application/json' });

    expect(editor.setOption).toHaveBeenCalledWith('mode', null);
    expect(editor.setOption).toHaveBeenCalledWith('lint', false);
    expect(editor.setValue).toHaveBeenCalledWith('x'.repeat(LONG_LINE_LIMIT + 1));
    const modeCallIndex = editor.setOption.mock.calls.findIndex(([key, value]) => key === 'mode' && value === null);
    expect(editor.setOption.mock.invocationCallOrder[modeCallIndex])
      .toBeLessThan(editor.setValue.mock.invocationCallOrder[0]);
  });

  it('enters degraded mode when a pathological line is pasted', () => {
    const view = setupEditorWithRef({ value: 'short', mode: 'application/json' });
    const editor = CodeMirror.mock.results[0].value;
    const beforeChangeHandler = editor.on.mock.calls.find(([event]) => event === 'beforeChange')[1];
    const changeHandler = editor.on.mock.calls.find(([event]) => event === 'change')[1];

    act(() => {
      beforeChangeHandler(editor, {
        from: { line: 0, ch: 5 },
        to: { line: 0, ch: 5 },
        text: ['x'.repeat(LONG_LINE_LIMIT + 1)]
      });
    });

    expect(editor.setOption).toHaveBeenCalledWith('mode', null);
    expect(editor.setOption).toHaveBeenCalledWith('lint', false);

    editor._currentValue = 'x'.repeat(LONG_LINE_LIMIT + 1);
    act(() => changeHandler());

    expect(editor.options.lint).toBe(false);
    expect(view.getByTestId('editor-status-bar')).toHaveTextContent('editor features turned off for performance');
  });

  it('enables full editor and reverts back via the status bar toggle', () => {
    const value = 'x'.repeat(LONG_LINE_LIMIT + 1);
    const view = setupEditorWithRef({ value, mode: 'application/json' });
    const editor = CodeMirror.mock.results[0].value;

    act(() => {
      getStatusBarToggle(view).click();
    });

    expect(editor.setOption).toHaveBeenCalledWith('mode', 'brunovariables');
    expect(getStatusBarToggle(view)).toHaveTextContent('disable full editor');

    editor.setOption.mockClear();

    act(() => {
      getStatusBarToggle(view).click();
    });

    expect(editor.setOption).toHaveBeenCalledWith('mode', null);
    expect(getStatusBarToggle(view)).toHaveTextContent('enable full editor');
  });

  it('clears the full-editor override when external value changes on the same tab', () => {
    const view = setupEditorWithRef({
      value: 'x'.repeat(LONG_LINE_LIMIT + 1),
      mode: 'application/json'
    });

    act(() => {
      getStatusBarToggle(view).click();
    });
    expect(getStatusBarToggle(view)).toHaveTextContent('disable full editor');

    view.rerender({ value: 'y'.repeat(LONG_LINE_LIMIT + 1), mode: 'application/json' });

    expect(getStatusBarToggle(view)).toHaveTextContent('enable full editor');
  });

  it('clears the full-editor override when the document changes on tab switch', () => {
    const value = 'x'.repeat(LONG_LINE_LIMIT + 1);
    const view = setupEditorWithRef({
      value,
      mode: 'application/json',
      docKey: 'doc-1'
    });

    act(() => {
      getStatusBarToggle(view).click();
    });
    expect(getStatusBarToggle(view)).toHaveTextContent('disable full editor');

    view.rerender({ value, mode: 'application/json', docKey: 'doc-2' });

    expect(getStatusBarToggle(view)).toHaveTextContent('enable full editor');
  });

  it('clears the full-editor override when a forced degrade fires from a paste', () => {
    const view = setupEditorWithRef({ value: 'short', mode: 'application/json' });
    const editor = CodeMirror.mock.results[0].value;
    const beforeChangeHandler = editor.on.mock.calls.find(([event]) => event === 'beforeChange')[1];

    act(() => {
      beforeChangeHandler(editor, {
        from: { line: 0, ch: 5 },
        to: { line: 0, ch: 5 },
        text: ['x'.repeat(LONG_LINE_LIMIT + 1)]
      });
    });

    act(() => {
      getStatusBarToggle(view).click();
    });
    expect(getStatusBarToggle(view)).toHaveTextContent('disable full editor');

    act(() => {
      beforeChangeHandler(editor, {
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 0 },
        text: ['y'.repeat(LONG_LINE_LIMIT + 1)]
      });
    });

    expect(getStatusBarToggle(view)).toHaveTextContent('enable full editor');
  });

  it('loads a normal external value before restoring enhanced features', () => {
    const { rerender } = setupEditorWithRef({
      value: 'x'.repeat(LONG_LINE_LIMIT + 1),
      mode: 'application/json'
    });
    const editor = CodeMirror.mock.results[0].value;
    editor.setOption.mockClear();
    editor.setValue.mockClear();

    rerender({ value: 'short', mode: 'application/json' });

    const modeCallIndex = editor.setOption.mock.calls.findIndex(
      ([key, value]) => key === 'mode' && value === 'brunovariables'
    );
    expect(editor.setValue).toHaveBeenCalledWith('short');
    expect(editor.setValue.mock.invocationCallOrder[0])
      .toBeLessThan(editor.setOption.mock.invocationCallOrder[modeCallIndex]);
  });

  it('shows the size and mode in the status bar, with no toggle for short content', () => {
    const view = setupEditorWithRef({ value: 'short', mode: 'application/json' });

    expect(view.getByTestId('editor-status-bar')).toHaveTextContent('json mode');
    expect(view.queryByTestId('editor-status-bar-toggle')).not.toBeInTheDocument();
  });

  describe('link-aware reconfiguration', () => {
    it('reconfigures the link-click handler when item/collection change', () => {
      const { rerender } = renderEditor({ item: itemA, collection: collectionA });

      expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
      expect(mockSetupLinkAware.mock.calls[0][1].onLinkClick).toBeDefined();

      rerender(
        <ThemeProvider theme={darkTheme}>
          <CodeEditor value="http://example.test/foo" item={itemB} collection={collectionB} />
        </ThemeProvider>
      );

      expect(mockDestroyLinkAware).toHaveBeenCalledTimes(1);
      expect(mockSetupLinkAware).toHaveBeenCalledTimes(2);
      expect(mockSetupLinkAware.mock.calls[1][1].onLinkClick).toBeDefined();

      mockSetupLinkAware.mock.calls[1][1].onLinkClick('http://example.test/foo');
      expect(mockResolveLinkClickHandler).toHaveBeenLastCalledWith(itemB, collectionB);
    });

    it('reconfigures once collection becomes available after mount', () => {
      const { rerender } = renderEditor({ item: itemA, collection: undefined });

      expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
      expect(mockSetupLinkAware.mock.calls[0][1].onLinkClick).toBeUndefined();

      rerender(
        <ThemeProvider theme={darkTheme}>
          <CodeEditor value="http://example.test/foo" item={itemA} collection={collectionA} />
        </ThemeProvider>
      );

      expect(mockDestroyLinkAware).toHaveBeenCalledTimes(1);
      expect(mockSetupLinkAware).toHaveBeenCalledTimes(2);
      expect(mockSetupLinkAware.mock.calls[1][1].onLinkClick).toBeDefined();

      mockSetupLinkAware.mock.calls[1][1].onLinkClick('http://example.test/foo');
      expect(mockResolveLinkClickHandler).toHaveBeenLastCalledWith(itemA, collectionA);
    });

    it('does not reconfigure when item/collection stay the same', () => {
      const { rerender } = renderEditor({ item: itemA, collection: collectionA });

      expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);

      rerender(
        <ThemeProvider theme={darkTheme}>
          <CodeEditor value="http://example.test/foo" item={itemA} collection={collectionA} readOnly={true} />
        </ThemeProvider>
      );

      expect(mockDestroyLinkAware).not.toHaveBeenCalled();
      expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
    });
  });
});
