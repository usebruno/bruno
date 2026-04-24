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
    this.textareaRef = React.createRef();
    this.variables = {};
    this.readOnly = props.readOnly || false;

    // Instance-specific ID for screen reader consistency
    this.editorId = `accessible-single-line-${Math.random().toString(36).substring(2, 9)}`;

    this.state = {
      maskInput: props.isSecret || false
    };
  }

  componentDidMount() {
    const variables = getAllVariables(this.props.collection, this.props.item);
    const runHandler = () => this.props.onRun?.();

    this.editor = CodeMirror(this.editorRef.current, {
      value: String(this.props.value ?? ''),
      placeholder: this.props.placeholder ?? '',
      lineWrapping: false,
      lineNumbers: false,
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      mode: 'brunovariables',
      brunoVarInfo: this.props.enableBrunoVarInfo !== false ? {
        variables, collection: this.props.collection, item: this.props.item
      } : false,
      scrollbarStyle: null,
      tabindex: -1,
      readOnly: this.props.readOnly,
      extraKeys: {
        'Enter': runHandler,
        'Alt-Enter': () => {
          if (this.props.allowNewlines) {
            this.editor.setValue(this.editor.getValue() + '\n');
            this.editor.setCursor({ line: this.editor.lineCount(), ch: 0 });
          } else {
            runHandler();
          }
        },
        'Tab': false,
        'Shift-Tab': false
      }
    });

    const autoCompleteOptions = {
      getAllVariables: () => getAllVariables(this.props.collection, this.props.item),
      getAnywordAutocompleteHints: () => this.props.autocomplete || [],
      showHintsFor: this.props.showHintsFor || ['variables'],
      showHintsOnClick: this.props.showHintsOnClick
    };

    this.brunoAutoCompleteCleanup = setupAutoComplete(this.editor, autoCompleteOptions);
    this.editor.on('change', this._onEdit);
    this.editor.on('paste', this._onPaste);
    this.editor.on('blur', this._onBlur);

    this.addOverlay(variables);
    this._enableMaskedEditor(this.props.isSecret);
    setupLinkAware(this.editor);
  }

  componentWillUnmount() {
    if (this.editor) {
      if (typeof this.editor._destroyLinkAware === 'function') {
        this.editor._destroyLinkAware();
      }
      this.editor.off('change', this._onEdit);
      this.editor.off('paste', this._onPaste);
      this.editor.off('blur', this._onBlur);
      this._clearNewlineMarkers();

      const wrapper = this.editor.getWrapperElement();
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
    if (typeof this.brunoAutoCompleteCleanup === 'function') this.brunoAutoCompleteCleanup();
    if (this.maskedEditor) this.maskedEditor.destroy();
    this.editor = null;
  }

  _onEdit = (val) => {
    if (!this.ignoreChangeEvent && this.editor) {
      const value = (typeof val === 'string') ? val : this.editor.getValue();

      if (typeof val === 'string' && value !== this.editor.getValue()) {
        this.editor.setValue(value);
      }

      this.cachedValue = this.editor.getValue();
      if (this.props.onChange && (this.props.value !== this.cachedValue)) {
        this.props.onChange(this.cachedValue);
      }
      if (this.props.showNewlineArrow) this._updateNewlineMarkers();
    }
  };

  _onPaste = (_, event) => this.props.onPaste?.(event);
  _onBlur = () => this.editor?.setCursor(this.editor.getCursor());

  _enableMaskedEditor = (enabled) => {
    if (enabled) {
      if (!this.maskedEditor) this.maskedEditor = new MaskedEditor(this.editor, '*');
      this.maskedEditor.enable();
    } else if (this.maskedEditor) {
      this.maskedEditor.destroy();
      this.maskedEditor = null;
    }
  };

  componentDidUpdate(prevProps) {
    this.ignoreChangeEvent = true;
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      const nextValue = String(this.props.value ?? '');
      const isAccessibleFocused = document.activeElement === this.textareaRef.current;

      if (isAccessibleFocused) {
        this.editor.setValue(nextValue);
      } else {
        const cursor = this.editor.getCursor();
        this.editor.setValue(nextValue);
        this.editor.setCursor(cursor);
      }
      this.maskedEditor?.update();
    }
    if (this.props.isSecret !== prevProps.isSecret) {
      this._enableMaskedEditor(this.props.isSecret);
      this.setState({ maskInput: this.props.isSecret });
    }
    this.ignoreChangeEvent = false;
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
        const arrow = document.createElement('span');
        arrow.className = 'newline-arrow';
        arrow.textContent = '↲';
        arrow.style.cssText = 'color: #888; font-size: 8px; margin: 0 2px; vertical-align: middle; display: inline-block;';
        const marker = this.editor.markText(this.editor.posFromIndex(i), this.editor.posFromIndex(i + 1), { replacedWith: arrow });
        this.newlineMarkers.push(marker);
      }
    }
  };

  _clearNewlineMarkers = () => {
    this.newlineMarkers?.forEach((m) => m.clear());
    this.newlineMarkers = [];
  };

  toggleVisibleSecret = () => {
    const isVisible = !this.state.maskInput;
    this.setState({ maskInput: isVisible });
    this._enableMaskedEditor(isVisible);
  };

  render() {
    const valueToDisplay = this.state.maskInput ? '•'.repeat((this.props.value || '').length) : (this.props.value || '');

    return (
      <div className={`flex flex-row items-center w-full overflow-x-auto ${this.props.className}`}>
        <div className="grow relative" style={{ display: 'flex', alignItems: 'center' }}>
          <StyledWrapper
            ref={this.editorRef}
            aria-hidden="true"
            className={`single-line-editor grow ${this.props.readOnly ? 'read-only' : ''}`}
            $isCompact={this.props.isCompact}
            {...(this.props['data-testid'] ? { 'data-testid': this.props['data-testid'] } : {})}
          />
          <textarea
            ref={this.textareaRef}
            id={this.editorId}
            className="mousetrap"
            rows="1"
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, zIndex: 10,
              resize: 'none', outline: 'none', border: 'none', background: 'transparent', whiteSpace: 'nowrap',
              overflow: 'hidden', caretColor: this.props.theme === 'dark' ? 'white' : 'black'
            }}
            value={valueToDisplay}
            aria-label={this.props.placeholder || 'Input'}
            readOnly={this.props.readOnly}
            onPaste={(e) => this._onPaste(null, e)}
            onChange={(e) => this._onEdit(e.target.value.replace(/[\r\n]/g, ''))}
            onKeyDown={(e) => {
              const isShortcut = e.ctrlKey || e.metaKey || e.altKey;
              if (e.key === 'Enter') {
                if (e.altKey && this.props.allowNewlines) {
                  this._onEdit((this.props.value || '') + '\n');
                } else {
                  this.props.onRun?.();
                }
                return;
              }

              const isFunctionKey = /^F\d+$/.test(e.key);
              if (isShortcut || isFunctionKey || e.key === 'Escape') return;

              e.stopPropagation();
            }}
          />
        </div>
        {this.props.isSecret && (
          <button type="button" className="mx-2" onClick={this.toggleVisibleSecret}>
            {this.state.maskInput ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        )}
      </div>
    );
  }
}

export default SingleLineEditor;
