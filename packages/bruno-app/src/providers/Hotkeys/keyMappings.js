const KeyMapping = {
  save: { mac: 'command+s', windows: 'ctrl+s', name: 'Save' },
  sendRequest: { mac: 'command+enter', windows: 'ctrl+enter', name: 'Send Request' },
  editEnvironment: { mac: 'command+e', windows: 'ctrl+e', name: 'Edit Environment' },
  // newRequest: { mac: 'command+b', windows: 'ctrl+b', name: 'New Request' },
  newRequest: [
    { mac: 'command+b', windows: 'ctrl+b', name: 'New Request' }, 
    { mac: 'command+n', windows: 'ctrl+n', name: 'New Request' }
  ],
  closeTab: { mac: 'command+w', windows: 'ctrl+w', name: 'Close Tab' },
  openPreferences: { mac: 'command+,', windows: 'ctrl+,', name: 'Open Preferences' },
  minimizeWindow: {
    mac: 'command+Shift+Q',
    windows: 'control+Shift+Q',
    name: 'Minimize Window'
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
  closeAllTabs: { mac: 'command+shift+w', windows: 'ctrl+shift+w', name: 'Close All Tabs' }
};

/**
 * Retrieves the key bindings for a specific operating system.
 *
 * @param {string} os - The operating system (e.g., 'mac', 'windows').
 * @returns {Object} An object containing the key bindings for the specified OS.
 */
export const getKeyBindingsForOS = (os) => {
  const keyBindings = {}; 

  for (const [action, keysObj] of Object.entries(KeyMapping)) {
    //const [action, keysObj] = entry;
    if(Array.isArray(keysObj)) {
      let osKeys = [];
      keysObj.forEach((keys) => {
        if (keys[os]) {
          osKeys.push(keys[os]);
        }
      });

      keyBindings[action] = osKeys.length > 0 ? { keys: osKeys, name: keysObj[0].name } : null;
    } else {
      if (keysObj[os]) {
        keyBindings[action] = {
          keys: keysObj[os],
          name: keysObj.name || 'Unknown Action'
        };
      }
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

  if (actionBindings && Array.isArray(actionBindings)) {
    if (actionBindings.length === 0) {
      console.warn(`Action "${action}" not found in KeyMapping.`);
      return null;
    }
    
    // If the action has multiple bindings, return the keys for both mac and windows 
    let keysArray = [];
    actionBindings.forEach((binding) => {
      if (binding.mac && binding.windows) {
        keysArray.push(binding.mac, binding.windows);
      }
    });

    return keysArray;
  }
  
  return [actionBindings.mac, actionBindings.windows];
};
