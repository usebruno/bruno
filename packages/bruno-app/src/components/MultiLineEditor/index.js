import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';

let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
}

class MultiLineEditor extends Component {
  constructor(props) {
    super(props);
    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.editorRef = React.createRef();
    this.variables = {};
  }
  componentDidMount() {
    // Initialize CodeMirror as a single line editor
    /** @type {import("codemirror").Editor} */
    const variables = getAllVariables(this.props.collection, this.props.item);

    this.editor = CodeMirror(this.editorRef.current, {
      lineWrapping: false,
      lineNumbers: false,
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      placeholder: this.props.placeholder,
      mode: 'brunovariables',
      brunoVarInfo: {
        variables
      },
      scrollbarStyle: null,
      tabindex: 0,
      extraKeys: {
        Enter: () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Ctrl-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Cmd-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Alt-Enter': () => {
          this.editor.setValue(this.editor.getValue() + '\n');
          this.editor.setCursor({ line: this.editor.lineCount(), ch: 0 });
        },
        'Shift-Enter': () => {
          this.editor.setValue(this.editor.getValue() + '\n');
          this.editor.setCursor({ line: this.editor.lineCount(), ch: 0 });
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
        'Cmd-F': () => {},
        'Ctrl-F': () => {},
        // Tabbing disabled to make tabindex work
        Tab: false,
        'Shift-Tab': false
      }
    });
    if (this.props.autocomplete) {
      this.editor.on('keyup', (cm, event) => {
        if (!cm.state.completionActive /*Enables keyboard navigation in autocomplete list*/ && event.keyCode != 13) {
          /*Enter - do not open autocomplete list just after item has been selected in it*/
          CodeMirror.commands.autocomplete(cm, CodeMirror.hint.anyword, { autocomplete: this.props.autocomplete });
        }
      });
    }
    this.editor.setValue(String(this.props.value) || '');
    this.editor.on('change', this._onEdit);
    this.addOverlay(variables);
  }

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.cachedValue = this.editor.getValue();
      if (this.props.onChange) {
        this.props.onChange(this.cachedValue);
      }
    }
  };

  componentDidUpdate(prevProps) {
    // Ensure the changes caused by this update are not interpreted as
    // user-input changes which could otherwise result in an infinite
    // event loop.
    this.ignoreChangeEvent = true;

    let variables = getAllVariables(this.props.collection, this.props.item);
    if (!isEqual(variables, this.variables)) {
      this.editor.options.brunoVarInfo.variables = variables;
      this.addOverlay(variables);
    }
    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
    }
    if (this.editorRef?.current) {
      this.editorRef.current.scrollTo(0, 10000);
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    this.editor.getWrapperElement().remove();
  }

  addOverlay = (variables) => {
    this.variables = variables;
    defineCodeMirrorBrunoVariablesMode(variables, 'text/plain');
    this.editor.setOption('mode', 'brunovariables');
  };

  render() {
    return <StyledWrapper ref={this.editorRef} className="single-line-editor"></StyledWrapper>;
  }
}
export default MultiLineEditor;
