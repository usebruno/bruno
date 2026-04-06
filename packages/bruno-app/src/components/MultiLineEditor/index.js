import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import { MaskedEditor } from 'utils/common/masked-editor';
import StyledWrapper from './StyledWrapper';
import { setupLinkAware } from 'utils/codemirror/linkAware';
import { IconEye, IconEyeOff } from '@tabler/icons';
import get from 'lodash/get';
import { renderVarInfo } from 'utils/codemirror/brunoVarInfo';
import { mockDataFunctions } from '@usebruno/common';

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
    this.readOnly = props.readOnly || false;
    this._popupRef = null;

    this.state = {
      maskInput: props.isSecret || false, // Always mask the input by default (if it's a secret)
      isActive: !props.deferred
    };
  }

  componentDidMount() {
    if (this.props.deferred && !this.state.isActive) return;
    this._initCodeMirror();
  }

  _initCodeMirror() {
    // Initialize CodeMirror as a single line editor
    /** @type {import("codemirror").Editor} */
    const variables = getAllVariables(this.props.collection, this.props.item);

    this.editor = CodeMirror(this.editorRef.current, {
      lineWrapping: false,
      lineNumbers: false,
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      placeholder: this.props.placeholder,
      mode: 'brunovariables',
      brunoVarInfo: this.props.enableBrunoVarInfo !== false ? {
        variables,
        collection: this.props.collection,
        item: this.props.item
      } : false,
      readOnly: this.props.readOnly,
      tabindex: 0,
      extraKeys: {
        'Cmd-F': () => {},
        'Ctrl-F': () => {},
        // Tabbing disabled to make tabindex work
        'Tab': false,
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

    setupLinkAware(this.editor);

    // Add mousetrap calss so Mousetrap captures shortcuts even when Codemirror is focused
    const cmInput = this.editor.getInputField();
    if (cmInput) {
      cmInput.classList.add('mousetrap');
    }

    this.editor.setValue(String(this.props.value) || '');
    this.editor.on('change', this._onEdit);
    this.editor.on('blur', this._onBlur);
    this.editor.on('focus', this._onFocus);
    this.addOverlay(variables);

    // Initialize masking if this is a secret field
    this.setState({ maskInput: this.props.isSecret });
    this._enableMaskedEditor(this.props.isSecret);
  }

  _onFocus = () => {
    if (this._deactivateTimer) {
      clearTimeout(this._deactivateTimer);
      this._deactivateTimer = null;
    }
  };

  _onBlur = () => {
    if (this.editor) {
      this.editor.setCursor(this.editor.getCursor());
    }
    if (this.props.deferred) {
      this._deactivateTimer = setTimeout(() => {
        this._deactivate();
      }, 150);
    }
  };

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
      if (this.maskedEditor) {
        this.maskedEditor.disable();
        this.maskedEditor.destroy();
        this.maskedEditor = null;
      }
    }
  };

  componentDidUpdate(prevProps) {
    if (!this.editor) return;
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
    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly);
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      const cursor = this.editor.getCursor();
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
      this.editor.setCursor(cursor);
      // Re-apply masking after setValue() since it destroys all CodeMirror marks
      if (this.maskedEditor && this.maskedEditor.isEnabled()) {
        this.maskedEditor.update();
      }
    }
    if (!isEqual(this.props.isSecret, prevProps.isSecret)) {
      // If the secret flag has changed, update the editor to reflect the change
      this._enableMaskedEditor(this.props.isSecret);
      // also set the maskInput flag to the new value
      this.setState({ maskInput: this.props.isSecret });
    }
    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly || false);
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this._deactivateTimer) {
      clearTimeout(this._deactivateTimer);
      this._deactivateTimer = null;
    }
    this._removeViewerPopup();
    this._cleanupEditor();
  }

  _cleanupEditor() {
    if (this.brunoAutoCompleteCleanup) {
      this.brunoAutoCompleteCleanup();
      this.brunoAutoCompleteCleanup = null;
    }
    if (this.editor?._destroyLinkAware) {
      this.editor._destroyLinkAware();
    }
    if (this.maskedEditor) {
      this.maskedEditor.destroy();
      this.maskedEditor = null;
    }
    if (this.editor) {
      this.editor.off('change', this._onEdit);
      this.editor.off('blur', this._onBlur);
      this.editor.off('focus', this._onFocus);
      this.editor.getWrapperElement().remove();
      this.editor = null;
    }
  }

  _activate = () => {
    if (this.state.isActive) return;
    this._removeViewerPopup();

    // Lock container dimensions to prevent layout jerk during DOM swap
    const wrapper = this.editorRef.current || this._viewerRef;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      wrapper.style.minHeight = `${rect.height}px`;
      wrapper.style.minWidth = `${rect.width}px`;
    }

    this.setState({ isActive: true }, () => {
      this._initCodeMirror();
      if (this.editor) {
        this.editor.focus();
        const lastLine = this.editor.lastLine();
        const lastCh = this.editor.getLine(lastLine).length;
        this.editor.setCursor({ line: lastLine, ch: lastCh });
      }
      if (wrapper) {
        requestAnimationFrame(() => {
          wrapper.style.minHeight = '';
          wrapper.style.minWidth = '';
        });
      }
    });
  };

  _deactivate = () => {
    if (!this.state.isActive) return;
    this._cleanupEditor();
    this.setState({ isActive: false });
  };

  _removeViewerPopup = () => {
    if (this._popupHideTimer) {
      clearTimeout(this._popupHideTimer);
      this._popupHideTimer = null;
    }
    if (this._popupRef && this._popupRef.parentNode) {
      this._popupRef.parentNode.removeChild(this._popupRef);
    }
    this._popupRef = null;
  };

  _handleViewerMouseEnter = (e, segment) => {
    if (segment.type !== 'variable') return;
    const variables = getAllVariables(this.props.collection, this.props.item);
    const options = { variables, collection: this.props.collection, item: this.props.item };
    const token = { string: segment.value, start: 0, end: segment.value.length };
    const infoEl = renderVarInfo(token, options);
    if (!infoEl) return;
    this._removeViewerPopup();
    const popup = document.createElement('div');
    popup.className = 'CodeMirror-brunoVarInfo';
    popup.appendChild(infoEl);
    document.body.appendChild(popup);
    this._popupRef = popup;

    // Position popup — same logic as brunoVarInfo.js showPopup()
    const box = e.target.getBoundingClientRect();
    const popupBox = popup.getBoundingClientRect();
    const popupStyle = popup.currentStyle || window.getComputedStyle(popup);
    const popupWidth = popupBox.right - popupBox.left + parseFloat(popupStyle.marginLeft) + parseFloat(popupStyle.marginRight);
    const popupHeight = popupBox.bottom - popupBox.top + parseFloat(popupStyle.marginTop) + parseFloat(popupStyle.marginBottom);
    const GAP_REM = 0.5;
    const EDGE_MARGIN_REM = 0.9375;

    let topPos = box.bottom + (GAP_REM * 16);
    if (popupHeight > window.innerHeight - box.bottom - (EDGE_MARGIN_REM * 16) && box.top > window.innerHeight - box.bottom) {
      topPos = box.top - popupHeight - (GAP_REM * 16);
    }
    if (topPos < 0) topPos = box.bottom + (GAP_REM * 16);

    let leftPos = box.left;
    if (leftPos + popupWidth > window.innerWidth - (EDGE_MARGIN_REM * 16)) {
      leftPos = window.innerWidth - popupWidth - (EDGE_MARGIN_REM * 16);
    }
    if (leftPos < 0) leftPos = 0;

    popup.style.opacity = 1;
    popup.style.top = `${topPos / 16}rem`;
    popup.style.left = `${leftPos / 16}rem`;

    // Keep popup alive when mouse moves over it
    popup.addEventListener('mouseenter', () => {
      clearTimeout(this._popupHideTimer);
    });
    popup.addEventListener('mouseleave', () => {
      this._popupHideTimer = setTimeout(() => this._removeViewerPopup(), 300);
    });
  };

  _handleViewerMouseLeave = () => {
    this._popupHideTimer = setTimeout(() => this._removeViewerPopup(), 300);
  };

  _parseVariableSegments = (value) => {
    const segments = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(value)) !== null) {
      // Push text before the variable
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: value.substring(lastIndex, match.index) });
      }

      const varName = match[1].trim();
      const variables = getAllVariables(this.props.collection, this.props.item);
      const resolvedValue = get(variables, varName);

      // Check if it's a dynamic/faker variable
      const isDynamic = varName.startsWith('$') && !varName.startsWith('$oauth2.');
      const fakerKey = isDynamic ? varName.substring(1) : null;
      const isValidDynamic = isDynamic && !!mockDataFunctions[fakerKey];

      const isValid = resolvedValue !== undefined || isValidDynamic || varName.startsWith('process.env.') || varName.startsWith('$oauth2.');

      segments.push({
        type: 'variable',
        value: match[0],
        name: varName,
        valid: isValid
      });

      lastIndex = match.index + match[0].length;
    }

    // Push remaining text
    if (lastIndex < value.length) {
      segments.push({ type: 'text', value: value.substring(lastIndex) });
    }

    return segments;
  };

  _renderViewer = () => {
    const value = this.props.value || '';
    const wrapperClass = `multi-line-editor grow ${this.props.readOnly ? 'read-only' : ''}`;

    let content;
    if (!value) {
      content = (
        <span className="viewer-placeholder">{this.props.placeholder || ''}</span>
      );
    } else if (this.props.isSecret && this.state.maskInput) {
      content = <span>{'*'.repeat(Math.min(value.length, 32))}</span>;
    } else {
      const segments = this._parseVariableSegments(value);
      content = segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.value}</span>;
        }
        return (
          <span
            key={i}
            className={seg.valid ? 'variable-valid' : 'variable-invalid'}
            onMouseEnter={(e) =>
              this._handleViewerMouseEnter(e, seg)}
            onMouseLeave={this._handleViewerMouseLeave}
          >
            {seg.value}
          </span>
        );
      });
    }

    return (
      <div className={`flex flex-row justify-between w-full overflow-x-auto ${this.props.className}`}>
        <StyledWrapper ref={(el) => { this._viewerRef = el; }} className={wrapperClass}>
          <div
            className="viewer-content"
            onClick={this.props.readOnly ? undefined : this._activate}
            style={{ cursor: this.props.readOnly ? 'default' : 'text' }}
          >
            {content}
          </div>
        </StyledWrapper>
        {this.secretEye(this.props.isSecret)}
      </div>
    );
  };

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
    if (this.props.deferred && !this.state.isActive) return this._renderViewer();

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
