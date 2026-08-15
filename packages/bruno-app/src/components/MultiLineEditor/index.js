import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { debounce } from 'lodash';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import { MaskedEditor } from 'utils/common/masked-editor';
import {
  applyEditorState,
  captureViewState,
  readPersistedEditorState,
  writePersistedEditorState
} from 'components/CodeEditor/state-persistence';
import StyledWrapper from './StyledWrapper';
import { setupLinkAware } from 'utils/codemirror/linkAware';
import { IconEye, IconEyeOff } from '@tabler/icons';

const CodeMirror = require('codemirror');

/** Snapshot overflow ancestors so CM scroll/fold restore cannot shift the page. */
const snapshotAncestorScrolls = (node) => {
  const snapshots = [];
  let el = node?.parentElement;
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      snapshots.push({ el, top: el.scrollTop });
    }
    el = el.parentElement;
  }
  return snapshots;
};

const restoreAncestorScrolls = (snapshots) => {
  snapshots.forEach(({ el, top }) => {
    if (el.scrollTop !== top) el.scrollTop = top;
  });
};

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
    this._currentDocKey = null;

    this.state = {
      maskInput: props.isSecret || false // Always mask the input by default (if it's a secret)
    };
  }

  _applyPersistedViewState = () => {
    if (!this.editor || !this._currentDocKey) return;

    const wrapper = this.editor.getWrapperElement();
    const ancestorScrolls = snapshotAncestorScrolls(wrapper);
    applyEditorState(
      this.editor,
      readPersistedEditorState({ scope: this.props.persistenceScope, key: this._currentDocKey }),
      this.cachedValue
    );
    restoreAncestorScrolls(ancestorScrolls);
    // CodeMirror/browser may adjust ancestors on a later frame after scrollTo.
    if (this._restoreAncestorRaf) cancelAnimationFrame(this._restoreAncestorRaf);
    this._restoreAncestorRaf = requestAnimationFrame(() => {
      this._restoreAncestorRaf = null;
      restoreAncestorScrolls(ancestorScrolls);
    });
  };

  _setupViewPersistence = () => {
    if (!this.editor || !this.props.docKey) return;

    this._currentDocKey = this.props.docKey;
    this._applyPersistedViewState();

    this._persistViewStateDebounced = debounce(() => {
      if (!this.editor || !this._currentDocKey) return;
      writePersistedEditorState({
        scope: this.props.persistenceScope,
        key: this._currentDocKey,
        state: captureViewState(this.editor)
      });
    }, 250);

    this.editor.on('fold', this._persistViewStateDebounced);
    this.editor.on('unfold', this._persistViewStateDebounced);
    this.editor.on('scroll', this._persistViewStateDebounced);
  };

  _teardownViewPersistence = () => {
    if (this._restoreAncestorRaf) {
      cancelAnimationFrame(this._restoreAncestorRaf);
      this._restoreAncestorRaf = null;
    }
    if (this.editor && this._currentDocKey) {
      writePersistedEditorState({
        scope: this.props.persistenceScope,
        key: this._currentDocKey,
        state: captureViewState(this.editor)
      });
    }
    if (this.editor && this._persistViewStateDebounced) {
      this.editor.off('fold', this._persistViewStateDebounced);
      this.editor.off('unfold', this._persistViewStateDebounced);
      this.editor.off('scroll', this._persistViewStateDebounced);
      this._persistViewStateDebounced.cancel?.();
    }
    this._persistViewStateDebounced = null;
  };

  componentDidMount() {
    // Initialize CodeMirror as a single line editor
    /** @type {import("codemirror").Editor} */
    const variables = getAllVariables(this.props.collection, this.props.item);
    /**
     * No-op. We claim Cmd-Enter / Ctrl-Enter here only to suppress CodeMirror's
     * sublime keymap default (insertLineAfter), which would otherwise insert a
     * newline. sendRequest dispatch is owned by Mousetrap — the editor input has
     * the `mousetrap` class (added below) so the global
     * useKeybinding('sendRequest', …) in RequestTabPanel handles it, and only
     * in request tabs. Falling through with CodeMirror.Pass when onRun is absent
     * would re-introduce the newline in collection/folder-level editors.
     */
    const runShortcut = () => {};
    const enableFolding = !!this.props.enableFolding;

    this.editor = CodeMirror(this.editorRef.current, {
      lineWrapping: false,
      lineNumbers: enableFolding,
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
      foldGutter: enableFolding,
      gutters: enableFolding
        ? ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
        : [],
      foldOptions: enableFolding
        ? {
            widget: (from, to) => {
              const internal = this.editor.getRange(from, to);
              const line = this.editor.getLine(from.line);
              try {
                const toParse = line.endsWith('[')
                  ? `[${internal}]`
                  : `{${internal}}`;
                const count = Object.keys(JSON.parse(toParse)).length;
                return count ? `\u21A4${count}\u21A6` : '\u2194';
              } catch {
                return '\u2194';
              }
            }
          }
        : undefined,
      extraKeys: {
        'Cmd-F': () => {},
        'Ctrl-F': () => {},
        'Cmd-Enter': runShortcut,
        'Ctrl-Enter': runShortcut,
        // Tabbing disabled to make tabindex work
        'Tab': false,
        'Shift-Tab': false,
        ...(enableFolding
          ? {
              'Ctrl-Y': 'foldAll',
              'Cmd-Y': 'foldAll',
              'Ctrl-I': 'unfoldAll',
              'Cmd-I': 'unfoldAll'
            }
          : {})
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
    this.cachedValue = String(this.props.value) || '';
    this.editor.on('change', this._onEdit);
    this.editor.on('blur', this._onBlur);
    this.addOverlay(variables);
    this._setupViewPersistence();

    // Initialize masking if this is a secret field
    this.setState({ maskInput: this.props.isSecret }, () => {
      this.props.onMaskChange?.(this.state.maskInput);
    });
    this._enableMaskedEditor(this.props.isSecret);
  }

  _onBlur = () => {
    if (this.editor) {
      this.editor.setCursor(this.editor.getCursor());
    }
  };

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.cachedValue = this.editor.getValue();
      if (this.props.onChange) {
        this.props.onChange(this.cachedValue);
      }
      requestAnimationFrame(() => this.editor?.refresh());
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
    if (this.props.docKey !== prevProps.docKey && this.editor) {
      this._teardownViewPersistence();
      this._setupViewPersistence();
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      const cursor = this.editor.getCursor();
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
      this.editor.setCursor(cursor);
      // setValue clears folds — re-apply persisted view state when possible.
      if (this._currentDocKey) {
        this._applyPersistedViewState();
      }
      // Re-apply masking after setValue() since it destroys all CodeMirror marks
      if (this.maskedEditor && this.maskedEditor.isEnabled()) {
        this.maskedEditor.update();
      }
      requestAnimationFrame(() => this.editor?.refresh());
    }
    if (!isEqual(this.props.isSecret, prevProps.isSecret)) {
      // If the secret flag has changed, update the editor to reflect the change
      this._enableMaskedEditor(this.props.isSecret);
      // also set the maskInput flag to the new value
      this.setState({ maskInput: this.props.isSecret }, () => {
        this.props.onMaskChange?.(this.state.maskInput);
      });
    }
    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly || false);
    }
    if (this.props.mode !== prevProps.mode && this.editor) {
      this.addOverlay(variables);
    }
    if (this.props.placeholder !== prevProps.placeholder && this.editor) {
      this.editor.setOption('placeholder', this.props.placeholder);
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.brunoAutoCompleteCleanup) {
      this.brunoAutoCompleteCleanup();
    }
    if (this.editor?._destroyLinkAware) {
      this.editor._destroyLinkAware();
    }
    if (this.maskedEditor) {
      this.maskedEditor.destroy();
      this.maskedEditor = null;
    }
    if (this.editor) {
      this._teardownViewPersistence();
      this.editor.off('change', this._onEdit);
      this.editor.off('blur', this._onBlur);
      this.editor.getWrapperElement().remove();
    }
  }

  addOverlay = (variables) => {
    this.variables = variables;
    const mode = this.props.mode || 'text/plain';
    defineCodeMirrorBrunoVariablesMode(variables, mode, false, true);
    this.editor.setOption('mode', 'brunovariables');
  };

  /**
   * @brief Toggle the visibility of the secret value
   */
  toggleVisibleSecret = () => {
    const maskInput = !this.state.maskInput;
    this.setState({ maskInput }, () => {
      this._enableMaskedEditor(maskInput);
      this.props.onMaskChange?.(this.state.maskInput);
    });
  };

  /**
   * @brief Eye icon to show/hide the secret value
   * @returns ReactComponent The eye icon
   */
  secretEye = (isSecret) => {
    return isSecret === true ? (
      <button className="mx-2" data-testid="secret-reveal-toggle" onClick={() => this.toggleVisibleSecret()}>
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
    const testId = this.props.testId ?? (this.props.name ? `test-multiline-editor-${this.props.name}` : undefined);
    return (
      <div data-testid={testId} className={`flex flex-row justify-between w-full overflow-x-auto ${this.props.className}`}>
        <StyledWrapper
          ref={this.editorRef}
          className={wrapperClass}
          $enableFolding={!!this.props.enableFolding}
          $autoHeight={!!this.props.autoHeight}
          $maxHeight={this.props.maxHeight}
          $containOverscroll={!!this.props.containOverscroll}
        />
        {!this.props.hideSecretEye && this.secretEye(this.props.isSecret)}
      </div>
    );
  }
}
export default MultiLineEditor;
