/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React, { createRef } from 'react';
import { isEqual, escapeRegExp } from 'lodash';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { setupAutoComplete, showRootHints } from 'utils/codemirror/autocomplete';
import StyledWrapper from './StyledWrapper';
import * as jsonlint from '@prantlf/jsonlint';
import { JSHINT } from 'jshint';
import stripJsonComments from 'strip-json-comments';
import { getAllVariables } from 'utils/collections';
import { setupLinkAware } from 'utils/codemirror/linkAware';
import { setupLintErrorTooltip } from 'utils/codemirror/lint-errors';
import CodeMirrorSearch from 'components/CodeMirrorSearch/index';

const CodeMirror = require('codemirror');
window.jsonlint = jsonlint;
window.JSHINT = JSHINT;

const TAB_SIZE = 2;

export default class CodeEditor extends React.Component {
  constructor(props) {
    super(props);

    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.variables = {};
    this.searchResultsCountElementId = 'search-results-count';
    this.searchBarRef = createRef();

    this.lintOptions = {
      esversion: 11,
      expr: true,
      asi: true,
      highlightLines: true
    };

    this.state = {
      searchBarVisible: false
    };
  }

  componentDidMount() {
    const variables = getAllVariables(this.props.collection, this.props.item);
    const runShortcut = () => {
      if (this.props.onRun) {
        this.props.onRun();
        return;
      }
      return CodeMirror.Pass;
    };

    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      placeholder: '...',
      lineNumbers: true,
      tabindex: -1,
      inputStyle: 'textarea',
      resetSelectionOnContextMenu: false,
      spellcheck: true,
      selectionsMayTouchBoundary: true,
      lineWrapping: this.props.enableLineWrapping ?? true,
      tabSize: TAB_SIZE,
      mode: this.props.mode || 'application/ld+json',
      brunoVarInfo: this.props.enableBrunoVarInfo !== false ? {
        variables,
        collection: this.props.collection,
        item: this.props.item
      } : false,
      keyMap: 'sublime',
      autoCloseBrackets: true,
      matchBrackets: true,
      showCursorWhenSelecting: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      lint: this.lintOptions,
      readOnly: this.props.readOnly,
      scrollbarStyle: 'overlay',
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      extraKeys: {
        'Cmd-F': (cm) => {
          this.setState({ searchBarVisible: true }, () => {
            this.searchBarRef.current?.focus();
          });
        },
        'Ctrl-F': (cm) => {
          this.setState({ searchBarVisible: true }, () => {
            this.searchBarRef.current?.focus();
          });
        },
        'Cmd-H': this.props.readOnly ? false : 'replace',
        'Ctrl-H': this.props.readOnly ? false : 'replace',
        'Cmd-Enter': runShortcut,
        'Ctrl-Enter': runShortcut,
        'Tab': function (cm) {
          cm.getSelection().includes('\n') || editor.getLine(cm.getCursor().line) == cm.getSelection()
            ? cm.execCommand('indentMore')
            : cm.replaceSelection('  ', 'end');
        },
        'Shift-Tab': 'indentLess',
        'Ctrl-Space': (cm) => {
          showRootHints(cm, this.props.showHintsFor);
        },
        'Cmd-Space': (cm) => {
          showRootHints(cm, this.props.showHintsFor);
        },
        'Ctrl-Y': 'foldAll',
        'Cmd-Y': 'foldAll',
        'Ctrl-I': 'unfoldAll',
        'Cmd-I': 'unfoldAll',
        'Ctrl-/': () => {
          if (['application/ld+json', 'application/json'].includes(this.props.mode)) {
            this.editor.toggleComment({ lineComment: '//', blockComment: '/*' });
          } else {
            this.editor.toggleComment();
          }
        },
        'Cmd-/': () => {
          if (['application/ld+json', 'application/json'].includes(this.props.mode)) {
            this.editor.toggleComment({ lineComment: '//', blockComment: '/*' });
          } else {
            this.editor.toggleComment();
          }
        },
        'Esc': () => {
          if (this.state.searchBarVisible) {
            this.setState({ searchBarVisible: false });
          }
        }
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
              // add header element and remove prefix namespaces for DOMParser
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
      editor.scrollTo(null, this.props.initialScroll);
      this._lastScrollTop = this.props.initialScroll || 0;
      editor.on('scroll', () => {
        const wrapper = editor.getWrapperElement();
        if (wrapper && wrapper.offsetParent === null) return;
        this._lastScrollTop = editor.getScrollInfo().top;
        if (this.props.onScroll && typeof this.props.onScroll === 'function') {
          this.props.onScroll(this._lastScrollTop);
        }
      });
      this.addOverlay();

      const getAllVariablesHandler = () => getAllVariables(this.props.collection, this.props.item);

      // Setup AutoComplete Helper for all modes
      const autoCompleteOptions = {
        showHintsFor: this.props.showHintsFor,
        getAllVariables: getAllVariablesHandler
      };

      this.brunoAutoCompleteCleanup = setupAutoComplete(
        editor,
        autoCompleteOptions
      );

      setupLinkAware(editor);

      // Setup lint error tooltip on line number hover
      this.cleanupLintErrorTooltip = setupLintErrorTooltip(editor);
    }
  }

  componentDidUpdate(prevProps) {
    this.ignoreChangeEvent = true;

    if (this.props.schema !== prevProps.schema && this.editor) {
      this.editor.options.lint.schema = this.props.schema;
      this.editor.options.hintOptions.schema = this.props.schema;
      this.editor.options.info.schema = this.props.schema;
      this.editor.options.jump.schema = this.props.schema;
      CodeMirror.signal(this.editor, 'change', this.editor);
    }

    /* Accessibility-aware synchronization:
      If the accessible textarea is focused, we update the CodeMirror value
      without resetting the cursor to prevent focus theft and screen reader interruption.
    */
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = String(this?.props?.value ?? '');
      const isAccessibleFocused = document.activeElement?.id === 'accessible-bruno-editor';

      if (isAccessibleFocused) {
        // Update background editor for syntax highlighting without stealing focus
        this.editor.setValue(String(this.props.value) || '');
      } else {
        // Standard sync for programmatic updates or mouse interaction
        const cursor = this.editor.getCursor();
        this.editor.setValue(String(this.props.value) || '');
        this.editor.setCursor(cursor);
      }
    }

    if (this.editor) {
      let variables = getAllVariables(this.props.collection, this.props.item);
      if (!isEqual(variables, this.variables)) {
        this.addOverlay();
      }

      if (this.props.enableBrunoVarInfo !== false && this.editor.options.brunoVarInfo) {
        if (!isEqual(this.props.collection, this.editor.options.brunoVarInfo.collection)) {
          this.editor.options.brunoVarInfo.collection = this.props.collection;
        }
        if (!isEqual(this.props.item, this.editor.options.brunoVarInfo.item)) {
          this.editor.options.brunoVarInfo.item = this.props.item;
        }
      }
    }

    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }

    if (this.props.initialScroll !== prevProps.initialScroll) {
      this.editor.scrollTo(null, this.props.initialScroll);
    }

    if (this.props.enableLineWrapping !== prevProps.enableLineWrapping) {
      this.editor.setOption('lineWrapping', this.props.enableLineWrapping);
    }

    if (this.props.mode !== prevProps.mode) {
      this.editor.setOption('mode', this.props.mode);
    }

    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly);
    }

    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.editor) {
      if (this.props.onScroll) {
        this.props.onScroll(this._lastScrollTop);
      }

      this.editor?._destroyLinkAware?.();
      this.editor.off('change', this._onEdit);

      // Clean up lint error tooltip
      this.cleanupLintErrorTooltip?.();

      const wrapper = this.editor.getWrapperElement();
      wrapper?.parentNode?.removeChild(wrapper);

      this.editor = null;
    }
  }

  render() {
    if (this.editor) {
      this.editor.refresh();
    }

    return (
      <StyledWrapper
        className={`h-full w-full flex flex-col relative graphiql-container ${this.props.readOnly ? 'read-only' : ''}`}
        font={this.props.font}
        fontSize={this.props.fontSize}
      >
        <CodeMirrorSearch
          ref={(node) => {
            if (!node) return;
            this.searchBarRef.current = node;
          }}
          visible={this.state.searchBarVisible}
          editor={this.editor}
          onClose={() => this.setState({ searchBarVisible: false })}
        />

        {/* Visual Layer: CodeMirror container is hidden from the accessibility tree
          to prevent screen readers from navigating its complex, non-semantic DOM.
        */}
        <div
          className={`editor-container${this.state.searchBarVisible ? ' search-bar-visible' : ''}`}
          ref={(node) => { this._node = node; }}
          style={{ height: '100%', width: '100%' }}
          aria-hidden="true"
        />

        {/* Accessibility Layer: A transparent textarea handles focus and input.
          This allows screen readers (like NVDA/JAWS) to use native text navigation
          while CodeMirror provides syntax highlighting in the layer below.
        */}
        <textarea
          id="accessible-bruno-editor"
          className="mousetrap"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            zIndex: 20,
            resize: 'none',
            outline: 'none',
            border: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: 'white'
          }}
          value={this.props.value || ''}
          aria-label={this.props.ariaLabel || 'Code Editor'}
          readOnly={this.props.readOnly}
          onChange={(e) => {
            if (typeof this._onEdit === 'function') {
              this._onEdit(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            const isShortcut = e.ctrlKey || e.metaKey || e.altKey;
            const isFunctionKey = e.key.startsWith('F');
            const isEscape = e.key === 'Escape';

            if (isShortcut || isFunctionKey || isEscape) {
              return;
            }

            e.stopPropagation();
          }}
        />
      </StyledWrapper>
    );
  }

  addOverlay = () => {
    const mode = this.props.mode || 'application/ld+json';
    let variables = getAllVariables(this.props.collection, this.props.item);
    this.variables = variables;

    // Update brunoVarInfo with latest variables
    if (this.props.enableBrunoVarInfo !== false && this.editor.options.brunoVarInfo) {
      this.editor.options.brunoVarInfo.variables = variables;
    }

    defineCodeMirrorBrunoVariablesMode(variables, mode, false, this.props.enableVariableHighlighting);
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
}
