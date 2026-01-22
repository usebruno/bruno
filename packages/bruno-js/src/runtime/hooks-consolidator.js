/**
 * Hooks Consolidator Utility
 *
 * This module provides utilities to consolidate multiple hook scripts (collection, folder, request levels)
 * into a single IIFE execution. This improves performance by:
 * - Creating only one VM instance instead of multiple
 * - Executing all hook levels sequentially within that VM
 * - Maintaining proper variable scoping with nested IIFEs
 *
 * Each level's hooks are wrapped in their own IIFE to ensure:
 * - Isolated variable scope per level
 * - Each level gets its own Bru instance with appropriate variable context
 * - Handlers capture the correct Bru instance in their closure
 * - Errors in one level don't break other levels
 */

const decomment = require('decomment');

/**
 * Hook level types for identification
 * @readonly
 * @enum {string}
 */
const HOOK_LEVEL = Object.freeze({
  COLLECTION: 'collection',
  FOLDER: 'folder',
  REQUEST: 'request'
});

/**
 * Represents a single hook level with its script and metadata
 * @typedef {Object} HookLevel
 * @property {string} level - The level type (collection, folder, request)
 * @property {string} script - The hooks script content
 * @property {string} [identifier] - Unique identifier (e.g., folder pathname)
 * @property {Object} [variables] - Level-specific variables
 */

/**
 * Configuration for building a consolidated hook script
 * @typedef {Object} ConsolidatorConfig
 * @property {string} [collectionHooks] - Collection-level hooks script
 * @property {Array<{folderPathname: string, hooks: string}>} [folderHooks] - Folder-level hooks
 * @property {string} [requestHooks] - Request-level hooks script
 * @property {boolean} [removeComments=true] - Whether to remove comments from scripts
 */

/**
 * Result of consolidating hooks
 * @typedef {Object} ConsolidatedResult
 * @property {string} script - The consolidated IIFE script
 * @property {Array<HookLevel>} levels - Metadata about included levels
 * @property {boolean} hasHooks - Whether any hooks were found
 */

/**
 * Escapes a string for safe inclusion in JavaScript code
 * Handles special characters that could break the script
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeForTemplate = (str) => {
  if (!str) return '';
  // Replace backticks and ${} to prevent template literal injection
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
};

/**
 * Wraps a hook script in an IIFE with error handling
 * The IIFE captures the appropriate bru instance for that level
 * @param {string} script - Hook script content
 * @param {string} level - Hook level identifier for error reporting
 * @param {string} [identifier] - Additional identifier (e.g., folder path)
 * @returns {string} Wrapped script
 */
const wrapInIIFE = (script, level, identifier = '') => {
  if (!script || !script.trim()) {
    return '';
  }

  const levelId = identifier ? `${level}:${identifier}` : level;

  // The IIFE creates a scoped execution context
  // The bru variable is expected to be set in the outer scope before this IIFE runs
  // Each level will have its own bru instance with appropriate variable context
  return `
// === ${level.toUpperCase()} HOOKS${identifier ? ` (${identifier})` : ''} ===
await (async () => {
  const __hookLevel = '${escapeForTemplate(levelId)}';
  try {
${script}
  } catch (__hookError) {
    __consolidatedErrors.push({
      level: __hookLevel,
      error: __hookError?.message || String(__hookError),
      stack: __hookError?.stack
    });
    if (typeof __onHookError === 'function') {
      __onHookError(__hookLevel, __hookError);
    }
  }
})();
`;
};

/**
 * Processes hook script by optionally removing comments
 * @param {string} script - Script to process
 * @param {boolean} removeComments - Whether to remove comments
 * @returns {string} Processed script
 */
const processScript = (script, removeComments = true) => {
  if (!script || !script.trim()) {
    return '';
  }

  if (removeComments) {
    try {
      return decomment(script);
    } catch (e) {
      // If decomment fails, return original script
      return script;
    }
  }

  return script;
};

/**
 * Builds a consolidated hook script from multiple levels
 *
 * The consolidated script structure:
 * 1. Initializes shared state (error collection, bru instances tracking)
 * 2. Executes each level's hooks in an IIFE with its own scope
 * 3. Each level's handlers capture the bru instance available in that scope
 * 4. Returns collected errors and any other results
 *
 * @param {ConsolidatorConfig} config - Configuration for consolidation
 * @returns {ConsolidatedResult} Consolidated script and metadata
 */
const buildConsolidatedScript = (config) => {
  const {
    collectionHooks = '',
    folderHooks = [],
    requestHooks = '',
    removeComments = true
  } = config;

  const levels = [];
  const scriptParts = [];

  // Process collection hooks
  const processedCollectionHooks = processScript(collectionHooks, removeComments);
  if (processedCollectionHooks && processedCollectionHooks.trim()) {
    levels.push({
      level: HOOK_LEVEL.COLLECTION,
      script: processedCollectionHooks,
      identifier: 'root'
    });
    scriptParts.push(wrapInIIFE(processedCollectionHooks, HOOK_LEVEL.COLLECTION));
  }

  // Process folder hooks (in order from collection to request)
  if (Array.isArray(folderHooks)) {
    for (const folder of folderHooks) {
      if (!folder || !folder.hooks) continue;

      const processedFolderHooks = processScript(folder.hooks, removeComments);
      if (processedFolderHooks && processedFolderHooks.trim()) {
        levels.push({
          level: HOOK_LEVEL.FOLDER,
          script: processedFolderHooks,
          identifier: folder.folderPathname
        });
        scriptParts.push(wrapInIIFE(processedFolderHooks, HOOK_LEVEL.FOLDER, folder.folderPathname));
      }
    }
  }

  // Process request hooks
  const processedRequestHooks = processScript(requestHooks, removeComments);
  if (processedRequestHooks && processedRequestHooks.trim()) {
    levels.push({
      level: HOOK_LEVEL.REQUEST,
      script: processedRequestHooks,
      identifier: 'current'
    });
    scriptParts.push(wrapInIIFE(processedRequestHooks, HOOK_LEVEL.REQUEST));
  }

  const hasHooks = levels.length > 0;

  if (!hasHooks) {
    return {
      script: '',
      levels: [],
      hasHooks: false
    };
  }

  // Build the full consolidated script
  // Note: The outer scope provides `bru` and `__onHookError` variables
  // The script assumes these are set up by the runtime before execution
  const consolidatedScript = `
// Consolidated hooks script - generated by hooks-consolidator
// Contains ${levels.length} hook level(s): ${levels.map((l) => l.level).join(', ')}

// Shared error collection for all levels
const __consolidatedErrors = [];

// Execute all hook levels sequentially
${scriptParts.join('\n')}

// Return collected errors (if any) for reporting
if (__consolidatedErrors.length > 0) {
  __hookResult = { errors: __consolidatedErrors };
}
`;

  return {
    script: consolidatedScript.trim(),
    levels,
    hasHooks: true
  };
};

/**
 * Creates level metadata for tracking what was included in consolidation
 * @param {ConsolidatorConfig} config - Configuration used for consolidation
 * @returns {Array<{level: string, identifier: string}>} Level metadata
 */
const getLevelMetadata = (config) => {
  const { collectionHooks, folderHooks, requestHooks } = config;
  const metadata = [];

  if (collectionHooks && collectionHooks.trim()) {
    metadata.push({ level: HOOK_LEVEL.COLLECTION, identifier: 'root' });
  }

  if (Array.isArray(folderHooks)) {
    for (const folder of folderHooks) {
      if (folder?.hooks && folder.hooks.trim()) {
        metadata.push({ level: HOOK_LEVEL.FOLDER, identifier: folder.folderPathname });
      }
    }
  }

  if (requestHooks && requestHooks.trim()) {
    metadata.push({ level: HOOK_LEVEL.REQUEST, identifier: 'current' });
  }

  return metadata;
};

/**
 * Extracts hook configuration from extracted hooks object
 * Converts the format from extractHooks() to ConsolidatorConfig format
 * @param {Object} extractedHooks - Object from extractHooks() function
 * @param {string} extractedHooks.collectionHooks - Collection hooks script
 * @param {Array} extractedHooks.folderHooks - Array of folder hooks
 * @param {string} extractedHooks.requestHooks - Request hooks script
 * @returns {ConsolidatorConfig} Configuration for consolidation
 */
const fromExtractedHooks = (extractedHooks) => {
  const { collectionHooks = '', folderHooks = [], requestHooks = '' } = extractedHooks || {};

  return {
    collectionHooks,
    folderHooks,
    requestHooks,
    removeComments: true
  };
};

module.exports = {
  // Main functions
  buildConsolidatedScript,

  // Utility functions
  wrapInIIFE,
  processScript,
  escapeForTemplate,

  // Analysis functions
  getLevelMetadata,
  fromExtractedHooks,

  // Constants
  HOOK_LEVEL
};
