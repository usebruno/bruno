import React, { Component, createRef } from 'react';
import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import { MaskedEditor } from 'utils/common/masked-editor';
import StyledWrapper from './StyledWrapper';
import { setupLinkAware } from 'utils/codemirror/linkAware';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { mockDataFunctions } from '@usebruno/common';
import { PROMPT_VARIABLE_TEXT_PATTERN } from '@usebruno/common/utils';

const CodeMirror = require('codemirror');

class MultiLineEditor extends Component {
  constructor(props) {
    super(props);
    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.editorRef = createRef();
    this.containerRef = createRef();
    this.variables = {};
    this.readOnly = props.readOnly || false;

    this.resizeObserver = null;
    this.rafId = null;

    this.state = {
      maskInput: props.isSecret || false
    };
  }

  _focusEditor = () => {
    if (!this.editor) return;
    requestAnimationFrame(() => {
      this.editor?.focus();
      setTimeout(() => {
        this.editor?.focus();
      }, 0);
    });
  };

  _refreshEditor = () => {
    if (!this.editor) return;
    this.editor.setSize('100%', null);
    this.editor.refresh();
  };

  _startResizeObserver = () => {
    if (!this.containerRef.current || this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        this._refreshEditor();
      });
    });

    this.resizeObserver.observe(this.containerRef.current);
  };

  _stopResizeObserver = () => {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    cancelAnimationFrame(this.rafId);
  };

  _destroyEditor = () => {
    if (!this.editor) return;

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

    try {
      this.editor.getWrapperElement()?.remove();
    } catch (e) { }

    this.editor = null;

    if (this.editorRef.current) {
      this.editorRef.current.innerHTML = '';
    }
  };

  _initEditor = () => {
    if (this.editor) return;

    const variables = getAllVariables(this.props.collection, this.props.item);

    this.editor = CodeMirror(this.editorRef.current, {
      lineWrapping: true,
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

    this.editor.setValue(String(this.props.value) || '');
    this.editor.on('change', this._onEdit);
    this.addOverlay(variables);

    // Initialize masking if this is a secret field
    this.setState({ maskInput: this.props.isSecret });
    this._enableMaskedEditor(this.props.isSecret);

    this._startResizeObserver();

    requestAnimationFrame(() => this._refreshEditor());
    setTimeout(() => this._refreshEditor(), 0);
    setTimeout(() => this._refreshEditor(), 50);

    if (this.props.tabFocus) {
      this._focusEditor();
    }
  };

  componentDidMount() {
    if (this.props.isActive === undefined || this.props.isActive) {
      this._initEditor();
    }
  }

  componentDidUpdate(prevProps) {
    // ✅ handle isActive toggling cleanly
    if (this.props.isActive !== undefined) {
      if (prevProps.isActive === true && this.props.isActive === false) {
        this._destroyEditor();
        return;
      }

      if (prevProps.isActive === false && this.props.isActive === true) {
        this._initEditor();
        return;
      }

      if (this.props.isActive === false) {
        return;
      }
    }

    if (!this.editor) return;

    this.ignoreChangeEvent = true;

    let variables = getAllVariables(this.props.collection, this.props.item);
    if (!isEqual(variables, this.variables)) {
      if (this.props.enableBrunoVarInfo !== false && this.editor.options.brunoVarInfo) {
        this.editor.options.brunoVarInfo.variables = variables;
      }
      this.addOverlay(variables);
    }

    if (this.props.theme !== prevProps.theme) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
      this._refreshEditor();
    }

    if (this.props.readOnly !== prevProps.readOnly) {
      this.editor.setOption('readOnly', this.props.readOnly);
      this._refreshEditor();
    }

    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue) {
      const cursor = this.editor.getCursor();
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
      this.editor.setCursor(cursor);
      this._refreshEditor();
    }

    if (!isEqual(this.props.isSecret, prevProps.isSecret)) {
      this._enableMaskedEditor(this.props.isSecret);
      this.setState({ maskInput: this.props.isSecret });
      this._refreshEditor();
    }

    this.ignoreChangeEvent = false;

    if (this.props.tabFocus && !prevProps.tabFocus) {
      this._focusEditor();
    }
  }

  componentWillUnmount() {
    this._stopResizeObserver();
    this._destroyEditor();
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
    if (!this.editor) return;

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

  addOverlay = (variables) => {
    this.variables = variables;
    defineCodeMirrorBrunoVariablesMode(variables, 'text/plain', false, true);
    this.editor && this.editor.setOption('mode', 'brunovariables');
  };

  // Helper function to parse and highlight variables in text
  highlightVariables = (text, variables) => {
    if (!text || typeof text !== 'string') return '';

    const { pathParams = {}, ...vars } = variables || {};
    const pathFoundInVariables = (path, obj) => {
      const value = get(obj, path);
      return value !== undefined;
    };

    // Process each line separately to handle multiline text
    const lines = text.split('\n');
    const highlightedLines = lines.map((line) => {
      const parts = [];
      let lastIndex = 0;
      let index = 0;

      while (index < line.length) {
        // Find next {{ pattern
        const openIndex = line.indexOf('{{', index);
        if (openIndex === -1) {
          // No more variables, add remaining text
          if (lastIndex < line.length) {
            parts.push({ text: line.substring(lastIndex), type: 'text' });
          }
          break;
        }

        // Add text before the variable
        if (openIndex > lastIndex) {
          parts.push({ text: line.substring(lastIndex, openIndex), type: 'text' });
        }

        // Find closing }}
        const closeIndex = line.indexOf('}}', openIndex + 2);
        if (closeIndex === -1) {
          // No closing brace, treat as regular text
          parts.push({ text: line.substring(openIndex), type: 'text' });
          break;
        }

        // Extract variable name
        const variableName = line.substring(openIndex + 2, closeIndex);

        // Determine variable type
        let className = '';
        if (PROMPT_VARIABLE_TEXT_PATTERN.test(variableName)) {
          className = 'cm-variable-prompt';
        } else {
          const isMockVariable = variableName.startsWith('$') && mockDataFunctions.hasOwnProperty(variableName.substring(1));
          const found = isMockVariable || pathFoundInVariables(variableName, vars);
          className = found ? 'cm-variable-valid' : 'cm-variable-invalid';
        }

        // Add variable with highlighting
        parts.push({
          text: line.substring(openIndex, closeIndex + 2),
          type: 'variable',
          className
        });

        lastIndex = closeIndex + 2;
        index = closeIndex + 2;
      }

      // Convert parts to HTML for this line
      return parts.map((part) => {
        const escaped = part.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        if (part.type === 'variable') {
          return `<span class="${part.className}">${escaped}</span>`;
        }
        return escaped;
      }).join('');
    });

    // Join lines with <br> tags
    return highlightedLines.join('<br>');
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

    if (this.props.isActive !== undefined && this.props.isActive === false) {
      const rawValue = typeof this.props.value === 'string' ? this.props.value : '';
      const masked
        = this.props.isSecret && rawValue
          ? rawValue
              .split('\n')
              .map((line) => '*'.repeat(line.length))
              .join('\n')
          : rawValue;

      const isMultiline = masked.includes('\n');
      const rows = Math.min(masked.split('\n').length || 1, 6);

      // Get variables for highlighting (only if not masked)
      const variables = getAllVariables(this.props.collection, this.props.item);
      const highlightedHtml = this.props.isSecret ? masked : this.highlightVariables(masked, variables);
      const showHighlighting = !this.props.isSecret && masked;

      return (
        <div
          ref={this.containerRef}
          className={`flex items-center w-full min-w-0 ${this.props.className || ''}`}
          style={{ minHeight: 34 }}
        >
          <div className="flex-1 min-w-0 w-full flex items-center" style={{ minHeight: 34 }}>
            {showHighlighting ? (
              <div
                className="mousetrap w-full bg-transparent text-inherit outline-none variable-highlight-container"
                style={{
                  minHeight: isMultiline ? 'auto' : 20,
                  lineHeight: '20px',
                  paddingTop: 0,
                  paddingBottom: 0,
                  whiteSpace: isMultiline ? 'pre-wrap' : 'nowrap',
                  overflow: isMultiline ? 'hidden' : 'hidden',
                  textOverflow: isMultiline ? 'clip' : 'ellipsis'
                }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml || '&nbsp;' }}
              />
            ) : (
              isMultiline ? (
                <textarea
                  className="mousetrap w-full bg-transparent text-inherit outline-none resize-none overflow-hidden"
                  style={{
                    minHeight: 20,
                    lineHeight: '20px',
                    paddingTop: 0,
                    paddingBottom: 0
                  }}
                  value={masked}
                  placeholder={this.props.placeholder}
                  readOnly
                  rows={rows}
                />
              ) : (
                <input
                  className="mousetrap w-full bg-transparent text-inherit outline-none truncate"
                  style={{
                    minHeight: 20,
                    lineHeight: '20px',
                    paddingTop: 0,
                    paddingBottom: 0
                  }}
                  value={masked}
                  placeholder={this.props.placeholder}
                  readOnly
                />
              )
            )}
          </div>

          <div className="shrink-0" style={{ width: 34 }} />
        </div>
      );
    }

    // ✅ active CodeMirror view only
    return (
      <div ref={this.containerRef} className={`flex flex-row items-center w-full min-w-0 ${this.props.className || ''}`} style={{ minHeight: 34 }}>
        <div className="flex-1 min-w-0 flex items-center" style={{ minHeight: 34 }}>
          <StyledWrapper ref={this.editorRef} className={wrapperClass} />
        </div>
        <div className="shrink-0">{this.secretEye(this.props.isSecret)}</div>
      </div>
    );
  }
}
export default MultiLineEditor;
