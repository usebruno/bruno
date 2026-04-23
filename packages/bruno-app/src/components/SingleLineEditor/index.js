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
    this.cachedValue = props.value || '';
    this.editorRef = React.createRef();
    this.variables = {};
    this.readOnly = props.readOnly || false;

    this.state = {
      maskInput: props.isSecret || false
    };
  }

  componentDidMount() {
    const variables = getAllVariables(this.props.collection, this.props.item);

    const runHandler = () => {
      if (this.props.onRun) {
        this.props.onRun();
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
      tabindex: -1, // Prevent hidden editor from receiving keyboard focus
      readOnly: this.props.readOnly,
      extraKeys: {
        'Enter': runHandler,
        'Alt-Enter': () => {
          if (this.props.allowNewlines) {
            this.editor.setValue(this.editor.getValue() + '\n');
            this.editor.setCursor({ line: this.editor.lineCount(), ch: 0 });
          } else if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Cmd-F': noopHandler,
        'Ctrl-F': noopHandler,
        'Tab': false,
        'Shift-Tab': false
      }
    });

    const getAllVariablesHandler = () => getAllVariables(this.props.collection, this.props.item);
    const getAnywordAutocompleteHints = () => this.props.autocomplete || [];

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
    this.editor.on('blur', this._onBlur);
    this.addOverlay(variables);
    this._enableMaskedEditor(this.props.isSecret);
    this.setState({ maskInput: this.props.isSecret });

    if (this.props.showNewlineArrow) {
      this._updateNewlineMarkers();
    }
    setupLinkAware(this.editor);
  }

  _enableMaskedEditor = (enabled) => {
    if (typeof enabled !== 'boolean') return;

    if (enabled === true) {
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

  _onBlur = () => {
    if (this.editor) {
      this.editor.setCursor(this.editor.getCursor());
    }
  };

  _onEdit = (value) => {
    if (!this.ignoreChangeEvent && this.editor) {
      // If a value is passed directly (from textarea), update the editor
      if (value !== undefined && value !== this.editor.getValue()) {
        this.editor.setValue(value);
      }

      this.cachedValue = this.editor.getValue();
      if (this.props.onChange && (this.props.value !== this.cachedValue)) {
        this.props.onChange(this.cachedValue);
      }

      if (this.props.showNewlineArrow) {
        this._updateNewlineMarkers();
      }
    }
  };

  _onPaste = (_, event) => this.props.onPaste?.(event);

  componentDidUpdate(prevProps) {
    this.ignoreChangeEvent = true;

    let variables = getAllVariables(this.props.collection, this.props.item);
    if (!isEqual(variables, this.variables)) {
      if (this.props.enableBrunoVarInfo !== false && this.editor.options.brunoVarInfo) {
        this.editor.options.brunoVarInfo.variables = variables;
      }
      this.addOverlay(variables);
    }

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
      const cursor = this.editor.getCursor();
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
      this.editor.setCursor(cursor);
      if (this.maskedEditor && this.maskedEditor.isEnabled()) {
        this.maskedEditor.update();
      }

      if (this.props.showNewlineArrow) {
        this._updateNewlineMarkers();
      }
    }
    if (!isEqual(this.props.isSecret, prevProps.isSecret)) {
      this._enableMaskedEditor(this.props.isSecret);
      this.setState({ maskInput: this.props.isSecret });
    }
    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly);
    }
    if (this.props.placeholder !== prevProps.placeholder && this.editor) {
      this.editor.setOption('placeholder', this.props.placeholder);
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
      this.editor.off('blur', this._onBlur);
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

  _updateNewlineMarkers = () => {
    if (!this.editor) return;
    this._clearNewlineMarkers();

    this.newlineMarkers = [];
    const content = this.editor.getValue();

    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        const pos = this.editor.posFromIndex(i);
        const nextPos = this.editor.posFromIndex(i + 1);

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

        const marker = this.editor.markText(pos, nextPos, {
          replacedWith: arrow,
          handleMouseEvents: true
        });

        this.newlineMarkers.push(marker);
      }
    }
  };

  _clearNewlineMarkers = () => {
    if (this.newlineMarkers) {
      this.newlineMarkers.forEach((marker) => {
        try {
          marker.clear();
        } catch (e) { }
      });
      this.newlineMarkers = [];
    }
  };

  toggleVisibleSecret = () => {
    const isVisible = !this.state.maskInput;
    this.setState({ maskInput: isVisible });
    this._enableMaskedEditor(isVisible);
  };

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
    // Accessibility: Use bullets for screen readers when input is masked
    const valueToDisplay = this.state.maskInput
      ? '•'.repeat((this.props.value || '').length)
      : (this.props.value || '');

    return (
      <div className={`flex flex-row items-center w-full overflow-x-auto ${this.props.className}`}>
        <div className="grow relative" style={{ display: 'flex', alignItems: 'center' }}>
          {/* Visual Layer: CodeMirror container hidden from the accessibility tree */}
          <StyledWrapper
            ref={this.editorRef}
            aria-hidden="true"
            className={`single-line-editor grow ${this.props.readOnly ? 'read-only' : ''}`}
            $isCompact={this.props.isCompact}
            {...(this.props['data-testid'] ? { 'data-testid': this.props['data-testid'] } : {})}
          />

          {/* Accessibility Layer: Transparent textarea for native input and screen reader support */}
          <textarea
            id="accessible-single-line-editor"
            className="mousetrap"
            rows="1"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              zIndex: 10,
              resize: 'none',
              outline: 'none',
              border: 'none',
              background: 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              caretColor: this.props.theme === 'dark' ? 'white' : 'black'
            }}
            value={valueToDisplay}
            aria-label={this.props.placeholder || 'Input'}
            readOnly={this.props.readOnly}
            onPaste={(e) => {
              if (typeof this._onPaste === 'function') {
                this._onPaste(null, e);
              }
            }}
            onChange={(e) => {
              const val = e.target.value.replace(/[\r\n]/g, '');
              // Use internal method to sync with CodeMirror and trigger linting/validation
              if (typeof this._onEdit === 'function') {
                this._onEdit(val);
              }
            }}
            onKeyDown={(e) => {
              const isShortcut = e.ctrlKey || e.metaKey || e.altKey;
              const isFunctionKey = e.key.startsWith('F');
              const isEscape = e.key === 'Escape';

              // Support Alt+Enter for manual newline injection if allowed by props
              if (e.key === 'Enter' && e.altKey && this.props.allowNewlines) {
                const newValue = (this.props.value || '') + '\n';
                if (typeof this._onEdit === 'function') {
                  this._onEdit(newValue);
                }
                return;
              }

              // Trigger execution on Enter
              if (e.key === 'Enter' && this.props.onRun) {
                this.props.onRun();
                return;
              }

              // Let global shortcuts and navigation keys bubble up to Mousetrap/App level
              if (isShortcut || isFunctionKey || isEscape) {
                return;
              }

              /* Prevent duplicate processing by hidden CodeMirror for standard typing */
              e.stopPropagation();
            }}
          />
        </div>

        <div className="flex items-center">
          {this.secretEye(this.props.isSecret)}
        </div>
      </div>
    );
  }
}

export default SingleLineEditor;
