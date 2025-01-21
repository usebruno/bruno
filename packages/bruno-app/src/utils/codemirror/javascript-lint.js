/**
 * MIT License
 * https://github.com/codemirror/codemirror5/blob/master/LICENSE
 *
 * Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others
 */

let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
  const { filter } = require('lodash');

  function validator(text, options) {
    if (!window.JSHINT) {
      if (window.console) {
        window.console.error('Error: window.JSHINT not defined, CodeMirror JavaScript linting cannot run.');
      }
      return [];
    }
    if (!options.indent)
      // JSHint error.character actually is a column index, this fixes underlining on lines using tabs for indentation
      options.indent = 1; // JSHint default value is 4
    JSHINT(text, options, options.globals);
    var errors = JSHINT.data().errors,
      result = [];

    /*
     * Filter out errors due to top level awaits
     * See https://github.com/usebruno/bruno/issues/1214
     *
     * Once JSHINT top level await support is added, this file can be removed
     * and we can use the default javascript-lint addon from codemirror
     */
    errors = filter(errors, (error) => {
      if (error.code === 'E058') {
        if (
          error.evidence &&
          error.evidence.includes('await') &&
          error.reason === 'Missing semicolon.' &&
          error.scope === '(main)'
        ) {
          return false;
        }

        return true;
      }

      return true;
    });

    if (errors) parseErrors(errors, result);

    return result;
  }

  CodeMirror.registerHelper('lint', 'javascript', validator);

  function parseErrors(errors, output) {
    for (var i = 0; i < errors.length; i++) {
      var error = errors[i];
      if (error) {
        if (error.line <= 0) {
          if (window.console) {
            window.console.warn('Cannot display JSHint error (invalid line ' + error.line + ')', error);
          }
          continue;
        }

        var start = error.character - 1,
          end = start + 1;
        if (error.evidence) {
          var index = error.evidence.substring(start).search(/.\b/);
          if (index > -1) {
            end += index;
          }
        }

        // Convert to format expected by validation service
        var hint = {
          message: error.reason,
          severity: error.code ? (error.code.startsWith('W') ? 'warning' : 'error') : 'error',
          from: CodeMirror.Pos(error.line - 1, start),
          to: CodeMirror.Pos(error.line - 1, end)
        };

        output.push(hint);
      }
    }
  }
}
