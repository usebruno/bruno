import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import { MaskedEditor } from 'utils/common/masked-editor';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';

const CodeMirror = require('codemirror');

class MultiLineEditor extends Component {
  constructor(props) {
    super(props);
    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.editorRef = React.createRef();
    this.variables = {};

    this.state = {
      maskInput: props.isSecret || false // Always mask the input by default (if it's a secret)
    };
  }
  componentDidMount() {
    // Initialize CodeMirror as a single line editor
    /** @type {import("codemirror").Editor} */
    const variables = getAllVariables(this.props.collection, this.props.item);

    this.editor = CodeMirror(this.editorRef.current, {
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      placeholder: this.props.placeholder,
      mode: 'brunovariables',
      brunoVarInfo: {
        variables
      },
      readOnly: this.props.readOnly ? 'nocursor' : false,
      tabindex: 0,
      extraKeys: {
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


    const getAllVariablesHandler = () => getAllVariables(this.props.collection, this.props.item);
    const getAnywordAutocompleteHints = () => this.props.autocomplete || [];
    
    // Setup AutoComplete Helper
    const autoCompleteOptions = {
      showHintsFor: ['variables'],
      getAllVariables: getAllVariablesHandler,
      getAnywordAutocompleteHints
    };

    this.brunoAutoCompleteCleanup = setupAutoComplete(
      this.editor,
      autoCompleteOptions
    );
    
    this.editor.setValue(String(this.props.value) || '');
    this.editor.on('change', this._onEdit);
    this.addOverlay(variables);

    // Initialize masking if this is a secret field
    this.setState({ maskInput: this.props.isSecret });
    this._enableMaskedEditor(this.props.isSecret);
  }

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.cachedValue = this.editor.getValue();
      if (this.props.onChange) {
        this.props.onChange(this.cachedValue);
      }
    }
  };

  /** Enable or disable masking the rendered content of the editor */
  _enableMaskedEditor = (enabled) => {
    if (typeof enabled !== 'boolean') return;

    if (enabled == true) {
      if (!this.maskedEditor) this.maskedEditor = new MaskedEditor(this.editor, '*');
      this.maskedEditor.enable();
    } else {
      this.maskedEditor?.disable();
      this.maskedEditor = null;
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
    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly ? 'nocursor' : false);
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
    }
    if (!isEqual(this.props.isSecret, prevProps.isSecret)) {
      // If the secret flag has changed, update the editor to reflect the change
      this._enableMaskedEditor(this.props.isSecret);
      // also set the maskInput flag to the new value
      this.setState({ maskInput: this.props.isSecret });
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.brunoAutoCompleteCleanup) {
      this.brunoAutoCompleteCleanup();
    }
    if (this.maskedEditor) {
      this.maskedEditor.destroy();
      this.maskedEditor = null;
    }
    this.editor.getWrapperElement().remove();
  }

  addOverlay = (variables) => {
    this.variables = variables;
    defineCodeMirrorBrunoVariablesMode(variables, 'text/plain', false, true);
    this.editor.setOption('mode', 'brunovariables');
  };

  /**
   * @brief Toggle the visibility of the secret value
   */
  toggleVisibleSecret = () => {
    const isVisible = !this.state.maskInput;
    this.setState({ maskInput: isVisible });
    this._enableMaskedEditor(isVisible);
  };

  /**
   * @brief Eye icon to show/hide the secret value
   * @returns ReactComponent The eye icon
   */
  secretEye = (isSecret) => {
    return isSecret === true ? (
      <button className="mx-2" onClick={() => this.toggleVisibleSecret()}>
        {this.state.maskInput === true ? (
          <IconEyeOff size={18} strokeWidth={2} />
        ) : (
          <IconEye size={18} strokeWidth={2} />
        )}
      </button>
    ) : null;
  };

  render() {
    const wrapperClass = `multi-line-editor grow ${this.props.readOnly ? 'read-only' : ''}`;
    return (
      <div className={`flex flex-row justify-between w-full overflow-x-auto ${this.props.className}`}>
        <StyledWrapper ref={this.editorRef} className={wrapperClass} />
        {this.secretEye(this.props.isSecret)}
      </div>
    );
  }
}
export default MultiLineEditor;
