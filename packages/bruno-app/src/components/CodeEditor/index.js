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
 * Per-tab Doc cache — why this exists:
 *
 * CodeMirror 5 splits an editor into two objects: the Editor (UI shell) and the
 * Doc (content + cursor + selection + undo history + TextMarkers like folds).
 * Previously, every tab switch called `editor.setValue(newContent)` which mutates
 * the current Doc and destroys all of that state. Users lost folds, cursor,
 * selection, and undo history on every switch.
 *
 * Instead, we keep one Doc per (item, mode, readOnly) combination in this cache.
 * On tab switch we call `editor.swapDoc(cachedDoc)` — CM5's native multi-document
 * API — which atomically swaps the entire Doc and preserves every piece of
 * per-tab state for free.
 *
 * Constraint: a Doc can be attached to only one editor at a time (CM5 enforces
 * this via `doc.cm`). See componentWillUnmount for how we release the Doc.
 */
const docCache = new Map();

const getOrCreateDoc = (key, content, mode) => {
  let doc = docCache.get(key);
  if (doc) {
    // The cached Doc may have stale content if props.value changed while this
    // tab was inactive (e.g. a new response arrived). Sync the content so the
    // user sees the latest value. This does reset fold state on this Doc, but
    // that's correct — fold positions for old content are meaningless.
    if (doc.getValue() !== content) {
      doc.setValue(content);
    }
    return doc;
  }
  doc = new CodeMirror.Doc(content, mode);
  docCache.set(key, doc);
  return doc;
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
      // CodeMirror(node, { value }) created a throwaway initial Doc from props.value.
      // Replace it with this tab's cached Doc so any previously preserved folds,
      // cursor, selection, and undo history are restored.
      const docKey = this._getDocKey();
      let doc = getOrCreateDoc(
        docKey,
        this.props.value || '',
        this.props.mode || 'application/ld+json'
      );
      // Defensive fallback: a CM5 Doc can only be attached to one editor at a
      // time. If the cached Doc is still attached to a previous (dead) editor —
      // e.g. React StrictMode double-mounting, or an unmount that skipped our
      // release logic — swapDoc would throw "document already in use". Replace
      // the cache entry with a fresh Doc in that case.
      if (doc.cm && doc.cm !== editor) {
        doc = new CodeMirror.Doc(this.props.value || '', this.props.mode || 'application/ld+json');
        docCache.set(docKey, doc);
      }
      if (doc !== editor.getDoc()) {
        editor.swapDoc(doc);
      }
      this._currentDocKey = docKey;
      this.cachedValue = editor.getValue();

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
      //   1. Doc key changed  → tab switch    → swapDoc (preserves all per-tab state)
      //   2. Same doc, value changed → external content update → setValue (state resets)
      const newDocKey = this._getDocKey();
      const docKeyChanged = newDocKey !== this._currentDocKey;

      if (docKeyChanged) {
        // Path 1 — tab switch. Look up (or create) the incoming tab's Doc and
        // swap it in. CM5 handles the rest: the outgoing Doc keeps its folds,
        // cursor, selection, undo history, and scroll in docCache for later;
        // the incoming Doc restores whatever state it had when last visited.
        let doc = getOrCreateDoc(
          newDocKey,
          this.props.value || '',
          this.props.mode || 'application/ld+json'
        );
        // Same defensive fallback as componentDidMount — see there for why.
        if (doc.cm && doc.cm !== this.editor) {
          doc = new CodeMirror.Doc(this.props.value || '', this.props.mode || 'application/ld+json');
          docCache.set(newDocKey, doc);
        }
        this.editor.swapDoc(doc);
        this._currentDocKey = newDocKey;
        this.cachedValue = this.editor.getValue();
        // swapDoc resets the editor's mode to whatever mode the incoming Doc
        // was created with (raw, not the 'brunovariables' overlay). Re-apply
        // the overlay and re-evaluate lint config for the new content.
        this.addOverlay();
        this.editor.setOption(
          'lint',
          this.props.mode && this.editor.getValue().trim().length > 0 ? this.lintOptions : false
        );
      } else if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue) {
        // Path 2 — same tab, new external value (e.g. a fresh response arrived
        // while this tab was active). Update the current Doc via setValue. Fold
        // state resets because line positions no longer correspond to anything.
        const cursor = this.editor.getCursor();
        this.cachedValue = String(this?.props?.value ?? '');
        this.editor.setValue(String(this.props.value) || '');
        this.editor.setCursor(cursor);
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

      this.editor?._destroyLinkAware?.();
      this.editor.off('change', this._onEdit);

      // Clean up lint error tooltip
      this.cleanupLintErrorTooltip?.();

      // Release the cached Doc before the editor goes away.
      //
      // A CM5 Doc can only be attached to one editor at a time (enforced via
      // doc.cm). If we destroy this editor without swapping the cached Doc out,
      // CM5 still considers the Doc attached — and the next CodeEditor to mount
      // for this tab will throw "This document is already in use." on swapDoc.
      //
      // Swapping in a fresh throwaway Doc clears doc.cm on our cached Doc while
      // leaving its content, folds, cursor, and undo history intact inside
      // docCache, ready to be attached to the next editor instance.
      try {
        this.editor.swapDoc(new CodeMirror.Doc('', this.props.mode || 'application/ld+json'));
      } catch (e) {
        // noop — swapDoc can fail if the editor is already in a bad state
      }

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
