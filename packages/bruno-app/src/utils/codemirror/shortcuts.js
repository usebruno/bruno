import { getKeyBindingsForActionAllOS } from '../../providers/Hotkeys/keyMappings';
import store from '../../providers/ReduxStore/index';
import commandRegistry from '../../services/command-registry';

const CodeMirror = require('codemirror');

// Actions that should work within CodeMirror editor
const EDITOR_ACTIONS = [
  'save',
  'saveAllTabs',
  'sendRequest',
  'closeTab'
];

/**
 * Converts user keybinding format to CodeMirror format
 */
function convertToCodeMirrorFormat(combo) {
  if (!combo || typeof combo !== 'string') return null;

  const normalized = combo
    .replace(/-/g, '+')
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p.toLowerCase() !== 'bind')
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

    // Simple: lowercase for letter keys
    if (key.length === 1) {
      return key.toLowerCase();
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  });

  return out.join('-');
}

/**
 * Builds a consolidated CodeMirror keymap from all configured keybinding actions.
 */
function buildKeymap(context) {
  let state;
  try {
    const reduxState = store.getState();
    state = reduxState;
  } catch (e) {
    state = { app: { preferences: {} } };
  }

  const userKeyBindings = state.app.preferences?.keyBindings || {};
  const keyMap = {};

  // Build keymap entries for each action
  EDITOR_ACTIONS.forEach((actionName) => {
    const combos = getKeyBindingsForActionAllOS(actionName, userKeyBindings) || [];
    if (combos.length === 0) return;

    const cmCombos = combos
      .map((k) => convertToCodeMirrorFormat(k))
      .filter(Boolean);

    if (cmCombos.length > 0) {
      cmCombos.forEach((cmKey) => {
        keyMap[cmKey] = (cm) => {
          // Execute the command via CommandRegistry
          commandRegistry.execute(actionName, context);
          return true;
        };
      });
    }
  });

  return keyMap;
}

/**
 * Sets up keyboard shortcuts for a CodeMirror editor instance.
 */
function setupShortcuts(editor, context = {}) {
  if (!editor) {
    return () => { };
  }

  let unsubscribeStore = null;

  const applyKeyMap = () => {
    if (!editor) return;
    const currentExtraKeys = editor.getOption('extraKeys') || {};
    const keyMap = buildKeymap(context);
    const mergedExtraKeys = { ...currentExtraKeys, ...keyMap };
    editor.setOption('extraKeys', mergedExtraKeys);
  };

  applyKeyMap();

  // Get user key bindings for the keydown handler
  const getUserKeyBindings = () => {
    try {
      return store.getState().app.preferences?.keyBindings || {};
    } catch (e) {
      return {};
    }
  };

  // Track key combo like Mousetrap does
  editor.on('keydown', (cm, event) => {
    const key = event.key;
    const mods = [];

    // Use consistent order: command/ctrl first, then shift, then alt
    // Use 'command' to match keyMappings format
    if (event.metaKey) mods.push('command');
    if (event.ctrlKey) mods.push('ctrl');
    if (event.shiftKey) mods.push('shift');
    if (event.altKey) mods.push('alt');

    // Skip modifier-only keys
    if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
      return;
    }

    // Build combo: modifiers first, then the key (lowercase)
    // Use 'command' instead of 'cmd' to match keyMappings format
    const combo = [...mods, key.toLowerCase()].join('+');
    console.log('Combo:', combo);

    // Get latest user key bindings
    const currentUserKeyBindings = getUserKeyBindings();
    console.log('User key bindings:', currentUserKeyBindings);

    // Check if this combo matches any of our shortcuts (using user keybindings)
    let matched = false;
    EDITOR_ACTIONS.forEach((actionName) => {
      const combos = getKeyBindingsForActionAllOS(actionName, currentUserKeyBindings) || [];
      console.log('Action:', actionName, 'Combos:', combos, 'Includes:', combos.includes(combo));
      if (combos.includes(combo)) {
        matched = true;
        commandRegistry.execute(actionName, context);
      }
    });

    // Only prevent default if it's a shortcut we handle
    if (matched) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  unsubscribeStore = store.subscribe(() => {
    applyKeyMap();
  });

  return () => {
    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
  };
}

export { setupShortcuts, buildKeymap, convertToCodeMirrorFormat };
