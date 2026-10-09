import { isLinuxOS, isMacOS } from 'utils/common/platform';

export const KEY_BINDING_SECTIONS = [
  {
    heading: 'Tabs',
    bindings: {
      closeTab: { mac: 'command+bind+w', windows: 'ctrl+bind+w', name: 'Close Tab' }, // D
      closeAllTabs: { mac: 'command+bind+shift+bind+w', windows: 'ctrl+bind+shift+bind+w', name: 'Close All Tabs' }, // D
      save: { mac: 'command+bind+s', windows: 'ctrl+bind+s', name: 'Save' }, // D
      saveAllTabs: { mac: 'command+bind+shift+bind+s', windows: 'ctrl+bind+shift+bind+s', name: 'Save All Tabs' }, // D
      reopenLastClosedTab: { mac: 'command+bind+shift+bind+t', windows: 'ctrl+bind+shift+bind+t', name: 'Reopen Last Closed Tab' }, // D
      switchToTabAtPosition: { mac: 'command+bind+1+bind+command+bind+8', windows: 'ctrl+bind+1+bind+ctrl+bind+8', name: 'Switch to Tab at Position', readOnly: true, displayValue: { mac: 'command+bind+1 - command+bind+8', windows: 'ctrl+bind+1 - ctrl+bind+8' } }, // D
      switchToLastTab: { mac: 'command+bind+9', windows: 'ctrl+bind+9', name: 'Switch to Last Tab' }, // D
      switchToPreviousTab: { mac: 'shift+bind+command+bind+[', windows: 'shift+bind+ctrl+bind+[', name: 'Switch to Previous Tab' }, // D
      switchToNextTab: { mac: 'shift+bind+command+bind+]', windows: 'shift+bind+ctrl+bind+]', name: 'Switch to Next Tab' },
      moveTabLeft: { mac: 'command+bind+[', windows: 'ctrl+bind+[', name: 'Move Tab Left' }, // D
      moveTabRight: { mac: 'command+bind+]', windows: 'ctrl+bind+]', name: 'Move Tab Right' }, // D
      switchToTab1: { mac: 'command+bind+1', windows: 'ctrl+bind+1', name: 'Switch to Tab at Position', readOnly: true, hidden: true },
      switchToTab2: { mac: 'command+bind+2', windows: 'ctrl+bind+2', name: 'Switch to Tab at Position', readOnly: true, hidden: true },
      switchToTab3: { mac: 'command+bind+3', windows: 'ctrl+bind+3', name: 'Switch to Tab at Position', readOnly: true, hidden: true },
      switchToTab4: { mac: 'command+bind+4', windows: 'ctrl+bind+4', name: 'Switch to Tab at Position', readOnly: true, hidden: true },
      switchToTab5: { mac: 'command+bind+5', windows: 'ctrl+bind+5', name: 'Switch to Tab at Position', readOnly: true, hidden: true },
      switchToTab6: { mac: 'command+bind+6', windows: 'ctrl+bind+6', name: 'Switch to Tab at Position', readOnly: true, hidden: true },
      switchToTab7: { mac: 'command+bind+7', windows: 'ctrl+bind+7', name: 'Switch to Tab at Position', readOnly: true, hidden: true },
      switchToTab8: { mac: 'command+bind+8', windows: 'ctrl+bind+8', name: 'Switch to Tab at Position', readOnly: true, hidden: true }
    }
  },
  {
    heading: 'Sidebar',
    bindings: {
      sidebarSearch: { mac: 'command+bind+f', windows: 'ctrl+bind+f', name: 'Search Sidebar' }, // D
      copyItem: { mac: 'command+bind+c', windows: 'ctrl+bind+c', name: 'Copy Item' }, // D
      pasteItem: { mac: 'command+bind+v', windows: 'ctrl+bind+v', name: 'Paste Item' }, // D
      cloneItem: { mac: 'command+bind+d', windows: 'ctrl+bind+d', name: 'Clone Item' }, // D
      renameItem: { mac: 'command+bind+r', windows: 'ctrl+bind+r', name: 'Rename Item' }, // D
      collapseSidebar: { mac: 'command+bind+\\', windows: 'ctrl+bind+\\', name: 'Collapse Sidebar' } // D
    }
  },
  {
    heading: 'Requests',
    bindings: {
      sendRequest: { mac: 'command+bind+enter', windows: 'ctrl+bind+enter', name: 'Send Request' }, // D
      changeLayout: { mac: 'command+bind+j', windows: 'ctrl+bind+j', name: 'Change Orientation' } // D
    }
  },
  {
    heading: 'Editor',
    bindings: {
      triggerAutocomplete: { mac: 'ctrl+bind+space', windows: 'ctrl+bind+space', name: 'Trigger Autocomplete' }
    }
  },
  {
    heading: 'Collections & Environment',
    bindings: {
      importCollection: { mac: 'command+bind+o', windows: 'ctrl+bind+o', name: 'Import Collection' }, // D
      editEnvironment: { mac: 'command+bind+e', windows: 'ctrl+bind+e', name: 'Edit Environment' }, // D
      newRequest: { mac: 'command+bind+n', windows: 'ctrl+bind+n', name: 'New Request' } // D
    }
  },
  {
    heading: 'Search',
    bindings: {
      globalSearch: { mac: 'command+bind+k', windows: 'ctrl+bind+k', name: 'Global Search' } // D
    }
  },
  {
    heading: 'View',
    bindings: {
      zoomIn: { mac: 'command+bind+=', windows: 'ctrl+bind+=', name: 'Zoom In' },
      zoomOut: { mac: 'command+bind+-', windows: 'ctrl+bind+-', name: 'Zoom Out' },
      resetZoom: { mac: 'command+bind+0', windows: 'ctrl+bind+0', name: 'Reset Zoom' }
    }
  },
  {
    heading: 'Developer Tool',
    bindings: {
      openTerminal: { mac: 'command+bind+t', windows: 'ctrl+bind+t', name: 'Open in Terminal' } // D
    }
  },
  {
    heading: 'Others',
    bindings: {
      openPreferences: { mac: 'command+bind+,', windows: 'ctrl+bind+,', name: 'Open Preferences' }, // D
      closeBruno: { mac: 'command+bind+q', windows: 'ctrl+bind+shift+bind+q', name: 'Close Bruno' } // D
    }
  }
];

export const KEY_BINDING_SEPARATOR = '+bind+';

// Linux has no bindings of its own and shares the 'windows' set.
export const getKeyBindingOS = () => (isMacOS() ? 'mac' : 'windows');

// Linux is separate for display only: its Meta key is labelled Super, not Win.
export const getKeyBindingDisplayOS = () => (isLinuxOS() ? 'linux' : getKeyBindingOS());

const BINDING_OS_BY_DISPLAY_OS = { mac: 'mac', windows: 'windows', linux: 'windows' };

export const MODIFIER_SYMBOLS = {
  mac: {
    command: '⌘',
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧'
  },
  windows: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    command: 'Win'
  },
  linux: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    command: 'Super'
  }
};

// Display only; stored bindings keep their own order. macOS follows Apple's HIG;
// Windows/Linux match Electron's native menus (drawn by Chromium).
const DISPLAY_MODIFIER_ORDER = {
  mac: ['ctrl', 'alt', 'shift', 'command'],
  windows: ['command', 'alt', 'ctrl', 'shift']
};

export const fromKeysString = (keysStr) => (keysStr ? keysStr.split(KEY_BINDING_SEPARATOR).filter(Boolean) : []);

export const orderKeysForDisplay = (keysArr, os) => {
  const modifierOrder = DISPLAY_MODIFIER_ORDER[os] || DISPLAY_MODIFIER_ORDER.windows;
  const rank = (key) => {
    const index = modifierOrder.indexOf(key);
    return index === -1 ? modifierOrder.length : index;
  };
  return [...keysArr].sort((a, b) => rank(a) - rank(b));
};

export const formatSingleKeyForDisplay = (key, os) => {
  if (MODIFIER_SYMBOLS[os]?.[key]) return MODIFIER_SYMBOLS[os][key];
  if (key.length === 1) return key.toUpperCase();

  const SPECIAL_LABELS = {
    enter: os === 'mac' ? '↩' : 'Enter',
    backspace: os === 'mac' ? '⌫' : 'Backspace',
    tab: os === 'mac' ? '⇥' : 'Tab',
    delete: os === 'mac' ? '⌦' : 'Delete',
    esc: os === 'mac' ? '⎋' : 'Esc',
    space: os === 'mac' ? '␣' : 'Space',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    home: 'Home',
    end: 'End'
  };

  return SPECIAL_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

export const formatKeysForDisplay = (keysArr, os, separator = ' + ') => {
  if (!keysArr?.length) return '';
  return orderKeysForDisplay(keysArr, os).map((key) => formatSingleKeyForDisplay(key, os)).join(separator);
};

export const getKeyBindingForActionByOS = (action, userKeyBindings, os) => {
  const merged = getMergedKeyBindings(userKeyBindings);
  return merged?.[action]?.[os] || '';
};

export const getKeyBindingDisplayTextByOS = (action, userKeyBindings, displayOS, separator) => {
  const keysStr = getKeyBindingForActionByOS(action, userKeyBindings, BINDING_OS_BY_DISPLAY_OS[displayOS]);
  return formatKeysForDisplay(fromKeysString(keysStr), displayOS, separator);
};

/**
 * Converts keybindings from storage format (+bind+) to Mousetrap format (+)
 * Storage format uses +bind+ as separator to avoid conflicts with the actual + key
 * Mousetrap uses + as the separator
 * Also converts arrow key names to Mousetrap format
 *
 * @param {string} keysStr - Keybinding string in storage format
 * @returns {string|null} Keybinding string in Mousetrap format, or null if empty
 */
export const toMousetrapCombo = (keysStr) => {
  if (!keysStr) return null;

  // Split by +bind+ separator
  const parts = fromKeysString(keysStr);

  // Convert arrow key names from browser format to Mousetrap format
  const converted = parts.map((part) => {
    const lower = part.toLowerCase();
    if (lower === 'arrowup') return 'up';
    if (lower === 'arrowdown') return 'down';
    if (lower === 'arrowleft') return 'left';
    if (lower === 'arrowright') return 'right';
    return lower;
  });

  return converted.join('+');
};

/**
 * Merges default key bindings with user preferences.
 * Uses KEY_BINDING_SECTIONS as the source of truth for defaults.
 *
 * @param {Object} userKeyBindings - User's custom key bindings from preferences (preferences.keyBindings)
 * @returns {Object} Merged key bindings object
 */
export const getMergedKeyBindings = (userKeyBindings) => {
  const merged = {};

  // Start with defaults from KEY_BINDING_SECTIONS (source of truth)
  for (const section of KEY_BINDING_SECTIONS) {
    for (const [action, binding] of Object.entries(section.bindings || {})) {
      merged[action] = { ...binding };
    }
  }

  // Override with user preferences
  if (userKeyBindings && typeof userKeyBindings === 'object') {
    for (const [action, binding] of Object.entries(userKeyBindings)) {
      if (merged[action]) {
        merged[action] = {
          ...merged[action],
          ...binding
        };
      }
    }
  }

  return merged;
};

/**
 * Retrieves the Mousetrap-compatible key combos for a specific action across all operating systems.
 * Reads from merged defaults + user preferences.
 *
 * @param {string} action - The action for which to retrieve key bindings.
 * @param {Object} [userKeyBindings] - User's custom key bindings from preferences
 * @returns {string[]|null} Array of Mousetrap-compatible combo strings, or null if the action is not found.
 */
export const getKeyBindingsForActionAllOS = (action, userKeyBindings) => {
  const merged = getMergedKeyBindings(userKeyBindings);
  const actionBindings = merged[action];

  if (!actionBindings) {
    console.warn(`Action "${action}" not found in KeyMapping.`);
    return null;
  }

  const combo = toMousetrapCombo(actionBindings[getKeyBindingOS()]);
  return combo ? [combo] : null;
};
