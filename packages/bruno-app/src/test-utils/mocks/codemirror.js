const CodeMirror = jest.fn((node, options) => {
  const editor = {
    options,
    _currentValue: options.value || '',
    _onKeyUpMockDataHints: null,
    getCursor: jest.fn(() => ({ line: 0, ch: editor._currentValue?.length || 0 })),
    setCursor: jest.fn(),
    getRange: jest.fn((from, to) => editor._currentValue?.slice(0, to.ch) || ''),
    getValue: jest.fn(() => editor._currentValue),
    setValue: jest.fn(function (val) {
      editor._currentValue = val;
    }),
    getLine: jest.fn(() => editor._currentValue || ''),
    setOption: jest.fn((key, value) => {
      editor.options[key] = value;
    }),
    refresh: jest.fn(),
    off: jest.fn(),
    showHint: jest.fn(),
    toggleComment: jest.fn(),
    scrollTo: jest.fn(),
    getScrollInfo: jest.fn(() => ({ top: 0, clientHeight: 500 })),
    getWrapperElement: jest.fn(() => node),
    getInputField: jest.fn(() => document.createElement('textarea')),
    getAllMarks: jest.fn(() => []),
    lineAtHeight: jest.fn(() => 0),
    markText: jest.fn(() => ({ clear: jest.fn() })),
    operation: jest.fn((callback) => callback()),
    getDoc: jest.fn(() => ({
      getValue: () => editor._currentValue,
      getCursor: editor.getCursor,
      listSelections: () => [],
      getHistory: () => ({}),
      lineCount: () => 1,
      getLine: () => editor._currentValue
    })),
    on: jest.fn(function (event, handler) {
      if (event === 'keyup') {
        if (handler && handler.name === '_onKeyUpMockDataHints') {
          this._onKeyUpMockDataHints = handler;
        }
      }
    })
  };
  return editor;
});

Object.assign(CodeMirror, jest.requireActual('codemirror'));

CodeMirror.commands = {
  autocomplete: jest.fn()
};

CodeMirror.hint = {};

CodeMirror.registerHelper = jest.fn((type, name, value) => {
  if (!CodeMirror[type]) {
    CodeMirror[type] = {};
  }

  CodeMirror[type][name] = value;
});

CodeMirror.fromTextArea = jest.fn();
CodeMirror.defineMode = jest.fn();

module.exports = CodeMirror;
