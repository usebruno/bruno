/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import isEqual from 'lodash/isEqual';
import { getEnvironmentVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';
import * as jsonlint from '@prantlf/jsonlint';
import { JSHINT } from 'jshint';
import CodeMirrorSearch from 'components/CodeMirrorSearch';
let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
  window.jsonlint = jsonlint;
  window.JSHINT = JSHINT;
}

export default class CodeEditor extends React.Component {
  constructor(props) {
    super(props);

    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.variables = {};

    this.lintOptions = {
      esversion: 11,
      expr: true,
      asi: true
    };

    this.state = {
      searchBarVisible: false
    };
  }

  componentDidMount() {
    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
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
        'Shift-Cmd-M': () => {
          if (this.props.toggleFileMode) {
            this.props.toggleFileMode();
          }
        },
        'Shift-Ctrl-M': () => {
          if (this.props.toggleFileMode) {
            this.props.toggleFileMode();
          }
        },
        'Cmd-F': (cm) => {
          if (this.state.searchBarVisible) {
            this._node.querySelector('.bruno-search-bar > input').focus();
          }
          if (!this.state.searchBarVisible) {
            this.setState({ searchBarVisible: true });
          }
        },
        'Ctrl-F': (cm) => {
          if (this.state.searchBarVisible) {
            this._node.querySelector('.bruno-search-bar > input').focus();
          }
          if (!this.state.searchBarVisible) {
            this.setState({ searchBarVisible: true });
          }
        },
        'Cmd-H': 'replace',
        'Ctrl-H': 'replace',
        'Tab': function (cm) {
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
        'Esc': () => {
          if (this.state.searchBarVisible) {
            this.setState({ searchBarVisible: false });
          }
        }
      }
    }));
    if (editor) {
      editor.setOption('lint', this.props.mode && editor.getValue().trim().length > 0 ? this.lintOptions : false);
      editor.on('change', this._onEdit);
      editor.scrollTo(null, this.props.initialScroll);
      this._lastScrollTop = this.props.initialScroll || 0;
      editor.on('scroll', this._onScroll);
      this.addOverlay();
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
      const cursor = this.editor.getCursor();
      this.cachedValue = this.props.value;
      this.editor.setValue(this.props.value);
      this.editor.setCursor(cursor);
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

    if (this.props.initialScroll !== prevProps.initialScroll && this.editor) {
      this.editor.scrollTo(null, this.props.initialScroll);
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.off('change', this._onEdit);
      this.editor.off('scroll', this._onScroll);
      if (typeof this.props.onScroll === 'function') {
        this.props.onScroll(this._lastScrollTop || 0);
      }
      const editorElement = this.editor.getWrapperElement();
      if (editorElement && editorElement.parentNode) {
        editorElement.parentNode.removeChild(editorElement);
      }
      this.editor = null;
      this._node = null;
    }
  }

  render() {
    if (this.editor) {
      this.editor.refresh();
    }
    return (
      <StyledWrapper
        className="h-full w-full"
        aria-label="Code Editor"
        font={this.props.font}
      >
        <CodeMirrorSearch
          visible={this.state.searchBarVisible}
          editor={this.editor}
          onClose={() => this.setState({ searchBarVisible: false })}
        />
        <div
          ref={(node) => {
            this._node = node;
          }}
          style={{ height: '100%' }}
        />
      </StyledWrapper>
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

  _onScroll = () => {
    if (!this.editor) return;
    const wrapper = this.editor.getWrapperElement();
    if (wrapper && wrapper.offsetParent === null) return;
    this._lastScrollTop = this.editor.getScrollInfo().top;
    if (typeof this.props.onScroll === 'function') {
      this.props.onScroll(this._lastScrollTop);
    }
  };
}
