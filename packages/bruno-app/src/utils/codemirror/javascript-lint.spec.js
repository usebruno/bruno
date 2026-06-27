const { describe, it, expect, beforeEach, jest } = require('@jest/globals');
const { JSHINT } = require('jshint');

jest.mock('codemirror', () => {
  const codemirror = require('test-utils/mocks/codemirror');
  return codemirror;
});

describe('javascript lint', () => {
  let CodeMirror;
  let lintJavascript;

  beforeEach(() => {
    jest.resetModules();
    window.JSHINT = JSHINT;

    require('./javascript-lint');
    CodeMirror = require('codemirror');
    CodeMirror.Pos = (line, ch) => ({ line, ch });
    lintJavascript = CodeMirror.lint.javascript;
  });

  it('does not report top-level await dynamic import errors', () => {
    const result = lintJavascript('const helper = await import("./helper.mjs");');

    expect(result).toEqual([]);
  });

  it('does not report top-level await dynamic import errors split across lines', () => {
    const result = lintJavascript('const helper = await\n  import("./helper.mjs");');

    expect(result).toEqual([]);
  });

  it('does not report top-level await dynamic import errors with a comment between await and import', () => {
    const result = lintJavascript('const helper = await /* load esm */ import("./helper.mjs");');

    expect(result).toEqual([]);
  });

  it('continues to report unrelated syntax errors', () => {
    const result = lintJavascript('const value = ;');

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error'
        })
      ])
    );
  });
});
