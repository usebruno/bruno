/**
 * KeyBindingsRegistry - Maps key combinations to commands with When clause support
 * This follows VSCode's keybinding system
 * Using functional approach with module-level state
 */

import { getMergedKeyBindings, toMousetrapCombo } from '../providers/Hotkeys/keyMappings';

// Module-level state (singleton)
const keyComboToCommand = new Map(); // keyCombo -> commandId
const commandToKeyCombo = new Map(); // commandId -> [{ combo, when }]
let userKeyBindings = {}; // User overrides from preferences

/**
 * Initialize the registry with user keybindings
 * @param {Object} bindings - User's custom key bindings from preferences
 */
const initialize = (bindings = {}) => {
  userKeyBindings = bindings;
  rebuild();
};

/**
 * Rebuild the registry with current keybindings
 */
const rebuild = () => {
  keyComboToCommand.clear();
  commandToKeyCombo.clear();

  const mergedBindings = getMergedKeyBindings(userKeyBindings);

  for (const [commandId, binding] of Object.entries(mergedBindings)) {
    if (!binding) continue;

    // Get key combos for both mac and windows
    const combos = [];

    if (binding.mac) {
      const combo = toMousetrapCombo(binding.mac);
      if (combo) combos.push({ combo, platform: 'mac' });
    }

    if (binding.windows) {
      const combo = toMousetrapCombo(binding.windows);
      if (combo) combos.push({ combo, platform: 'windows' });
    }

    // Store the command with its key combos
    commandToKeyCombo.set(commandId, {
      combos,
      when: binding.when,
      name: binding.name
    });

    // Map each key combo to the command
    for (const { combo } of combos) {
      if (keyComboToCommand.has(combo)) {
        console.warn(`Key combo "${combo}" is already bound to "${keyComboToCommand.get(combo)}". Conflict with "${commandId}".`);
      }
      keyComboToCommand.set(combo, commandId);
    }
  }
};

/**
 * Get the command ID for a key combo
 * @param {string} combo - The key combo (e.g., 'command+s')
 * @returns {string|null} Command ID or null if not found
 */
const getCommandForCombo = (combo) => {
  return keyComboToCommand.get(combo) || null;
};

/**
 * Get all key combos for a command
 * @param {string} commandId - The command ID
 * @returns {Object|null} Command binding info or null
 */
const getBindingsForCommand = (commandId) => {
  return commandToKeyCombo.get(commandId) || null;
};

/**
 * Get all registered commands
 * @returns {string[]} Array of command IDs
 */
const getAllCommands = () => {
  return Array.from(commandToKeyCombo.keys());
};

/**
 * Check if a key combo is registered
 * @param {string} combo - The key combo
 * @returns {boolean}
 */
const hasCombo = (combo) => {
  return keyComboToCommand.has(combo);
};

/**
 * Update user keybindings and rebuild
 * @param {Object} bindings - New user keybindings
 */
const updateUserBindings = (bindings) => {
  userKeyBindings = bindings;
  rebuild();
};

/**
 * Get Mousetrap-compatible key combos for a specific action
 * @param {string} action - The action/command ID
 * @returns {string[]|null} Array of Mousetrap combos or null
 */
const getCombosForAction = (action) => {
  const binding = commandToKeyCombo.get(action);
  if (!binding) return null;

  const isMac = navigator.platform.toLowerCase().includes('mac');
  const platformCombos = binding.combos.filter((c) =>
    isMac ? c.platform === 'mac' : c.platform === 'windows'
  );

  return platformCombos.length > 0
    ? platformCombos.map((c) => c.combo)
    : null;
};

// Export as singleton object
const keyBindingsRegistry = {
  initialize,
  rebuild,
  getCommandForCombo,
  getBindingsForCommand,
  getAllCommands,
  hasCombo,
  updateUserBindings,
  getCombosForAction
};

export default keyBindingsRegistry;
