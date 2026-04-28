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

/*
 * Per-tab editor state persistence — why this exists:
 *
 * Every tab switch causes CodeMirror's setValue() to wipe folds, cursor,
 * selection, undo history, and scroll position. To preserve them, we serialize
 * the relevant pieces to localStorage under a stable key for each editor and
 * re-apply them on mount / tab switch. CodeMirror exposes a JSON-serializable
 * representation of its undo stack via getHistory()/setHistory(), which is what
 * makes Cmd-Z continue working across switches.
 *
 * Note: we deliberately do NOT persist the content itself — the canonical value
 * lives in Redux (props.value). We only persist the editor's "view" state on
 * top of that content. If content has drifted between save and restore, fold
 * positions are applied leniently (foldCode silently no-ops on invalid lines)
 * and history is skipped to avoid an inconsistent undo stack.
 */
const STORAGE_PREFIX = 'persisted::codeeditor::';

const readPersistedEditorState = (key) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writePersistedEditorState = (key, state) => {
  try {
    if (state == null) {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } else {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
    }
  } catch {
    // localStorage may be unavailable or full — silently ignore
  }
};

// Removes every persisted CodeEditor entry whose docKey starts with `${tabUid}:`.
// Called from the closeTabs thunk so a closed tab doesn't leak its editor state
// (folds, history, cursor, scroll) in localStorage forever.
export const clearCodeEditorPersistedState = (tabUid) => {
  if (!tabUid) return;
  try {
    const prefix = `${STORAGE_PREFIX}${tabUid}:`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage may be unavailable — silently ignore
  }
};

const captureEditorState = (editor) => {
  if (!editor) return null;
  const doc = editor.getDoc();
  const folds = editor
    .getAllMarks()
    .filter((m) => m.__isFold)
    .map((m) => m.find())
    .filter(Boolean)
    .map((range) => range.from);
  return {
    contentLength: doc.getValue().length,
    cursor: doc.getCursor(),
    selections: doc.listSelections(),
    history: doc.getHistory(),
    folds,
    scrollY: editor.getScrollInfo().top
  };
};

const applyEditorState = (editor, state, currentContent) => {
  if (!editor || !state) return;
  const doc = editor.getDoc();
  const contentMatches = state.contentLength === (currentContent || '').length;

  // History/cursor/selection only make sense if content didn't drift — applying
  // a stale undo stack to different content would let Cmd-Z replay edits that
  // no longer correspond to anything visible.
  if (contentMatches) {
    if (state.history) {
      try { doc.setHistory(state.history); } catch {}
    }
    if (state.cursor) {
      try { doc.setCursor(state.cursor); } catch {}
    }
    if (state.selections && state.selections.length) {
      try { doc.setSelections(state.selections); } catch {}
    }
  }
  // Folds are cheap and lenient — try them either way.
  if (state.folds && state.folds.length) {
    editor.operation(() => {
      state.folds.forEach((from) => {
        try { editor.foldCode(from); } catch {}
      });
    });
  }
  if (state.scrollY != null) {
    try { editor.scrollTo(null, state.scrollY); } catch {}
  }
};

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

  // Identifies which Doc in docCache belongs to this CodeEditor instance.
  //
  // Callers can pass an explicit `docKey` prop when the auto-derived key would
  // collide — e.g. Pre-Request vs Post-Response script editors share the same
  // item/mode/readOnly and need an extra disambiguator.
  //
  // Auto-derived parts:
  //   id       — distinguishes different tabs (requests or collections)
  //   mode     — distinguishes editors within the same tab (e.g. JSON body vs JS script)
  //   readOnly — distinguishes response viewer (ro) from body editor (rw) when modes match
  _getDocKey() {
    if (this.props.docKey) return this.props.docKey;
    const id = this.props.item?.uid || this.props.collection?.uid || 'default';
    const mode = this.props.mode || 'default';
    const readOnly = this.props.readOnly ? 'ro' : 'rw';
    return `${id}:${mode}:${readOnly}`;
  }

  componentDidMount() {
    const variables = getAllVariables(this.props.collection, this.props.item);

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
      const docKey = this._getDocKey();
      this._currentDocKey = docKey;
      this.cachedValue = editor.getValue();
      applyEditorState(editor, readPersistedEditorState(docKey), this.cachedValue);

      editor.setOption('lint', this.props.mode && editor.getValue().trim().length > 0 ? this.lintOptions : false);
      editor.on('change', this._onEdit);
      editor.scrollTo(null, this.props.initialScroll);
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
      const newDocKey = this._getDocKey();
      const docKeyChanged = newDocKey !== this._currentDocKey;

      if (docKeyChanged) {
        // Path 1 — tab switch.
        // Snapshot the outgoing tab's view state to localStorage so a future
        // visit can restore it. Then setValue the incoming content and apply
        // any view state previously persisted for the incoming tab.
        if (this._currentDocKey) {
          writePersistedEditorState(this._currentDocKey, captureEditorState(this.editor));
        }
        this.cachedValue = String(this?.props?.value ?? '');
        this.editor.setValue(String(this.props.value) || '');
        this._currentDocKey = newDocKey;
        applyEditorState(this.editor, readPersistedEditorState(newDocKey), this.cachedValue);
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
        writePersistedEditorState(this._currentDocKey, null);
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
        this.props.onScroll(this.editor);
      }

      // Snapshot view state to localStorage before tearing down the editor so
      // the next mount of a CodeEditor with this docKey can restore folds,
      // cursor, selection, undo history, and scroll position.
      if (this._currentDocKey) {
        writePersistedEditorState(this._currentDocKey, captureEditorState(this.editor));
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
