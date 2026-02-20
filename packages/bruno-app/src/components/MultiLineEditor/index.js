import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import { MaskedEditor } from 'utils/common/masked-editor';
import StyledWrapper from './StyledWrapper';
import { setupLinkAware } from 'utils/codemirror/linkAware';
import { IconEye, IconEyeOff } from '@tabler/icons';

import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';
import store from 'providers/ReduxStore/index';
import { reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';

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
    this._collapseSidebarKeyMap = null;

    this._lastCloseTabKeySig = null;
    this._lastSendRequestKeySig = null;
    this._lastPrevTabKeySig = null;
    this._lastNextTabKeySig = null;
    this._lastMoveLeftTabKeySig = null;
    this._lastMoveRightTabKeySig = null;
    this._lastChangeLayoutKeySig = null;
    this._lastCollapseSidebarKeySig = null;

    this.state = {
      maskInput: props.isSecret || false // Always mask the input by default (if it's a secret)
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
      } catch (e) {}
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
      mapName: 'multiLineEditor.closeTab',
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
      mapName: 'multiLineEditor.sendRequest',
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
      mapName: 'multiLineEditor.switchToPreviousTab',
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
      mapName: 'multiLineEditor.switchToNextTab',
      handler: () => {
        store.dispatch(switchTab({ direction: 'pagedown' }));
      },
      getSig: () => this._lastNextTabKeySig,
      setSig: (v) => (this._lastNextTabKeySig = v),
      getMap: () => this._nextTabKeyMap,
      setMap: (m) => (this._nextTabKeyMap = m)
    });
  };

  _applyMoveTabLeftKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'moveTabLeft',
      mapName: 'multiLineEditor.moveTabLeft',
      handler: () => {
        store.dispatch(reorderTabs({ direction: -1 }));
      },
      getSig: () => this._lastMoveLeftTabKeySig,
      setSig: (v) => (this._lastMoveLeftTabKeySig = v),
      getMap: () => this._moveLeftTabKeyMap,
      setMap: (m) => (this._moveLeftTabKeyMap = m)
    });
  };

  _applyMoveTabRightKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'moveTabRight',
      mapName: 'multiLineEditor.moveTabRight',
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
      mapName: 'multiLineEditor.changeLayout',
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

  _applyCollapseSidebarKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'collapseSidebar',
      mapName: 'multiLineEditor.collapseSidebar',
      handler: () => {
        store.dispatch(toggleSidebarCollapse());
      },
      getSig: () => this._lastCollapseSidebarKeySig,
      setSig: (v) => (this._lastCollapseSidebarKeySig = v),
      getMap: () => this._collapseSidebarKeyMap,
      setMap: (m) => (this._collapseSidebarKeyMap = m)
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
    this._applyCollapseSidebarKeyMap();
  };

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
      brunoVarInfo: this.props.enableBrunoVarInfo !== false ? {
        variables,
        collection: this.props.collection,
        item: this.props.item
      } : false,
      readOnly: this.props.readOnly,
      tabindex: 0,
      extraKeys: {
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

    // optional debug
    this.editor.on('keydown', this._onKeyDown);

    this.addOverlay(variables);

    // Initialize masking if this is a secret field
    this.setState({ maskInput: this.props.isSecret });
    this._enableMaskedEditor(this.props.isSecret);

    // apply all preference-based hotkey maps
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
      // TODO: temporary fix for keeping cursor state when auto save and new line insertion collide PR#7098
      const nextValue = String(this.props.value ?? '');
      const currentValue = this.editor.getValue();
      if (this.editor.hasFocus?.() && currentValue !== nextValue) {
        this.cachedValue = currentValue;
      } else {
        const cursor = this.editor.getCursor();
        this.cachedValue = nextValue;
        this.editor.setValue(nextValue);
        this.editor.setCursor(cursor);
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
    if (this._unsubscribeStore) {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }

    if (this.brunoAutoCompleteCleanup) {
      this.brunoAutoCompleteCleanup();
    }
    if (this.editor?._destroyLinkAware) {
      this.editor._destroyLinkAware();
    }

    if (this.editor) {
      const maps = [
        this._closeTabKeyMap,
        this._sendRequestKeyMap,
        this._prevTabKeyMap,
        this._nextTabKeyMap,
        this._moveLeftTabKeyMap,
        this._moveRightTabKeyMap,
        this._changeLayoutKeyMap,
        this._collapseSidebarKeyMap
      ];

      maps.forEach((m) => {
        if (!m) return;
        try {
          this.editor.removeKeyMap(m);
        } catch (e) {}
      });

      this._closeTabKeyMap = null;
      this._sendRequestKeyMap = null;
      this._prevTabKeyMap = null;
      this._nextTabKeyMap = null;
      this._moveLeftTabKeyMap = null;
      this._moveRightTabKeyMap = null;
      this._changeLayoutKeyMap = null;
      this._collapseSidebarKeyMap = null;

      this.editor.off('keydown', this._onKeyDown);
      this.editor.getWrapperElement().remove();
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
