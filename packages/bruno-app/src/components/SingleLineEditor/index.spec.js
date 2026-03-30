import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

// Mock CodeMirror with event handler tracking
jest.mock('codemirror', () => {
  const CodeMirror = jest.fn((node, options) => {
    const editor = {
      options,
      _currentValue: '',
      getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
      getValue: jest.fn(() => editor._currentValue),
      setValue: jest.fn((val) => {
        editor._currentValue = val;
      }),
      setCursor: jest.fn(),
      getLine: jest.fn(() => ''),
      setOption: jest.fn(),
      refresh: jest.fn(),
      hasFocus: jest.fn(() => true),
      getWrapperElement: jest.fn(() => ({ remove: jest.fn() })),
      on: jest.fn(),
      off: jest.fn(),
      lineCount: jest.fn(() => 1),
      posFromIndex: jest.fn((i) => ({ line: 0, ch: i })),
      markText: jest.fn(() => ({ clear: jest.fn() }))
    };
    return editor;
  });
  CodeMirror.commands = { autocomplete: jest.fn() };
  CodeMirror.hint = {};
  CodeMirror.registerHelper = jest.fn();
  CodeMirror.defineMode = jest.fn();
  CodeMirror.signal = jest.fn();
  return CodeMirror;
});

jest.mock('utils/collections', () => ({
  getAllVariables: jest.fn(() => ({}))
}));

jest.mock('utils/common/codemirror', () => ({
  defineCodeMirrorBrunoVariablesMode: jest.fn()
}));

jest.mock('utils/common/masked-editor', () => ({
  MaskedEditor: jest.fn(() => ({
    enable: jest.fn(),
    disable: jest.fn(),
    destroy: jest.fn(),
    isEnabled: jest.fn(() => false),
    update: jest.fn()
  }))
}));

jest.mock('utils/codemirror/autocomplete', () => ({
  setupAutoComplete: jest.fn(() => jest.fn())
}));

jest.mock('utils/codemirror/linkAware', () => ({
  setupLinkAware: jest.fn()
}));

const SingleLineEditor = require('./index').default;

const MOCK_THEME = {
  text: '#333',
  font: { size: { base: '14px' } },
  codemirror: {
    bg: '#fff',
    border: '#ccc',
    placeholder: { color: '#999', opacity: '0.6' }
  },
  textLink: '#007acc'
};

const defaultProps = {
  value: '',
  collection: {},
  item: {},
  theme: 'light'
};

const renderEditor = (props = {}) => {
  const ref = React.createRef();
  const result = render(
    <ThemeProvider theme={MOCK_THEME}>
      <SingleLineEditor ref={ref} {...defaultProps} {...props} />
    </ThemeProvider>
  );
  return { ref, ...result };
};

describe('SingleLineEditor - _hasUncommittedUserEdits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Flag state transitions ───────────────────────────────────────────

  it('initializes _hasUncommittedUserEdits to false', () => {
    const { ref } = renderEditor({ value: 'https://example.com' });
    expect(ref.current._hasUncommittedUserEdits).toBe(false);
  });

  it('sets flag to true when user edits (typing)', () => {
    const { ref } = renderEditor({ value: 'initial' });
    const instance = ref.current;

    // Simulate user typing a character
    instance.editor._currentValue = 'initial-x';
    instance._onEdit();

    expect(instance._hasUncommittedUserEdits).toBe(true);
  });

  it('resets flag to false on blur', () => {
    const { ref } = renderEditor({ value: 'initial' });
    const instance = ref.current;

    // User types → flag true
    instance.editor._currentValue = 'changed';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    // User blurs → flag false
    instance._onBlur();
    expect(instance._hasUncommittedUserEdits).toBe(false);
  });

  it('resets flag to false on paste event', () => {
    const { ref } = renderEditor({ value: 'initial' });
    const instance = ref.current;

    // User types → flag true
    instance.editor._currentValue = 'changed';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    // Paste event fires → flag false
    const mockEvent = {};
    instance._onPaste(null, mockEvent);
    expect(instance._hasUncommittedUserEdits).toBe(false);
  });

  it('does not set flag when ignoreChangeEvent is true (programmatic changes)', () => {
    const { ref } = renderEditor({ value: 'initial' });
    const instance = ref.current;

    // Simulate programmatic change (e.g. during componentDidUpdate)
    instance.ignoreChangeEvent = true;
    instance.editor._currentValue = 'programmatic';
    instance._onEdit();
    instance.ignoreChangeEvent = false;

    expect(instance._hasUncommittedUserEdits).toBe(false);
  });

  // ── Autosave protection: user edits are preserved ────────────────────

  it('skips external value update when user has uncommitted edits', () => {
    const { ref, rerender } = renderEditor({ value: 'original-url' });
    const instance = ref.current;

    // User types a different URL
    instance.editor._currentValue = 'user-typed-url';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    // Clear setValue calls from mount
    instance.editor.setValue.mockClear();

    // Autosave round-trip arrives with a slightly different (normalized) value
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="normalized-url" />
      </ThemeProvider>
    );

    // Editor should NOT have been updated with the autosave value
    expect(instance.editor.setValue).not.toHaveBeenCalledWith('normalized-url');
    // Editor should retain the user's version
    expect(instance.cachedValue).toBe('user-typed-url');
  });

  // ── cURL paste: programmatic updates go through ──────────────────────

  it('applies external value update when no uncommitted user edits', () => {
    const { ref, rerender } = renderEditor({ value: 'old-url' });
    const instance = ref.current;

    // No user edits — flag is false
    expect(instance._hasUncommittedUserEdits).toBe(false);

    instance.editor.setValue.mockClear();

    // cURL paste dispatches a new URL via Redux, arrives as a prop update
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="https://api.example.com/users" />
      </ThemeProvider>
    );

    // Editor should be updated with the parsed cURL URL
    expect(instance.editor.setValue).toHaveBeenCalledWith('https://api.example.com/users');
    expect(instance.cachedValue).toBe('https://api.example.com/users');
  });

  it('applies external value update after paste resets the flag (full cURL flow)', () => {
    const onPasteSpy = jest.fn();
    const { ref, rerender } = renderEditor({ value: 'old-url', onPaste: onPasteSpy });
    const instance = ref.current;

    // Step 1: User was typing before the paste
    instance.editor._currentValue = 'old-url-modified';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    // Step 2: User pastes a cURL command → _onPaste fires and resets the flag
    const mockEvent = { preventDefault: jest.fn() };
    instance._onPaste(null, mockEvent);
    expect(instance._hasUncommittedUserEdits).toBe(false);
    expect(onPasteSpy).toHaveBeenCalledWith(mockEvent);

    // Step 3: The cURL handler dispatches the parsed URL, arrives as a prop update
    instance.editor.setValue.mockClear();
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="https://parsed-curl.example.com" onPaste={onPasteSpy} />
      </ThemeProvider>
    );

    // Editor should accept the new URL
    expect(instance.editor.setValue).toHaveBeenCalledWith('https://parsed-curl.example.com');
    expect(instance.cachedValue).toBe('https://parsed-curl.example.com');
  });

  // ── Round-trip reset ─────────────────────────────────────────────────

  it('resets flag when prop value matches cachedValue (successful round-trip)', () => {
    const onChange = jest.fn();
    const { ref, rerender } = renderEditor({ value: 'initial', onChange });
    const instance = ref.current;

    // User types → flag true, cachedValue updated
    instance.editor._currentValue = 'new-value';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);
    expect(instance.cachedValue).toBe('new-value');

    // Prop round-trips with the exact same value
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="new-value" onChange={onChange} />
      </ThemeProvider>
    );

    // Flag should be reset — the edit was acknowledged
    expect(instance._hasUncommittedUserEdits).toBe(false);
  });

  it('after round-trip reset, subsequent external updates are applied', () => {
    const onChange = jest.fn();
    const { ref, rerender } = renderEditor({ value: 'step-0', onChange });
    const instance = ref.current;

    // User types → flag true
    instance.editor._currentValue = 'step-1';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    // Round-trip: prop matches cachedValue → flag reset
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="step-1" onChange={onChange} />
      </ThemeProvider>
    );
    expect(instance._hasUncommittedUserEdits).toBe(false);

    // Now an external update (e.g., cURL paste) arrives
    instance.editor.setValue.mockClear();
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="step-2-external" onChange={onChange} />
      </ThemeProvider>
    );

    // Should be applied since flag is false
    expect(instance.editor.setValue).toHaveBeenCalledWith('step-2-external');
  });

  // ── Normal paste (not cURL) still protects edits ─────────────────────

  it('normal paste re-enables protection via subsequent _onEdit', () => {
    const { ref, rerender } = renderEditor({ value: 'before-paste' });
    const instance = ref.current;

    // User types → flag true
    instance.editor._currentValue = 'before-paste-edited';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    // Paste event fires (not cURL, so no preventDefault) → flag reset momentarily
    instance._onPaste(null, {});
    expect(instance._hasUncommittedUserEdits).toBe(false);

    // CodeMirror inserts pasted text → _onEdit fires again → flag back to true
    instance.editor._currentValue = 'before-paste-edited-pasted-text';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    // Autosave arrives with different value → should be skipped
    instance.editor.setValue.mockClear();
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="autosave-normalized" />
      </ThemeProvider>
    );

    expect(instance.editor.setValue).not.toHaveBeenCalledWith('autosave-normalized');
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  it('applies update even with uncommitted edits when incoming value is empty', () => {
    const { ref, rerender } = renderEditor({ value: 'some-url' });
    const instance = ref.current;

    // User types → flag true
    instance.editor._currentValue = 'some-url-edited';
    instance._onEdit();
    expect(instance._hasUncommittedUserEdits).toBe(true);

    instance.editor.setValue.mockClear();

    // External update with empty string (e.g., new request reset)
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="" />
      </ThemeProvider>
    );

    // Should still apply — the `nextValue !== ''` check lets empty through
    expect(instance.editor.setValue).toHaveBeenCalledWith('');
  });

  it('cursor position is preserved when external update is applied', () => {
    const { ref, rerender } = renderEditor({ value: 'old' });
    const instance = ref.current;

    // Set up a cursor position
    const mockCursor = { line: 0, ch: 3 };
    instance.editor.getCursor.mockReturnValue(mockCursor);

    instance.editor.setValue.mockClear();
    instance.editor.setCursor.mockClear();

    // External update applied (flag is false)
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="new-value" />
      </ThemeProvider>
    );

    expect(instance.editor.setValue).toHaveBeenCalledWith('new-value');
    expect(instance.editor.setCursor).toHaveBeenCalledWith(mockCursor);
  });

  it('no update when prop value does not change', () => {
    const { ref, rerender } = renderEditor({ value: 'same' });
    const instance = ref.current;

    instance.editor.setValue.mockClear();

    // Rerender with same value
    rerender(
      <ThemeProvider theme={MOCK_THEME}>
        <SingleLineEditor ref={ref} {...defaultProps} value="same" />
      </ThemeProvider>
    );

    // setValue should not be called (value didn't change)
    expect(instance.editor.setValue).not.toHaveBeenCalled();
  });
});
