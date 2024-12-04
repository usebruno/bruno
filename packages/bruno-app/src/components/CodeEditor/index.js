/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { isEqual, escapeRegExp } from 'lodash';
import { getEnvironmentVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';
import * as jsonlint from '@prantlf/jsonlint';
import { JSHINT } from 'jshint';
import stripJsonComments from 'strip-json-comments';

let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;
const TAB_SIZE = 2;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
  window.jsonlint = jsonlint;
  window.JSHINT = JSHINT;
  //This should be done dynamically if possible
  const hintWords = [
    'res',
    'res.status',
    'res.statusText',
    'res.headers',
    'res.body',
    'res.responseTime',
    'res.getStatus()',
    'res.getHeader(name)',
    'res.getHeaders()',
    'res.getBody()',
    'res.getResponseTime()',
    'req',
    'req.url',
    'req.method',
    'req.headers',
    'req.body',
    'req.timeout',
    'req.getUrl()',
    'req.setUrl(url)',
    'req.getMethod()',
    'req.getAuthMode()',
    'req.setMethod(method)',
    'req.getHeader(name)',
    'req.getHeaders()',
    'req.setHeader(name, value)',
    'req.setHeaders(data)',
    'req.getBody()',
    'req.setBody(data)',
    'req.setMaxRedirects(maxRedirects)',
    'req.getTimeout()',
    'req.setTimeout(timeout)',
    'req.getExecutionMode()',
    'bru',
    'bru.cwd()',
    'bru.getEnvName()',
    'bru.getProcessEnv(key)',
    'bru.hasEnvVar(key)',
    'bru.getEnvVar(key)',
    'bru.getFolderVar(key)',
    'bru.getCollectionVar(key)',
    'bru.setEnvVar(key,value)',
    'bru.deleteEnvVar(key)',
    'bru.hasVar(key)',
    'bru.getVar(key)',
    'bru.setVar(key,value)',
    'bru.deleteVar(key)',
    'bru.deleteAllVars()',
    'bru.setNextRequest(requestName)',
    'req.disableParsingResponseJson()',
    'bru.getRequestVar(key)',
    'bru.sleep(ms)',
    'bru.getGlobalEnvVar(key)',
    'bru.setGlobalEnvVar(key, value)'
  ];
  CodeMirror.registerHelper('hint', 'brunoJS', (editor, options) => {
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    let startBru = cursor.ch;
    let endBru = startBru;
    while (endBru < currentLine.length && /[\w.]/.test(currentLine.charAt(endBru))) ++endBru;
    while (startBru && /[\w.]/.test(currentLine.charAt(startBru - 1))) --startBru;
    let curWordBru = startBru != endBru && currentLine.slice(startBru, endBru);

    let start = cursor.ch;
    let end = start;
    while (end < currentLine.length && /[\w]/.test(currentLine.charAt(end))) ++end;
    while (start && /[\w]/.test(currentLine.charAt(start - 1))) --start;
    const jsHinter = CodeMirror.hint.javascript;
    let result = jsHinter(editor) || { list: [] };
    result.to = CodeMirror.Pos(cursor.line, end);
    result.from = CodeMirror.Pos(cursor.line, start);
    if (curWordBru) {
      hintWords.forEach((h) => {
        if (h.includes('.') == curWordBru.includes('.') && h.startsWith(curWordBru)) {
          result.list.push(curWordBru.includes('.') ? h.split('.')[1] : h);
        }
      });
      result.list?.sort();
    }
    return result;
  });
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}

export default class CodeEditor extends React.Component {
  constructor(props) {
    super(props);

    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.variables = {};
    this.searchResultsCountElementId = 'search-results-count';

    this.lintOptions = {
      esversion: 11,
      expr: true,
      asi: true
    };
  }

  componentDidMount() {
    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: TAB_SIZE,
      mode: this.props.mode || 'application/ld+json',
      keyMap: 'sublime',
      autoCloseBrackets: true,
      matchBrackets: true,
      showCursorWhenSelecting: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
      lint: this.lintOptions,
      readOnly: this.props.readOnly,
      scrollbarStyle: 'overlay',
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      extraKeys: {
        'Cmd-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Ctrl-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Cmd-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
          }
        },
        'Ctrl-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
          }
        },
        'Cmd-F': (cm) => {
          cm.execCommand('findPersistent');
          this._bindSearchHandler();
          this._appendSearchResultsCount();
        },
        'Ctrl-F': (cm) => {
          cm.execCommand('findPersistent');
          this._bindSearchHandler();
          this._appendSearchResultsCount();
        },
        'Cmd-H': 'replace',
        'Ctrl-H': 'replace',
        Tab: function (cm) {
          cm.getSelection().includes('\n') || editor.getLine(cm.getCursor().line) == cm.getSelection()
            ? cm.execCommand('indentMore')
            : cm.replaceSelection('  ', 'end');
        },
        'Shift-Tab': 'indentLess',
        'Ctrl-Space': 'autocomplete',
        'Cmd-Space': 'autocomplete',
        'Ctrl-Y': 'foldAll',
        'Cmd-Y': 'foldAll',
        'Ctrl-I': 'unfoldAll',
        'Cmd-I': 'unfoldAll',
        'Ctrl-/': 'toggleComment',
        'Cmd-/': 'toggleComment'
      },
      foldOptions: {
        widget: (from, to) => {
          var count = undefined;
          var internal = this.editor.getRange(from, to);
          if (this.props.mode == 'application/ld+json') {
            if (this.editor.getLine(from.line).endsWith('[')) {
              var toParse = '[' + internal + ']';
            } else var toParse = '{' + internal + '}';
            try {
              count = Object.keys(JSON.parse(toParse)).length;
            } catch (e) {}
          } else if (this.props.mode == 'application/xml') {
            var doc = new DOMParser();
            try {
              //add header element and remove prefix namespaces for DOMParser
              var dcm = doc.parseFromString(
                '<a> ' + internal.replace(/(?<=\<|<\/)\w+:/g, '') + '</a>',
                'application/xml'
              );
              count = dcm.documentElement.children.length;
            } catch (e) {}
          }
          return count ? `\u21A4${count}\u21A6` : '\u2194';
        }
      }
    }));
    CodeMirror.registerHelper('lint', 'json', function (text) {
      let found = [];
      if (!window.jsonlint) {
        if (window.console) {
          window.console.error('Error: window.jsonlint not defined, CodeMirror JSON linting cannot run.');
        }
        return found;
      }
      let jsonlint = window.jsonlint.parser || window.jsonlint;
      try {
        jsonlint.parse(stripJsonComments(text.replace(/(?<!"[^":{]*){{[^}]*}}(?![^"},]*")/g, '1')));
      } catch (error) {
        const { message, location } = error;
        const line = location?.start?.line;
        const column = location?.start?.column;
        if (line && column) {
          found.push({
            from: CodeMirror.Pos(line - 1, column),
            to: CodeMirror.Pos(line - 1, column),
            message
          });
        }
      }
      return found;
    });
    if (editor) {
      editor.setOption('lint', this.props.mode && editor.getValue().trim().length > 0 ? this.lintOptions : false);
      editor.on('change', this._onEdit);
      this.addOverlay();
    }
    if (this.props.mode == 'javascript') {
      editor.on('keyup', function (cm, event) {
        const cursor = editor.getCursor();
        const currentLine = editor.getLine(cursor.line);
        let start = cursor.ch;
        let end = start;
        while (end < currentLine.length && /[^{}();\s\[\]\,]/.test(currentLine.charAt(end))) ++end;
        while (start && /[^{}();\s\[\]\,]/.test(currentLine.charAt(start - 1))) --start;
        let curWord = start != end && currentLine.slice(start, end);
        // Qualify if autocomplete will be shown
        if (
          /^(?!Shift|Tab|Enter|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Meta|Alt|Home|End\s)\w*/.test(event.key) &&
          curWord.length > 0 &&
          !/\/\/|\/\*|.*{{|`[^$]*{|`[^{]*$/.test(currentLine.slice(0, end)) &&
          /(?<!\d)[a-zA-Z\._]$/.test(curWord)
        ) {
          CodeMirror.commands.autocomplete(cm, CodeMirror.hint.brunoJS, { completeSingle: false });
        }
      });
    }
  }

  componentDidUpdate(prevProps) {
    // Ensure the changes caused by this update are not interpreted as
    // user-input changes which could otherwise result in an infinite
    // event loop.
    this.ignoreChangeEvent = true;
    if (this.props.schema !== prevProps.schema && this.editor) {
      this.editor.options.lint.schema = this.props.schema;
      this.editor.options.hintOptions.schema = this.props.schema;
      this.editor.options.info.schema = this.props.schema;
      this.editor.options.jump.schema = this.props.schema;
      CodeMirror.signal(this.editor, 'change', this.editor);
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = this.props.value;
      this.editor.setValue(this.props.value);
    }

    if (this.editor) {
      let variables = getEnvironmentVariables(this.props.collection);
      if (!isEqual(variables, this.variables)) {
        this.addOverlay();
      }
    }

    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.off('change', this._onEdit);
      this.editor = null;
    }

    this._unbindSearchHandler();
  }

  render() {
    if (this.editor) {
      this.editor.refresh();
    }
    return (
      <StyledWrapper
        className="h-full w-full flex flex-col relative graphiql-container"
        aria-label="Code Editor"
        font={this.props.font}
        fontSize={this.props.fontSize}
        ref={(node) => {
          this._node = node;
        }}
      />
    );
  }

  addOverlay = () => {
    const mode = this.props.mode || 'application/ld+json';
    let variables = getEnvironmentVariables(this.props.collection);
    this.variables = variables;

    defineCodeMirrorBrunoVariablesMode(variables, mode);
    this.editor.setOption('mode', 'brunovariables');
  };

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.editor.setOption('lint', this.editor.getValue().trim().length > 0 ? this.lintOptions : false);
      this.cachedValue = this.editor.getValue();
      if (this.props.onEdit) {
        this.props.onEdit(this.cachedValue);
      }
    }
  };

  /**
   * Bind handler to search input to count number of search results
   */
  _bindSearchHandler = () => {
    const searchInput = document.querySelector('.CodeMirror-search-field');

    if (searchInput) {
      searchInput.addEventListener('input', this._countSearchResults);
    }
  };

  /**
   * Unbind handler to search input to count number of search results
   */
  _unbindSearchHandler = () => {
    const searchInput = document.querySelector('.CodeMirror-search-field');

    if (searchInput) {
      searchInput.removeEventListener('input', this._countSearchResults);
    }
  };

  /**
   * Append search results count to search dialog
   */
  _appendSearchResultsCount = () => {
    const dialog = document.querySelector('.CodeMirror-dialog.CodeMirror-dialog-top');

    if (dialog) {
      const searchResultsCount = document.createElement('span');
      searchResultsCount.id = this.searchResultsCountElementId;
      dialog.appendChild(searchResultsCount);

      this._countSearchResults();
    }
  };

  /**
   * Count search results and update state
   */
  _countSearchResults = () => {
    let count = 0;

    const searchInput = document.querySelector('.CodeMirror-search-field');

    if (searchInput && searchInput.value.length > 0) {
      // Escape special characters in search input to prevent RegExp crashes. Fixes #3051
      const text = new RegExp(escapeRegExp(searchInput.value), 'gi');
      const matches = this.editor.getValue().match(text);
      count = matches ? matches.length : 0;
    }

    const searchResultsCountElement = document.querySelector(`#${this.searchResultsCountElementId}`);

    if (searchResultsCountElement) {
      searchResultsCountElement.innerText = `${count} results`;
    }
  };
}
