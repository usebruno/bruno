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
      changeLayout: { mac: 'command+bind+j', windows: 'ctrl+bind+j', name: 'Change Orientation' }, // D
      focusUrlBar: { mac: 'command+bind+l', windows: 'ctrl+bind+l', name: 'Focus URL Bar' } // D
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
  const parts = keysStr.split('+bind+').filter(Boolean);

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

  const combos = [];

  // Detect current OS and use appropriate bindings only
  const isMac = navigator.platform.toLowerCase().includes('mac');

  if (isMac && actionBindings.mac) {
    const combo = toMousetrapCombo(actionBindings.mac);
    if (combo) combos.push(combo);
  } else if (!isMac && actionBindings.windows) {
    const combo = toMousetrapCombo(actionBindings.windows);
    if (combo) combos.push(combo);
  }

  // console.log('[keyMappings] getKeyBindingsForActionAllOS:', action, '->', combos);
  return combos.length > 0 ? combos : null;
};
