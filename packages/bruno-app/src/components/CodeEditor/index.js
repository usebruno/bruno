/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React, { createRef } from 'react';
import { debounce, isEqual } from 'lodash';
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
import {
  applyEditorState,
  captureEditorState,
  getDocKey,
  readPersistedEditorState,
  writePersistedEditorState
} from './state-persistence';
import { usePersistenceScope } from 'hooks/usePersistedState/PersistedScopeProvider';

const CodeMirror = require('codemirror');
window.jsonlint = jsonlint;
window.JSHINT = JSHINT;

const TAB_SIZE = 2;

class CodeEditor extends React.Component {
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

  // Thin wrapper around the pure getDocKey helper from state-persistence.js.
  // Kept on the class so the rest of the lifecycle code reads naturally.
  _getDocKey() {
    return getDocKey(this.props);
  }

  componentDidMount() {
    const variables = getAllVariables(this.props.collection, this.props.item);
    /**
     * No-op. We claim Cmd-Enter / Ctrl-Enter here only to suppress CodeMirror's
     * sublime keymap default (insertLineAfter), which would otherwise insert a
     * newline. sendRequest dispatch is owned by Mousetrap — the editor input has
     * the `mousetrap` class (added below) so the global
     * useKeybinding('sendRequest', …) in RequestTabPanel handles it, and only
     * in request tabs. Falling through with CodeMirror.Pass when onRun is absent
     * would re-introduce the newline in collection/folder-level editors.
     */
    const runShortcut = () => {};

    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      placeholder: '...',
      lineNumbers: true,
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
      // CM5 was constructed with props.value, so the editor already shows the
      // right content. Read this tab's previously persisted view state from
      // localStorage and apply it on top — restores folds, cursor, selection,
      // undo history, and scroll position.
      const docKey = getDocKey(this.props);
      this._currentDocKey = docKey;
      this.cachedValue = editor.getValue();
      applyEditorState(
        editor,
        readPersistedEditorState({ scope: this.props.persistenceScope, key: docKey }),
        this.cachedValue
      );

      editor.setOption('lint', this.props.mode && editor.getValue().trim().length > 0 ? this.lintOptions : false);
      editor.on('change', this._onEdit);

      // Persist view state immediately when the user folds or unfolds — without
      // this, a fold only gets saved on the next tab switch / unmount. That
      // makes the persistence feel "delayed" or random, especially across
      // sub-tab switches that don't change the docKey or unmount the editor.
      // Debounced so rapid fold/unfold (e.g. Cmd-Y to fold all) doesn't write
      // to localStorage on every event.
      this._persistViewStateDebounced = debounce(() => {
        if (!this.editor || !this._currentDocKey) return;
        writePersistedEditorState({
          scope: this.props.persistenceScope,
          key: this._currentDocKey,
          state: captureEditorState(this.editor)
        });
      }, 250);
      editor.on('fold', this._persistViewStateDebounced);
      editor.on('unfold', this._persistViewStateDebounced);

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

      // Add mousetrap class so Mousetrap captures shortcuts even when CodeMirror is focused
      const cmInput = editor.getInputField();
      if (cmInput) {
        cmInput.classList.add('mousetrap');
      }
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
    if (this.editor) {
      // Two distinct update paths:
      //   1. Doc key changed → tab switch → snapshot outgoing state, load new content, restore incoming state
      //   2. Same doc, value changed → external content update → setValue (view state resets)
      const newDocKey = getDocKey(this.props);
      const docKeyChanged = newDocKey !== this._currentDocKey;

      if (docKeyChanged) {
        // Path 1 — tab switch.
        // Snapshot the outgoing tab's view state to localStorage so a future
        // visit can restore it. Then setValue the incoming content and apply
        // any view state previously persisted for the incoming tab.
        if (this._currentDocKey) {
          writePersistedEditorState({
            scope: this.props.persistenceScope,
            key: this._currentDocKey,
            state: captureEditorState(this.editor)
          });
        }
        this.cachedValue = String(this?.props?.value ?? '');
        this.editor.setValue(String(this.props.value) || '');
        this._currentDocKey = newDocKey;
        applyEditorState(
          this.editor,
          readPersistedEditorState({ scope: this.props.persistenceScope, key: newDocKey }),
          this.cachedValue
        );
        // setValue resets the editor's mode-overlay state — re-apply the
        // brunovariables overlay and re-evaluate lint config for the new content.
        this.addOverlay();
        this.editor.setOption(
          'lint',
          this.props.mode && this.editor.getValue().trim().length > 0 ? this.lintOptions : false
        );
      } else if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue) {
        // Path 2 — same tab, new external value (e.g. a fresh response arrived
        // while this tab was active). Update content; view state resets because
        // line positions no longer correspond to anything. Invalidate the
        // persisted snapshot too, since the saved cursor/folds/history reflect
        // the prior content.
        const cursor = this.editor.getCursor();
        this.cachedValue = String(this?.props?.value ?? '');
        this.editor.setValue(String(this.props.value) || '');
        this.editor.setCursor(cursor);
        writePersistedEditorState({ scope: this.props.persistenceScope, key: this._currentDocKey, state: null });
      }
    }

    if (this.editor) {
      let variables = getAllVariables(this.props.collection, this.props.item);
      if (!isEqual(variables, this.variables)) {
        this.addOverlay();
      }

      // Update collection and item when they change
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

      // Snapshot view state to localStorage before tearing down the editor so
      // the next mount of a CodeEditor with this docKey can restore folds,
      // cursor, selection, undo history, and scroll position.
      if (this._currentDocKey) {
        writePersistedEditorState({
          scope: this.props.persistenceScope,
          key: this._currentDocKey,
          state: captureEditorState(this.editor)
        });
      }

      this.editor?._destroyLinkAware?.();
      this.editor.off('change', this._onEdit);

      // Tear down the debounced fold-persistence listener. Cancel any pending
      // call so it can't fire after we've already snapshotted state above.
      if (this._persistViewStateDebounced) {
        this.editor.off('fold', this._persistViewStateDebounced);
        this.editor.off('unfold', this._persistViewStateDebounced);
        this._persistViewStateDebounced.cancel?.();
      }

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
        aria-label="Code Editor"
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
        <div
          className={`editor-container${this.state.searchBarVisible ? ' search-bar-visible' : ''}`}
          ref={(node) => { this._node = node; }}
          style={{ height: '100%', width: '100%' }}
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

const CodeEditorWithPersistenceScope = React.forwardRef((props, ref) => {
  const persistenceScope = usePersistenceScope();
  return <CodeEditor {...props} persistenceScope={persistenceScope} ref={ref} />;
});

CodeEditorWithPersistenceScope.displayName = 'CodeEditor';

export default CodeEditorWithPersistenceScope;
