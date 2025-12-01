import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { MaskedEditor } from 'utils/common/masked-editor';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { setupLinkAware } from 'utils/codemirror/linkAware';

const CodeMirror = require('codemirror');

class SingleLineEditor extends Component {
  constructor(props) {
    super(props);
    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.editorRef = React.createRef();
    this.variables = {};
    this.readOnly = props.readOnly || false;

    this.state = {
      maskInput: props.isSecret || false // Always mask the input by default (if it's a secret)
    };
  }

  componentDidMount() {
    // Initialize CodeMirror as a single line editor
    /** @type {import("codemirror").Editor} */
    const variables = getAllVariables(this.props.collection, this.props.item);

    const runHandler = () => {
      if (this.props.onRun) {
        this.props.onRun();
      }
    };
    const saveHandler = () => {
      if (this.props.onSave) {
        this.props.onSave();
      }
    };
    const noopHandler = () => { };

    this.editor = CodeMirror(this.editorRef.current, {
      placeholder: this.props.placeholder ?? '',
      lineWrapping: false,
      lineNumbers: false,
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      mode: 'brunovariables',
      brunoVarInfo: this.props.enableBrunoVarInfo !== false ? {
        variables,
        collection: this.props.collection,
        item: this.props.item
      } : false,
      scrollbarStyle: null,
      tabindex: 0,
      readOnly: this.props.readOnly,
      extraKeys: {
        Enter: runHandler,
        'Ctrl-Enter': runHandler,
        'Cmd-Enter': runHandler,
        'Alt-Enter': () => {
          if (this.props.allowNewlines) {
            this.editor.setValue(this.editor.getValue() + '\n');
            this.editor.setCursor({ line: this.editor.lineCount(), ch: 0 });
          } else if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Shift-Enter': runHandler,
        'Cmd-S': saveHandler,
        'Ctrl-S': saveHandler,
        'Cmd-F': noopHandler,
        'Ctrl-F': noopHandler,
        // Tabbing disabled to make tabindex work
        Tab: false,
        'Shift-Tab': false
      }
    });

    const getAllVariablesHandler = () => getAllVariables(this.props.collection, this.props.item);
    const getAnywordAutocompleteHints = () => this.props.autocomplete || [];

    // Setup AutoComplete Helper
    const autoCompleteOptions = {
      getAllVariables: getAllVariablesHandler,
      getAnywordAutocompleteHints,
      showHintsFor: this.props.showHintsFor || ['variables'],
      showHintsOnClick: this.props.showHintsOnClick
    };

    this.brunoAutoCompleteCleanup = setupAutoComplete(
      this.editor,
      autoCompleteOptions
    );

    this.editor.setValue(String(this.props.value ?? ''));
    this.editor.on('change', this._onEdit);
    this.editor.on('paste', this._onPaste);
    this.addOverlay(variables);
    this._enableMaskedEditor(this.props.isSecret);
    this.setState({ maskInput: this.props.isSecret });

    // Add newline arrow markers if enabled
    if (this.props.showNewlineArrow) {
      this._updateNewlineMarkers();
    }
    setupLinkAware(this.editor);
  }

  /** Enable or disable masking the rendered content of the editor */
  _enableMaskedEditor = (enabled) => {
    if (typeof enabled !== 'boolean') return;

    if (enabled == true) {
      if (!this.maskedEditor) this.maskedEditor = new MaskedEditor(this.editor, '*');
      this.maskedEditor.enable();
    } else {
      if (this.maskedEditor) {
        this.maskedEditor.disable();
        this.maskedEditor.destroy();
        this.maskedEditor = null;
      }
    }
  };

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.cachedValue = this.editor.getValue();
      if (this.props.onChange && (this.props.value !== this.cachedValue)) {
        this.props.onChange(this.cachedValue);
      }

      // Update newline markers after edit
      if (this.props.showNewlineArrow) {
        this._updateNewlineMarkers();
      }
    }
  };

  _onPaste = (_, event) => this.props.onPaste?.(event);

  componentDidUpdate(prevProps) {
    // Ensure the changes caused by this update are not interpreted as
    // user-input changes which could otherwise result in an infinite
    // event loop.
    this.ignoreChangeEvent = true;

    let variables = getAllVariables(this.props.collection, this.props.item);
    if (!isEqual(variables, this.variables)) {
      if (this.props.enableBrunoVarInfo !== false && this.editor.options.brunoVarInfo) {
        this.editor.options.brunoVarInfo.variables = variables;
      }
      this.addOverlay(variables);
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
    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value ?? ''));

      // Update newline markers after value change
      if (this.props.showNewlineArrow) {
        this._updateNewlineMarkers();
      }
    }
    if (!isEqual(this.props.isSecret, prevProps.isSecret)) {
      // If the secret flag has changed, update the editor to reflect the change
      this._enableMaskedEditor(this.props.isSecret);
      // also set the maskInput flag to the new value
      this.setState({ maskInput: this.props.isSecret });
    }
    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly);
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.editor) {
      if (this.editor?._destroyLinkAware) {
        this.editor._destroyLinkAware();
      }
      this.editor.off('change', this._onEdit);
      this.editor.off('paste', this._onPaste);
      this._clearNewlineMarkers();
      this.editor.getWrapperElement().remove();
      this.editor = null;
    }
    if (this.brunoAutoCompleteCleanup) {
      this.brunoAutoCompleteCleanup();
    }
    if (this.maskedEditor) {
      this.maskedEditor.destroy();
      this.maskedEditor = null;
    }
  }

  addOverlay = (variables) => {
    this.variables = variables;
    defineCodeMirrorBrunoVariablesMode(variables, 'text/plain', this.props.highlightPathParams, true);
    this.editor.setOption('mode', 'brunovariables');
  };

  /**
   * Update markers to show arrows for newlines
   */
  _updateNewlineMarkers = () => {
    if (!this.editor) return;

    // Clear existing markers
    this._clearNewlineMarkers();

    this.newlineMarkers = [];
    const content = this.editor.getValue();

    // Find all newlines and replace them with arrow widgets
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        const pos = this.editor.posFromIndex(i);
        const nextPos = this.editor.posFromIndex(i + 1);

        // Create a widget to display the arrow
        const arrow = document.createElement('span');
        arrow.className = 'newline-arrow';
        arrow.textContent = '↲';
        arrow.style.cssText = `
          color: #888;
          font-size: 8px;
          margin: 0 2px;
          vertical-align: middle;
          display: inline-block;
        `;

        // Mark the newline character and replace it with the arrow widget
        const marker = this.editor.markText(pos, nextPos, {
          replacedWith: arrow,
          handleMouseEvents: true
        });

        this.newlineMarkers.push(marker);
      }
    }
  };

  /**
   * Clear all newline markers
   */
  _clearNewlineMarkers = () => {
    if (this.newlineMarkers) {
      this.newlineMarkers.forEach((marker) => {
        try {
          marker.clear();
        } catch (e) {
          // Marker might already be cleared
        }
      });
      this.newlineMarkers = [];
    }
  };

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
      <button type="button" className="mx-2" onClick={() => this.toggleVisibleSecret()}>
        {this.state.maskInput === true ? (
          <IconEyeOff size={18} strokeWidth={2} />
        ) : (
          <IconEye size={18} strokeWidth={2} />
        )}
      </button>
    ) : null;
  };

  render() {
    return (
      <div className={`flex flex-row items-center w-full overflow-x-auto ${this.props.className}`}>
        <StyledWrapper
          ref={this.editorRef}
          className={`single-line-editor grow ${this.props.readOnly ? 'read-only' : ''}`}
          {...(this.props['data-testid'] ? { 'data-testid': this.props['data-testid'] } : {})}
        />
        <div className="flex items-center">
          {this.secretEye(this.props.isSecret)}
        </div>
      </div>
    );
  }
}
export default SingleLineEditor;
