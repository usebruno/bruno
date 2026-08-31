import React from 'react';
import { render } from '@testing-library/react';
import CodeEditor from './index';
import { ThemeProvider } from 'styled-components';

jest.mock('codemirror', () => {
  const codemirror = require('test-utils/mocks/codemirror');
  return codemirror;
});

jest.mock('providers/ReduxStore', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
    subscribe: jest.fn()
  }
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => undefined)
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

jest.mock('./state-persistence', () => ({
  applyEditorState: jest.fn(),
  captureEditorState: jest.fn(),
  getDocKey: jest.fn(() => 'doc-key'),
  readPersistedEditorState: jest.fn(),
  writePersistedEditorState: jest.fn()
}));

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

const MOCK_THEME = {
  codemirror: {
    bg: '#1e1e1e',
    border: '#333',
    placeholder: { color: '#666', opacity: 0.5 },
    searchLineHighlightCurrent: 'rgba(255,255,0,0.1)',
    variable: { invalid: '#f00', valid: '#0f0' },
    tokens: {
      atom: '#000', comment: '#000', definition: '#000', keyword: '#000',
      number: '#000', operator: '#000', property: '#000', string: '#000',
      tag: '#000', tagBracket: '#000', variable: '#000'
    }
  },
  textLink: '#007acc',
  border: { radius: { base: '4px' } },
  colors: { text: { danger: '#f00', muted: '#999', warning: '#fa0' } },
  font: { size: { xs: '11px' } },
  shadow: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
  status: { danger: { background: '#fee' }, success: { background: '#efe' } }
};

const setupEditorState = (editor, { value, cursorPosition }) => {
  editor._currentValue = value;
  editor.getCursor.mockReturnValue({ line: 0, ch: cursorPosition });
  editor.getRange.mockImplementation((from, to) => {
    if (from.line === 0 && from.ch === 0 && to.line === 0 && to.ch === cursorPosition) {
      return value;
    }
    return editor._currentValue.slice(from.ch, to.ch);
  });

  editor.state = {
    completionActive: null
  };
};

const setupEditorWithRef = () => {
  const ref = React.createRef();
  const { rerender } = render(
    <ThemeProvider theme={MOCK_THEME}>
      <CodeEditor ref={ref} />
    </ThemeProvider>
  );
  return { ref, rerender };
};

const itemA = { uid: 'item-a', type: 'http-request' };
const collectionA = { uid: 'collection-a' };
const itemB = { uid: 'item-b', type: 'graphql-request' };
const collectionB = { uid: 'collection-b' };

const renderEditor = (props) =>
  render(
    <ThemeProvider theme={MOCK_THEME}>
      <CodeEditor value="http://example.test/foo" {...props} />
    </ThemeProvider>
  );

describe('CodeEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('add CodeEditor related tests here', () => {});

  describe('link-aware reconfiguration', () => {
    it('reconfigures the link-click handler when item/collection change', () => {
      const { rerender } = renderEditor({ item: itemA, collection: collectionA });

      expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
      expect(mockSetupLinkAware.mock.calls[0][1].onLinkClick).toBeDefined();

      rerender(
        <ThemeProvider theme={MOCK_THEME}>
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
        <ThemeProvider theme={MOCK_THEME}>
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
        <ThemeProvider theme={MOCK_THEME}>
          <CodeEditor value="http://example.test/foo" item={itemA} collection={collectionA} readOnly={true} />
        </ThemeProvider>
      );

      expect(mockDestroyLinkAware).not.toHaveBeenCalled();
      expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
    });
  });
});
