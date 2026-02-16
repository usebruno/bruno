const KeyMapping = {
  save: { mac: 'command+s', windows: 'ctrl+s', name: 'Save' },
  sendRequest: { mac: 'command+enter', windows: 'ctrl+enter', name: 'Send Request' },
  editEnvironment: { mac: 'command+e', windows: 'ctrl+e', name: 'Edit Environment' },
  newRequest: { mac: 'command+b', windows: 'ctrl+b', name: 'New Request' },
  globalSearch: { mac: 'command+k', windows: 'ctrl+k', name: 'Global Search' },
  closeTab: { mac: 'command+w', windows: 'ctrl+w', name: 'Close Tab' },
  openPreferences: { mac: 'command+,', windows: 'ctrl+,', name: 'Open Preferences' },
  closeBruno: {
    mac: 'command+Q',
    windows: 'ctrl+shift+q',
    name: 'Close Bruno'
  },
  switchToPreviousTab: {
    mac: 'command+pageup',
    windows: 'ctrl+pageup',
    name: 'Switch to Previous Tab'
  },
  switchToNextTab: {
    mac: 'command+pagedown',
    windows: 'ctrl+pagedown',
    name: 'Switch to Next Tab'
  },
  moveTabLeft: {
    mac: 'command+shift+pageup',
    windows: 'ctrl+shift+pageup',
    name: 'Move Tab Left'
  },
  moveTabRight: {
    mac: 'command+shift+pagedown',
    windows: 'ctrl+shift+pagedown',
    name: 'Move Tab Right'
  },
  closeAllTabs: { mac: 'command+shift+w', windows: 'ctrl+shift+w', name: 'Close All Tabs' },
  collapseSidebar: { mac: 'command+\\', windows: 'ctrl+\\', name: 'Collapse Sidebar' },
  zoomIn: { mac: 'command+=', windows: 'ctrl+=', name: 'Zoom In' },
  zoomOut: { mac: 'command+-', windows: 'ctrl+-', name: 'Zoom Out' },
  resetZoom: { mac: 'command+0', windows: 'ctrl+0', name: 'Reset Zoom' }
};

/**
 * Retrieves the key bindings for a specific operating system.
 *
 * @param {string} os - The operating system (e.g., 'mac', 'windows').
 * @returns {Object} An object containing the key bindings for the specified OS.
 */
export const getKeyBindingsForOS = (os) => {
  const keyBindings = {};
  for (const [action, { name, ...keys }] of Object.entries(KeyMapping)) {
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
 * Retrieves the key bindings for a specific action across all operating systems.
 *
 * @param {string} action - The action for which to retrieve key bindings.
 * @returns {Object|null} An object containing the key bindings for macOS, Windows, or null if the action is not found.
 */
export const getKeyBindingsForActionAllOS = (action) => {
  const actionBindings = KeyMapping[action];

  if (!actionBindings) {
    console.warn(`Action "${action}" not found in KeyMapping.`);
    return null;
  }

  return [actionBindings.mac, actionBindings.windows];
};
