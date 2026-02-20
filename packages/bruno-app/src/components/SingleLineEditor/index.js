import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { MaskedEditor } from 'utils/common/masked-editor';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { setupLinkAware } from 'utils/codemirror/linkAware';

import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';
import store from 'providers/ReduxStore/index';
import { reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { savePreferences } from 'providers/ReduxStore/slices/app';

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

    // OPTIONAL debug
    this.lastKeybinding = null;
    this.lastKeyEvent = null;

    // keymap management
    this._unsubscribeStore = null;

    this._closeTabKeyMap = null;
    this._sendRequestKeyMap = null;
    this._prevTabKeyMap = null;
    this._nextTabKeyMap = null;

    this._moveLeftTabKeyMap = null;
    this._moveRightTabKeyMap = null;

    this._changeLayoutKeyMap = null;

    this._lastCloseTabKeySig = null;
    this._lastSendRequestKeySig = null;
    this._lastPrevTabKeySig = null;
    this._lastNextTabKeySig = null;

    this._lastMoveLeftTabKeySig = null;
    this._lastMoveRightTabKeySig = null;

    this._lastChangeLayoutKeySig = null;

    this.state = {
      maskInput: props.isSecret || false
    };
  }

  convertToCodeMirrorFormat = (combo) => {
    if (!combo || typeof combo !== 'string') return null;

    const normalized = combo
      .replace(/-/g, '+')
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => p.toLowerCase() !== 'bind') // remove bind tokens
      .join('+');

    const parts = normalized.split('+').map((p) => p.trim()).filter(Boolean);

    const out = parts.map((key) => {
      const lower = key.toLowerCase();

      if (lower === 'command' || lower === 'cmd') return 'Cmd';
      if (lower === 'control' || lower === 'ctrl') return 'Ctrl';
      if (lower === 'option' || lower === 'alt') return 'Alt';
      if (lower === 'shift') return 'Shift';
      if (lower === 'mod') return 'Mod';

      if (lower === 'enter' || lower === 'return') return 'Enter';
      if (lower === 'esc' || lower === 'escape') return 'Esc';
      if (lower === 'space') return 'Space';
      if (lower === 'tab') return 'Tab';
      if (lower === 'backspace') return 'Backspace';
      if (lower === 'delete' || lower === 'del') return 'Delete';
      if (lower === 'up') return 'Up';
      if (lower === 'down') return 'Down';
      if (lower === 'left') return 'Left';
      if (lower === 'right') return 'Right';

      if (key.length === 1) return key.toUpperCase();
      return key.charAt(0).toUpperCase() + key.slice(1);
    });

    return out.join('-');
  };

  _applyActionKeyMap = ({ actionName, handler, mapName, getSig, setSig, getMap, setMap }) => {
    if (!this.editor) return;

    const oldMap = getMap();
    if (oldMap) {
      try {
        this.editor.removeKeyMap(oldMap);
      } catch (e) { }
      setMap(null);
    }

    let combos = [];
    try {
      const state = store.getState();
      const userKeyBindings = state.app.preferences?.keyBindings || {};
      combos = getKeyBindingsForActionAllOS(actionName, userKeyBindings) || [];
    } catch (e) {
      combos = [];
    }

    const cmCombos = combos.map((k) => this.convertToCodeMirrorFormat(k)).filter(Boolean);
    const sig = cmCombos.join('|');
    setSig(sig);

    if (!cmCombos.length) return;

    const cmHandler = () => {
      handler?.();
      return true;
    };

    const keyMap = { name: mapName };
    cmCombos.forEach((cmKey) => {
      keyMap[cmKey] = cmHandler;
    });

    setMap(keyMap);
    this.editor.addKeyMap(keyMap);
  };

  _applyCloseTabKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'closeTab',
      mapName: 'singleLineEditor.closeTab',
      handler: () => window.dispatchEvent(new CustomEvent('close-active-tab')),
      getSig: () => this._lastCloseTabKeySig,
      setSig: (v) => (this._lastCloseTabKeySig = v),
      getMap: () => this._closeTabKeyMap,
      setMap: (m) => (this._closeTabKeyMap = m)
    });
  };

  _applySendRequestKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'sendRequest',
      mapName: 'singleLineEditor.sendRequest',
      handler: () => {
        if (this.props.onRun) this.props.onRun();
      },
      getSig: () => this._lastSendRequestKeySig,
      setSig: (v) => (this._lastSendRequestKeySig = v),
      getMap: () => this._sendRequestKeyMap,
      setMap: (m) => (this._sendRequestKeyMap = m)
    });
  };

  _applySwitchPrevTabKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'switchToPreviousTab',
      mapName: 'singleLineEditor.switchToPreviousTab',
      handler: () => {
        store.dispatch(switchTab({ direction: 'pageup' }));
      },
      getSig: () => this._lastPrevTabKeySig,
      setSig: (v) => (this._lastPrevTabKeySig = v),
      getMap: () => this._prevTabKeyMap,
      setMap: (m) => (this._prevTabKeyMap = m)
    });
  };

  _applySwitchNextTabKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'switchToNextTab',
      mapName: 'singleLineEditor.switchToNextTab',
      handler: () => {
        store.dispatch(switchTab({ direction: 'pagedown' }));
      },
      getSig: () => this._lastNextTabKeySig,
      setSig: (v) => (this._lastNextTabKeySig = v),
      getMap: () => this._nextTabKeyMap,
      setMap: (m) => (this._nextTabKeyMap = m)
    });
  };

  // NEW: Move tab left
  _applyMoveTabLeftKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'moveTabLeft',
      mapName: 'singleLineEditor.moveTabLeft',
      handler: () => {
        store.dispatch(reorderTabs({ direction: -1 }));
      },
      getSig: () => this._lastMoveLeftTabKeySig,
      setSig: (v) => (this._lastMoveLeftTabKeySig = v),
      getMap: () => this._moveLeftTabKeyMap,
      setMap: (m) => (this._moveLeftTabKeyMap = m)
    });
  };

  // NEW: Move tab right
  _applyMoveTabRightKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'moveTabRight',
      mapName: 'singleLineEditor.moveTabRight',
      handler: () => {
        store.dispatch(reorderTabs({ direction: 1 }));
      },
      getSig: () => this._lastMoveRightTabKeySig,
      setSig: (v) => (this._lastMoveRightTabKeySig = v),
      getMap: () => this._moveRightTabKeyMap,
      setMap: (m) => (this._moveRightTabKeyMap = m)
    });
  };

  _applyChangeLayoutKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'changeLayout',
      mapName: 'singleLineEditor.changeLayout',
      handler: () => {
        const state = store.getState();
        const preferences = state.app.preferences;
        const currentOrientation = preferences?.layout?.responsePaneOrientation || 'horizontal';
        const newOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        const updatedPreferences = {
          ...preferences,
          layout: {
            ...preferences.layout,
            responsePaneOrientation: newOrientation
          }
        };
        store.dispatch(savePreferences(updatedPreferences));
      },
      getSig: () => this._lastChangeLayoutKeySig,
      setSig: (v) => (this._lastChangeLayoutKeySig = v),
      getMap: () => this._changeLayoutKeyMap,
      setMap: (m) => (this._changeLayoutKeyMap = m)
    });
  };

  _applyAllHotkeyMaps = () => {
    this._applyCloseTabKeyMap();
    this._applySendRequestKeyMap();
    this._applySwitchPrevTabKeyMap();
    this._applySwitchNextTabKeyMap();

    this._applyMoveTabLeftKeyMap();
    this._applyMoveTabRightKeyMap();

    this._applyChangeLayoutKeyMap();
  };

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

    // optional debug
    this.editor.on('keydown', this._onKeyDown);

    this.addOverlay(variables);
    this._enableMaskedEditor(this.props.isSecret);
    this.setState({ maskInput: this.props.isSecret });

    // Add newline arrow markers if enabled
    if (this.props.showNewlineArrow) {
      this._updateNewlineMarkers();
    }
    setupLinkAware(this.editor);

    // apply all maps
    this._applyAllHotkeyMaps();

    // keep updated if preferences change
    this._unsubscribeStore = store.subscribe(() => {
      this._applyAllHotkeyMaps();
    });
  }

  // OPTIONAL debug only
  _onKeyDown = (_cm, e) => {
    if (!e) return;

    let keyLabel = e.key === ' ' ? 'Space' : e.key;
    const modifierKeys = new Set(['Shift', 'Control', 'Alt', 'Meta']);
    const parts = [];

    if (e.metaKey) parts.push('Cmd');
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    if (keyLabel && !modifierKeys.has(keyLabel)) {
      if (typeof keyLabel === 'string' && keyLabel.length === 1) keyLabel = keyLabel.toUpperCase();
      parts.push(keyLabel);
    }

    this.lastKeybinding = parts.join('-') || null;
    this.lastKeyEvent = {
      key: e.key,
      code: e.code,
      ctrlKey: !!e.ctrlKey,
      metaKey: !!e.metaKey,
      altKey: !!e.altKey,
      shiftKey: !!e.shiftKey
    };
  };

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
      // TODO: temporary fix for keeping cursor state when auto save and new line insertion collide PR#7098
      const nextValue = String(this.props.value ?? '');
      const currentValue = this.editor.getValue();
      if (this.editor.hasFocus?.() && currentValue !== nextValue && nextValue !== '') {
        this.cachedValue = currentValue;
      } else {
        const cursor = this.editor.getCursor();
        this.cachedValue = nextValue;
        this.editor.setValue(nextValue);
        this.editor.setCursor(cursor);

        // Update newline markers after value change
        if (this.props.showNewlineArrow) {
          this._updateNewlineMarkers();
        }
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
    if (this._unsubscribeStore) {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }

    if (this.editor) {
      const maps = [
        this._closeTabKeyMap,
        this._sendRequestKeyMap,
        this._prevTabKeyMap,
        this._nextTabKeyMap,
        this._moveLeftTabKeyMap,
        this._moveRightTabKeyMap,
        this._changeLayoutKeyMap
      ];

      maps.forEach((m) => {
        if (!m) return;
        try {
          this.editor.removeKeyMap(m);
        } catch (e) { }
      });

      this._closeTabKeyMap = null;
      this._sendRequestKeyMap = null;
      this._prevTabKeyMap = null;
      this._nextTabKeyMap = null;
      this._moveLeftTabKeyMap = null;
      this._moveRightTabKeyMap = null;
      this._changeLayoutKeyMap = null;

      if (this.editor?._destroyLinkAware) {
        this.editor._destroyLinkAware();
      }
      this.editor.off('change', this._onEdit);
      this.editor.off('paste', this._onPaste);
      this.editor.off('keydown', this._onKeyDown);
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
