/**
 * CommandRegistry - Central registry for all commands in Bruno
 * This follows VSCode's command pattern for keybinding support
 * Using functional approach with module-level state
 */

// Module-level state (singleton)
const commands = new Map();
const metadata = new Map();

/**
 * Register a command with the registry
 * @param {string} id - Unique command identifier (e.g., 'save', 'newRequest')
 * @param {Function} handler - Function to execute when command is invoked
 * @param {Object} meta - Command metadata
 * @param {string} meta.name - Display name
 * @param {string} meta.description - Command description
 * @param {string} meta.when - When clause (optional)
 * @param {string} meta.scope - Scope: 'global' (works in input fields), 'sidebar' (blocked in input fields), 'passthrough' (falls through to browser when when-clause fails). Defaults to 'sidebar'.
 */
const register = (id, handler, meta = {}) => {
  commands.set(id, handler);
  metadata.set(id, {
    id,
    name: meta.name || id,
    description: meta.description || '',
    when: meta.when,
    scope: meta.scope || 'sidebar'
  });
};

/**
 * Execute a command by ID
 * @param {string} id - Command identifier
 * @param {...any} args - Arguments to pass to the handler
 * @returns {any} Result from the command handler
 */
const execute = (id, ...args) => {
  const handler = commands.get(id);

  if (!handler) {
    console.error(`Command "${id}" is not registered.`);
    return null;
  }

  try {
    return handler(...args);
  } catch (error) {
    console.error(`Error executing command "${id}":`, error);
    return null;
  }
};

/**
 * Get metadata for a command
 * @param {string} id - Command identifier
 * @returns {Object|null} Command metadata
 */
const getMetadata = (id) => {
  return metadata.get(id) || null;
};

/**
 * Get all commands with their metadata
 * @returns {Array} Array of command objects with metadata
 */
const getAllWithMetadata = () => {
  const result = [];
  for (const [id, handler] of commands.entries()) {
    result.push({
      id,
      handler,
      metadata: metadata.get(id)
    });
  }
  return result;
};

/**
 * Check if a command is registered
 * @param {string} id - Command identifier
 * @returns {boolean}
 */
const has = (id) => {
  return commands.has(id);
};

/**
 * Unregister a command
 * @param {string} id - Command identifier
 */
const unregister = (id) => {
  commands.delete(id);
  metadata.delete(id);
};

// Export as singleton object
const commandRegistry = {
  register,
  execute,
  getMetadata,
  getAllWithMetadata,
  has,
  unregister
};

export default commandRegistry;
