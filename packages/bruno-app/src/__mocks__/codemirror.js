const CodeMirror = function(element, options) {
  this.options = options;
  this.element = element;
  this._value = '';
  this._cursorPos = { line: 0, ch: 0 };
  this.showHint = jest.fn();
  this.state = { completionActive: false };
  return this;
};

CodeMirror.prototype = {
  getCursor: function() { return this._cursorPos; },
  setCursor: function(pos) { this._cursorPos = pos; },
  getValue: function() { return this._value; },
  setValue: function(val) { this._value = val; },
  getRange: function(from, to) { return this._value.substring(0, this._cursorPos.ch); },
  getWrapperElement: function() { return { remove: jest.fn() }; },
  getHelper: function(cursor, type) {
    if (type === 'hint') {
      return () => ({
        list: [],
        from: { line: 0, ch: 0 },
        to: this._cursorPos
      });
    }
    return null;
  },
  on: jest.fn(),
  off: jest.fn(),
  refresh: jest.fn(),
  setOption: jest.fn()
};

CodeMirror.Pos = (line, ch) => ({ line, ch });
CodeMirror.registerHelper = jest.fn();
CodeMirror.commands = { autocomplete: jest.fn() };

module.exports = CodeMirror;