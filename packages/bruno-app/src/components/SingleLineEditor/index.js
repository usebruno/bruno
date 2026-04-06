import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { MaskedEditor } from 'utils/common/masked-editor';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { setupLinkAware } from 'utils/codemirror/linkAware';
import get from 'lodash/get';
import { renderVarInfo } from 'utils/codemirror/brunoVarInfo';
import { mockDataFunctions } from '@usebruno/common';

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
    this._popupRef = null;

    this.state = {
      maskInput: props.isSecret || false,
      isActive: !props.deferred
    };
  }

  componentDidMount() {
    if (this.props.deferred && !this.state.isActive) {
      return;
    }
    this._initCodeMirror();
  }

  _initCodeMirror() {
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
        // Tabbing disabled to make tabindex work
        'Tab': false,
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
    this.editor.on('blur', this._onBlur);
    this.editor.on('focus', this._onFocus);
    this.addOverlay(variables);
    this._enableMaskedEditor(this.props.isSecret);
    this.setState({ maskInput: this.props.isSecret });

    // Add newline arrow markers if enabled
    if (this.props.showNewlineArrow) {
      this._updateNewlineMarkers();
    }
    setupLinkAware(this.editor);

    // Add mousetrap class so Mousetrap captures shortcuts even when CodeMirror is focused
    const cmInput = this.editor.getInputField();
    if (cmInput) {
      cmInput.classList.add('mousetrap');
    }
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
        this._deactivateTimer = null;
        this._deactivate();
      }, 150);
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
    if (!this.editor) {
      if (this.props.value !== prevProps.value) {
        this.cachedValue = this.props.value || '';
      }
      return;
    }
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
      const cursor = this.editor.getCursor();
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
      this.editor.setCursor(cursor);
      // Re-apply masking after setValue() since it destroys all CodeMirror marks
      if (this.maskedEditor && this.maskedEditor.isEnabled()) {
        this.maskedEditor.update();
      }

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
    if (this.props.placeholder !== prevProps.placeholder && this.editor) {
      this.editor.setOption('placeholder', this.props.placeholder);
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

  _activate = () => {
    if (this.state.isActive) return;
    this._removeViewerPopup();

    // Lock the parent container dimensions to prevent layout jerk during DOM swap
    const wrapper = this.editorRef.current || (this._viewerRef && this._viewerRef.parentElement);
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
      // Release dimension lock after CodeMirror renders
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
    if (this.editor) {
      this.cachedValue = this.editor.getValue();
    }
    this._cleanupEditor();
    this.setState({ isActive: false });
  };

  _cleanupEditor = () => {
    if (!this.editor) return;
    if (this.editor._destroyLinkAware) {
      this.editor._destroyLinkAware();
    }
    this.editor.off('change', this._onEdit);
    this.editor.off('paste', this._onPaste);
    this.editor.off('blur', this._onBlur);
    this.editor.off('focus', this._onFocus);
    this._clearNewlineMarkers();
    this.editor.getWrapperElement().remove();
    this.editor = null;
    if (this.brunoAutoCompleteCleanup) {
      this.brunoAutoCompleteCleanup();
      this.brunoAutoCompleteCleanup = null;
    }
    if (this.maskedEditor) {
      this.maskedEditor.destroy();
      this.maskedEditor = null;
    }
  };

  _removeViewerPopup = () => {
    if (this._popupHideTimer) {
      clearTimeout(this._popupHideTimer);
      this._popupHideTimer = null;
    }
    if (this._popupRef && this._popupRef.parentNode) {
      this._popupRef.parentNode.removeChild(this._popupRef);
      this._popupRef = null;
    }
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
    // Delay removal to allow mouse to move to the popup
    this._popupHideTimer = setTimeout(() => this._removeViewerPopup(), 300);
  };

  _parseVariableSegments = (text) => {
    if (!text) return [];
    const variables = getAllVariables(this.props.collection, this.props.item);
    const { pathParams = {}, ...vars } = variables || {};
    const result = [];
    const regex = /\{\{([^}]*)\}\}/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: text.substring(lastIndex, match.index) });
      }
      const fullMatch = match[0];
      const inner = match[1].trim();
      const isMockVar = inner.startsWith('$') && mockDataFunctions.hasOwnProperty(inner.substring(1));
      const found = isMockVar || get(vars, inner) !== undefined;
      result.push({ type: 'variable', value: fullMatch, name: inner, valid: found });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.substring(lastIndex) });
    }
    return result;
  };

  _renderViewer = () => {
    const value = this.props.value || '';
    const hasContent = value.length > 0;
    const isSecret = this.state.maskInput;
    return (
      <div className={`flex flex-row items-center w-full overflow-x-auto ${this.props.className || ''}`}>
        <StyledWrapper
          ref={(el) => { this._viewerRef = el; }}
          className={`single-line-editor grow ${this.props.readOnly ? 'read-only' : ''}`}
          $isCompact={this.props.isCompact}
          onClick={this.props.readOnly ? undefined : this._activate}
        >
          <div className="CodeMirror viewer-content" onMouseLeave={() => this._removeViewerPopup()} style={{ cursor: this.props.readOnly ? 'default' : 'text' }}>
            {!hasContent && this.props.placeholder ? (
              <span className="viewer-placeholder">{this.props.placeholder}</span>
            ) : isSecret ? (
              <span>{'*'.repeat(value.length)}</span>
            ) : (
              this._parseVariableSegments(value).map((seg, i) =>
                seg.type === 'text' ? (
                  <span key={i}>{seg.value}</span>
                ) : (
                  <span
                    key={i}
                    className={seg.valid ? 'variable-valid' : 'variable-invalid'}
                    onMouseEnter={(e) => this._handleViewerMouseEnter(e, seg)}
                    onMouseLeave={this._handleViewerMouseLeave}
                  >
                    {seg.value}
                  </span>
                )
              )
            )}
          </div>
        </StyledWrapper>
        <div className="flex items-center">
          {this.secretEye(this.props.isSecret)}
        </div>
      </div>
    );
  };

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
    if (this.props.deferred && !this.state.isActive) {
      return this._renderViewer();
    }
    return (
      <div className={`flex flex-row items-center w-full overflow-x-auto ${this.props.className}`}>
        <StyledWrapper
          ref={this.editorRef}
          className={`single-line-editor grow ${this.props.readOnly ? 'read-only' : ''}`}
          $isCompact={this.props.isCompact}
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
