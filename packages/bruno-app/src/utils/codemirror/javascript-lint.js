/**
 * MIT License
 * https://github.com/codemirror/codemirror5/blob/master/LICENSE
 *
 * Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others
 */

import { JSHINT } from 'jshint';

const CodeMirror = require('codemirror');
const { filter } = require('lodash');

function validator(text, options) {
  if (!window.JSHINT) {
    if (window.console) {
      window.console.error('Error: window.JSHINT not defined, CodeMirror JavaScript linting cannot run.');
    }
    return [];
  }
  
  // Set default options for Bruno
  const defaultOptions = {
    esversion: 11,
    expr: true,
    asi: true,
    undef: true,
    browser: true,
    devel: true,
    module: true,
    node: true,
    predef: {
      'bru': false,
      'req': false,
      'res': false,
      'test': false,
      'expect': false,
      'require': false,
      'module': false
    }
  };
  
  // Merge provided options with defaults
  options = Object.assign({}, defaultOptions, options);
  
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
   * - E058: Missing semicolon at top level await
   *  codemirror error: "Missing semicolon."
   * - W024: 'await' used as identifier (JSHint doesn't recognize top-level await syntax)
   *  codemirror error: "Expected an identifier and instead saw 'await' (a reserved word)."
   *
   * Once JSHINT top level await support is added, this file can be removed
   * and we can use the default javascript-lint addon from codemirror
   */
  errors = filter(errors, (error) => {
    if (error.code === 'E058' || error.code === 'W024') {
      if (
        error.evidence &&
        error.evidence.includes('await') &&
        error.scope === '(main)'
      ) {
        return false;
      }

      return true;
    }

    /*
     * Filter out errors due to atob/btoa redefinition
     * 
     * - W079: Redefinition of '{a}'
     *   This JSHint warning triggers when a variable name conflicts with a built-in global.
     *   We filter this for atob/btoa to allow explicit requires in Node.js environments
     *   where these browser functions might not be available.
     */
    if (error.code === 'W079' && (error.a === 'atob' || error.a === 'btoa')) {
      return false;
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
