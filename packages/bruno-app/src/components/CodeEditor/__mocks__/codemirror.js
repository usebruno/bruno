const React = require('react');

const CodeMirror = jest.fn((node, options) => {
  const editor = {
    options,
    _currentValue: '',
    getCursor: jest.fn(() => ({ line: 0, ch: editor._currentValue?.length || 0 })),
    getRange: jest.fn((from, to) => editor._currentValue?.slice(0, to.ch) || ''),
    getValue: jest.fn(() => editor._currentValue),
    setValue: jest.fn(function (val) {
      editor._currentValue = val;
    }),
    setOption: jest.fn(),
    refresh: jest.fn(),
    off: jest.fn(),
    showHint: jest.fn(),
    on: jest.fn(function (event, handler) {
      console.log('[MOCK] editor.on called with:', event);
      if (event === 'inputRead') {
        this.inputReadHandler = handler;
      }
    }),
  };
  return editor;
});

CodeMirror.commands = {
  autocomplete: jest.fn()
};
CodeMirror.registerHelper = jest.fn();
CodeMirror.fromTextArea = jest.fn();
CodeMirror.defineMode = jest.fn();

module.exports = CodeMirror;