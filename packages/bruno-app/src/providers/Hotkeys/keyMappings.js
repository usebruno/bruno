export const DEFAULT_KEY_BINDINGS = {
  save: { mac: 'command+bind+s', windows: 'ctrl+bind+s', name: 'Save' },
  sendRequest: { mac: 'command+bind+enter', windows: 'ctrl+bind+enter', name: 'Send Request' },
  editEnvironment: { mac: 'command+bind+e', windows: 'ctrl+bind+e', name: 'Edit Environment' },
  newRequest: { mac: 'command+bind+n', windows: 'ctrl+bind+n', name: 'New Request' },
  importCollection: { mac: 'command+bind+o', windows: 'ctrl+bind+o', name: 'Import Collection' },
  globalSearch: { mac: 'command+bind+k', windows: 'ctrl+bind+k', name: 'Global Search' },
  sidebarSearch: { mac: 'command+bind+f', windows: 'ctrl+bind+f', name: 'Search Sidebar' },
  closeTab: { mac: 'command+bind+w', windows: 'ctrl+bind+w', name: 'Close Tab' },
  openPreferences: { mac: 'command+bind+,', windows: 'ctrl+bind+,', name: 'Open Preferences' },
  changeLayout: { mac: 'command+bind+j', windows: 'ctrl+bind+j', name: 'Change Orientation' },
  closeBruno: {
    mac: 'command+bind+q',
    windows: 'ctrl+bind+shift+bind+q',
    name: 'Close Bruno'
  },
  switchToPreviousTab: {
    mac: 'command+bind+2',
    windows: 'ctrl+bind+2',
    name: 'Switch to Previous Tab'
  },
  switchToNextTab: {
    mac: 'command+bind+1',
    windows: 'ctrl+bind+1',
    name: 'Switch to Next Tab'
  },
  moveTabLeft: {
    mac: 'command+bind+[',
    windows: 'ctrl+bind+[',
    name: 'Move Tab Left'
  },
  moveTabRight: {
    mac: 'command+bind+]',
    windows: 'ctrl+bind+]',
    name: 'Move Tab Right'
  },
  closeAllTabs: { mac: 'command+bind+shift+bind+w', windows: 'ctrl+bind+shift+bind+w', name: 'Close All Tabs' },
  collapseSidebar: { mac: 'command+bind+\\', windows: 'ctrl+bind+\\', name: 'Collapse Sidebar' },
  zoomIn: { mac: 'command+bind+=', windows: 'ctrl+bind+=', name: 'Zoom In' },
  zoomOut: { mac: 'command+bind+-', windows: 'ctrl+bind+-', name: 'Zoom Out' },
  resetZoom: { mac: 'command+bind+0', windows: 'ctrl+bind+0', name: 'Reset Zoom' },
  cloneItem: { mac: 'command+bind+d', windows: 'ctrl+bind+d', name: 'Clone Item' },
  copyItem: { mac: 'command+bind+c', windows: 'ctrl+bind+c', name: 'Copy Item' },
  pasteItem: { mac: 'command+bind+v', windows: 'ctrl+bind+v', name: 'Paste Item' },
  renameItem: { mac: 'command+bind+r', windows: 'ctrl+bind+r', name: 'Rename Item' }
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
 * Retrieves the key bindings for a specific operating system.
 *
 * @param {string} os - The operating system (e.g., 'mac', 'windows').
 * @returns {Object} An object containing the key bindings for the specified OS.
 */
export const getKeyBindingsForOS = (os) => {
  const keyBindings = {};
  for (const [action, { name, ...keys }] of Object.entries(DEFAULT_KEY_BINDINGS)) {
    if (keys[os]) {
      keyBindings[action] = {
        keys: keys[os],
        name
      };
    }
  }
  return keyBindings;
};

/**
 * Merges default key bindings with user preferences.
 *
 * @param {Object} userKeyBindings - User's custom key bindings from preferences (preferences.keyBindings)
 * @returns {Object} Merged key bindings object
 */
export const getMergedKeyBindings = (userKeyBindings) => {
  const merged = {};

  // Start with defaults
  for (const [action, binding] of Object.entries(DEFAULT_KEY_BINDINGS)) {
    merged[action] = { ...binding };
  }

  // Override with user preferences
  if (userKeyBindings && typeof userKeyBindings === 'object') {
    for (const [action, binding] of Object.entries(userKeyBindings)) {
      if (merged[action]) {
        merged[action] = { ...merged[action], ...binding };
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
  if (actionBindings.mac) {
    const combo = toMousetrapCombo(actionBindings.mac);
    if (combo) combos.push(combo);
  }
  if (actionBindings.windows) {
    const combo = toMousetrapCombo(actionBindings.windows);
    if (combo) combos.push(combo);
  }

  return combos.length > 0 ? combos : null;
};
