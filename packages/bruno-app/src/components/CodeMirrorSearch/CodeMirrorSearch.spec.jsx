import React, { createRef } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import CodeMirrorSearch from './index';

jest.mock('components/ToolHint', () => ({ children }) => <>{children}</>);

const theme = {
  background: { base: '#1e1e1e' },
  text: { base: '#d4d4d4' },
  colors: { text: { subtext1: '#888', subtext2: '#aaa' } },
  border: { border2: '#444', radius: { sm: '4px' } },
  font: { size: { base: '13px', xs: '11px' } },
  brand: '#007acc',
  codemirror: { border: '#555', searchLineHighlightCurrent: 'rgba(255,255,0,0.1)' }
};

function makeMockEditor(matchResults = []) {
  const marks = [];
  return {
    getSearchCursor: jest.fn(() => {
      let i = -1;
      return {
        findNext: () => {
          i++; return i < matchResults.length;
        },
        from: () => matchResults[i]?.from,
        to: () => matchResults[i]?.to
      };
    }),
    markText: jest.fn((from, to, opts) => {
      const mark = { from, to, className: opts.className, clear: jest.fn() };
      marks.push(mark);
      return mark;
    }),
    replaceRange: jest.fn(),
    operation: jest.fn((fn) => fn()),
    addLineClass: jest.fn(),
    removeLineClass: jest.fn(),
    scrollIntoView: jest.fn(),
    setSelection: jest.fn(),
    focus: jest.fn(),
    getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
    getViewport: jest.fn(() => ({ from: 0, to: 100 })),
    getValue: jest.fn(() => 'test content'),
    lineCount: jest.fn(() => 1),
    lastLine: jest.fn(() => 0),
    getLine: jest.fn(() => 'test content'),
    changeGeneration: jest.fn(() => 1),
    on: jest.fn(),
    off: jest.fn(),
    _marks: marks
  };
}

function renderSearch(props = {}, ref = null) {
  const defaultRef = ref || createRef();
  const result = render(
    <ThemeProvider theme={theme}>
      <CodeMirrorSearch
        visible={true}
        editor={makeMockEditor()}
        onClose={jest.fn()}
        ref={defaultRef}
        {...props}
      />
    </ThemeProvider>
  );
  return { ...result, ref: defaultRef };
}

function typeSearch(text) {
  fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: text } });
  act(() => jest.advanceTimersByTime(250));
}

describe('CodeMirrorSearch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when visible is false', () => {
      const { container } = render(
        <ThemeProvider theme={theme}>
          <CodeMirrorSearch visible={false} editor={makeMockEditor()} onClose={jest.fn()} ref={createRef()} />
        </ThemeProvider>
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders search input when visible', () => {
      renderSearch();
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('does not show replace row by default', () => {
      renderSearch();
      expect(screen.queryByPlaceholderText('Replace...')).not.toBeInTheDocument();
    });

    it('shows replace row after toggling chevron', () => {
      renderSearch();
      fireEvent.click(screen.getByTitle('Show replace'));
      expect(screen.getByPlaceholderText('Replace...')).toBeInTheDocument();
    });
  });

  describe('result count', () => {
    it('shows "0 results" when search is empty', () => {
      renderSearch();
      expect(screen.getByText('0 results')).toBeInTheDocument();
    });

    it('shows "1 / 3" for first match of 3', () => {
      const matches = [
        { from: { line: 0, ch: 0 }, to: { line: 0, ch: 4 } },
        { from: { line: 1, ch: 0 }, to: { line: 1, ch: 4 } },
        { from: { line: 2, ch: 0 }, to: { line: 2, ch: 4 } }
      ];
      renderSearch({ editor: makeMockEditor(matches) });
      typeSearch('test');
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('shows "0 results" when no matches found', () => {
      renderSearch({ editor: makeMockEditor([]) });
      typeSearch('xyz');
      expect(screen.getByText('0 results')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    function setupWithMatches(count = 3) {
      const matches = Array.from({ length: count }, (_, i) => ({
        from: { line: i, ch: 0 },
        to: { line: i, ch: 4 }
      }));
      renderSearch({ editor: makeMockEditor(matches) });
      typeSearch('test');
      return matches;
    }

    it('advances to next match on Enter', () => {
      setupWithMatches(3);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
      fireEvent.keyDown(screen.getByPlaceholderText('Search...'), { key: 'Enter' });
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('goes to previous match on Shift+Enter', () => {
      setupWithMatches(3);
      fireEvent.keyDown(screen.getByPlaceholderText('Search...'), { key: 'Enter' });
      fireEvent.keyDown(screen.getByPlaceholderText('Search...'), { key: 'Enter', shiftKey: true });
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('wraps from last to first on next', () => {
      setupWithMatches(3);
      const input = screen.getByPlaceholderText('Search...');
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('wraps from first to last on prev', () => {
      setupWithMatches(3);
      fireEvent.keyDown(screen.getByPlaceholderText('Search...'), { key: 'Enter', shiftKey: true });
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });
  });

  describe('imperative handle', () => {
    it('focus() focuses the search input', () => {
      const ref = createRef();
      renderSearch({}, ref);
      act(() => ref.current.focus());
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Search...'));
    });

    it('setSearch(text) populates the input', () => {
      const ref = createRef();
      renderSearch({}, ref);
      act(() => ref.current.setSearch('hello'));
      expect(screen.getByPlaceholderText('Search...')).toHaveValue('hello');
    });

    it('setSearch(text, cursorPos) shows the match at cursor position', () => {
      const matches = Array.from({ length: 5 }, (_, i) => ({
        from: { line: i, ch: 0 },
        to: { line: i, ch: 7 }
      }));
      const ref = createRef();
      renderSearch({ editor: makeMockEditor(matches) }, ref);

      act(() => {
        ref.current.setSearch('console', { line: 2, ch: 0 });
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('3 / 5')).toBeInTheDocument();
    });

    it('openReplace() shows the replace row', () => {
      const ref = createRef();
      renderSearch({}, ref);
      act(() => {
        ref.current.openReplace();
        jest.runAllTimers();
      });
      expect(screen.getByPlaceholderText('Replace...')).toBeInTheDocument();
    });

    it('close() calls onClose and collapses replace', () => {
      const onClose = jest.fn();
      const ref = createRef();
      renderSearch({ onClose }, ref);
      act(() => {
        ref.current.openReplace(); jest.runAllTimers();
      });
      act(() => ref.current.close());
      expect(onClose).toHaveBeenCalled();
      expect(screen.queryByPlaceholderText('Replace...')).not.toBeInTheDocument();
    });
  });

  describe('Escape key', () => {
    it('closes the bar and calls onClose', () => {
      const onClose = jest.fn();
      renderSearch({ onClose });
      fireEvent.keyDown(screen.getByPlaceholderText('Search...'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('isDebouncing guard', () => {
    it('replace buttons are disabled while debounce is pending', () => {
      const ref = createRef();
      renderSearch({}, ref);
      act(() => {
        ref.current.openReplace(); jest.runAllTimers();
      });

      // Type but do NOT advance timers — debounce still pending
      fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'test' } });

      expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Replace all' })).toBeDisabled();
    });

    it('replace buttons are enabled once debounce settles', () => {
      const matches = [{ from: { line: 0, ch: 0 }, to: { line: 0, ch: 4 } }];
      const ref = createRef();
      renderSearch({ editor: makeMockEditor(matches) }, ref);
      act(() => {
        ref.current.openReplace(); jest.runAllTimers();
      });

      fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(250));

      expect(screen.getByRole('button', { name: 'Replace' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Replace all' })).not.toBeDisabled();
    });
  });

  describe('document change (undo/redo/edit)', () => {
    it('re-runs search and updates count when document changes', () => {
      let changeHandler;
      const matches = [
        { from: { line: 0, ch: 0 }, to: { line: 0, ch: 7 } },
        { from: { line: 1, ch: 0 }, to: { line: 1, ch: 7 } }
      ];
      const editor = makeMockEditor(matches);
      // Capture the change handler registered by the component
      editor.on = jest.fn((event, handler) => { if (event === 'change') changeHandler = handler; });
      editor.off = jest.fn();

      renderSearch({ editor });
      typeSearch('console');
      expect(screen.getByText('1 / 2')).toBeInTheDocument();

      // Simulate undo — document reverts, now no matches
      editor.getSearchCursor.mockImplementation(() => {
        let i = -1;
        return { findNext: () => false, from: () => undefined, to: () => undefined };
      });

      act(() => {
        changeHandler();
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByText('0 results')).toBeInTheDocument();
    });
  });

  describe('handleReplaceAll', () => {
    it('replaces all matches via a single replaceRange call with the reconstructed text', () => {
      const content = 'console\nconsole\nconsole';
      const lines = content.split('\n');
      const matches = [
        { from: { line: 0, ch: 0 }, to: { line: 0, ch: 7 } },
        { from: { line: 1, ch: 0 }, to: { line: 1, ch: 7 } },
        { from: { line: 2, ch: 0 }, to: { line: 2, ch: 7 } }
      ];
      const editor = {
        ...makeMockEditor(matches),
        getValue: jest.fn(() => content),
        lineCount: jest.fn(() => lines.length),
        lastLine: jest.fn(() => lines.length - 1),
        getLine: jest.fn((n) => lines[n])
      };
      const ref = createRef();
      renderSearch({ editor }, ref);

      typeSearch('console');
      act(() => {
        ref.current.openReplace(); jest.runAllTimers();
      });
      fireEvent.change(screen.getByPlaceholderText('Replace...'), { target: { value: 'log' } });

      fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));

      expect(editor.operation).toHaveBeenCalled();
      expect(editor.replaceRange).toHaveBeenCalledTimes(1);
      expect(editor.replaceRange.mock.calls[0][0]).toBe('log\nlog\nlog');
    });
  });
});
