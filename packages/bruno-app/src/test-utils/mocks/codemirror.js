const CodeMirror = jest.fn((node, options) => {
  const editor = {
    options,
    _currentValue: '',
    inputReadHandler: null,
    keyupHandler: null,
    getCursor: jest.fn(() => ({ line: 0, ch: editor._currentValue?.length || 0 })),
    getRange: jest.fn((from, to) => editor._currentValue?.slice(0, to.ch) || ''),
    getValue: jest.fn(() => editor._currentValue),
    setValue: jest.fn(function (val) {
      editor._currentValue = val;
    }),
    getLine: jest.fn(() => editor._currentValue || ''),
    setOption: jest.fn(),
    refresh: jest.fn(),
    off: jest.fn(),
    showHint: jest.fn(),
    on: jest.fn(function (event, handler) {
      if (event === 'inputRead') {
        this.inputReadHandler = handler;
      }
      if (event === 'keyup') {
        this.keyupHandler = handler;
      }
    })
  };
  return editor;
});

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
