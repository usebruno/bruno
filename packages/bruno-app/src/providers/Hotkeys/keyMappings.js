const KeyMapping = {
  save: { mac: 'command+bind+s', windows: 'ctrl+bind+s', name: 'Save' },
  sendRequest: { mac: 'command+bind+enter', windows: 'ctrl+bind+enter', name: 'Send Request' },
  editEnvironment: { mac: 'command+bind+e', windows: 'ctrl+bind+e', name: 'Edit Environment' },
  newRequest: { mac: 'command+bind+n', windows: 'ctrl+bind+n', name: 'New Request' },
  importCollection: { mac: 'command+bind+o', windows: 'ctrl+bind+o', name: 'Import Collection' },
  globalSearch: { mac: 'command+bind+k', windows: 'ctrl+bind+k', name: 'Global Search' },
  sidebarSearch: { mac: 'command+bind+f', windows: 'ctrl+bind+f', name: 'Search Sidebar' },
  closeTab: { mac: 'command+bind+w', windows: 'ctrl+bind+w', name: 'Close Tab' }, // works but not when active in any editor
  openPreferences: { mac: 'command+bind+,', windows: 'ctrl+bind+,', name: 'Open Preferences' },
  changeLayout: { mac: 'x+bind+v', windows: 'x+bind+v', name: 'Change Orientation' },
  closeBruno: {
    mac: 'command+bind+Q',
    windows: 'ctrl+bind+shift+bind+q',
    name: 'Close Bruno'
  },
  switchToPreviousTab: {
    mac: 'command+bind+pageup',
    windows: 'fn+bind+command+bind+arrowup',
    name: 'Switch to Previous Tab'
  },
  switchToNextTab: {
    mac: 'command+bind+pagedown',
    windows: 'fn+bind+command+bind+arrowdown',
    name: 'Switch to Next Tab'
  },
  moveTabLeft: {
    mac: 'command+bind+shift+bind+pageup',
    windows: 'ctrl+bind+shift+bind+pageup',
    name: 'Move Tab Left'
  },
  moveTabRight: {
    mac: 'command+bind+shift+bind+pagedown',
    windows: 'ctrl+bind+shift+bind+pagedown',
    name: 'Move Tab Right'
  },
  closeAllTabs: { mac: 'command+bind+shift+bind+w', windows: 'ctrl+bind+shift+bind+w', name: 'Close All Tabs' },
  collapseSidebar: { mac: 'command+bind+\\', windows: 'ctrl+bind+\\', name: 'Collapse Sidebar' },
  zoomIn: { mac: 'command+bind+=', windows: 'ctrl+bind+=', name: 'Zoom In' },
  zoomOut: { mac: 'command+bind+-', windows: 'ctrl+bind+-', name: 'Zoom Out' },
  resetZoom: { mac: 'command+bind+0', windows: 'ctrl+bind+0', name: 'Reset Zoom' },
  cloneItem: { mac: 'command+bind+d', windows: 'ctrl+bind+d', name: 'Clone Item' },
  copyItem: { mac: 'command+bind+c', windows: 'ctrl+bind+c', name: 'Copy Item' },
  paseItem: { mac: 'command+bind+v', windows: 'ctrl+bind+v', name: 'Paste Item' }
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
