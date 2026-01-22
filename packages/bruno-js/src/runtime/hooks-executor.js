/**
 * Hooks Executor Utility
 *
 * This module provides a centralized hook execution logic that can be used by both
 * CLI and Electron implementations. It eliminates code duplication and ensures
 * consistent behavior across different execution contexts.
 *
 * Features:
 * - Unified hook execution for collection, folder, and request levels
 * - Support for both individual and consolidated execution modes
 * - Proper error isolation and reporting
 * - Hook manager lifecycle management
 */

const HooksRuntime = require('./hooks-runtime');
const decomment = require('decomment');

/**
 * Hook event names used throughout the application
 * @readonly
 * @enum {string}
 */
const HOOK_EVENTS = Object.freeze({
  HTTP_BEFORE_REQUEST: 'http:beforeRequest',
  HTTP_AFTER_RESPONSE: 'http:afterResponse',
  RUNNER_BEFORE_COLLECTION_RUN: 'runner:beforeCollectionRun',
  RUNNER_AFTER_COLLECTION_RUN: 'runner:afterCollectionRun'
});

/**
 * Creates execution options for hooks
 * @typedef {Object} HookExecutionOptions
 * @property {object} request - The request object
 * @property {object} envVariables - Environment variables
 * @property {object} runtimeVariables - Runtime variables
 * @property {string} collectionPath - Collection path
 * @property {function} [onConsoleLog] - Console log callback
 * @property {object} processEnvVars - Process environment variables
 * @property {object} scriptingConfig - Scripting configuration
 * @property {function} [runRequestByItemPathname] - Function to run requests
 * @property {string} collectionName - Collection name
 * @property {HookManager} [hookManager] - Existing HookManager to use
 */

/**
 * Result from hook execution
 * @typedef {Object} HookExecutionResult
 * @property {HookManager} hookManager - The HookManager instance
 * @property {object} envVariables - Updated environment variables
 * @property {object} runtimeVariables - Updated runtime variables
 * @property {object} persistentEnvVariables - Persistent environment variables
 * @property {object} globalEnvironmentVariables - Global environment variables
 * @property {Array} [errors] - Any errors that occurred during execution
 */

/**
 * Executes hooks for a single level (collection, folder, or request)
 * This is the individual execution mode - one VM per level
 *
 * @param {string} hooksFile - The hooks script content
 * @param {string} hookEvent - The hook event to trigger (e.g., HOOK_EVENTS.HTTP_BEFORE_REQUEST)
 * @param {object} eventData - Data to pass to hook handlers
 * @param {HookExecutionOptions} options - Execution options
 * @returns {Promise<HookExecutionResult|null>} Execution result or null if no hooks
 */
const executeHooksForLevel = async (hooksFile, hookEvent, eventData, options) => {
  if (!hooksFile || !hooksFile.trim()) {
    return null;
  }

  const {
    request,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname,
    collectionName
  } = options;

  try {
    const hooksRuntime = new HooksRuntime({ runtime: scriptingConfig?.runtime });
    const result = await hooksRuntime.runHooks({
      hooksFile: decomment(hooksFile),
      request,
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      runRequestByItemPathname,
      collectionName
    });

    if (result?.hookManager) {
      await result.hookManager.call(hookEvent, eventData);
      // Dispose HookManager to free VM resources
      if (typeof result.hookManager.dispose === 'function') {
        result.hookManager.dispose();
      }
    }

    return result;
  } catch (error) {
    if (onConsoleLog) {
      onConsoleLog('error', [`Error executing hooks for ${hookEvent}: ${error.message}`]);
    }
    console.error(`Error executing hooks for ${hookEvent}:`, error);
    return null;
  }
};

/**
 * Executes hooks for multiple levels using consolidated execution
 * This batches all hook levels into a single VM execution for better performance
 *
 * @param {object} extractedHooks - Hooks extracted from collection/folder/request
 * @param {string} extractedHooks.collectionHooks - Collection-level hooks
 * @param {Array} extractedHooks.folderHooks - Folder-level hooks array
 * @param {string} extractedHooks.requestHooks - Request-level hooks
 * @param {string} hookEvent - The hook event to trigger
 * @param {object} eventData - Data to pass to hook handlers
 * @param {HookExecutionOptions} options - Execution options
 * @returns {Promise<HookExecutionResult|null>} Execution result or null if no hooks
 */
const executeConsolidatedHooks = async (extractedHooks, hookEvent, eventData, options) => {
  const {
    request,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname,
    collectionName
  } = options;

  try {
    const hooksRuntime = new HooksRuntime({ runtime: scriptingConfig?.runtime });
    const result = await hooksRuntime.runHooks({
      consolidated: true,
      consolidatedHooks: extractedHooks,
      request,
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      runRequestByItemPathname,
      collectionName
    });

    if (result?.hookManager) {
      await result.hookManager.call(hookEvent, eventData);
    }

    return result;
  } catch (error) {
    if (onConsoleLog) {
      onConsoleLog('error', [`Error executing consolidated hooks for ${hookEvent}: ${error.message}`]);
    }
    console.error(`Error executing consolidated hooks for ${hookEvent}:`, error);
    return null;
  }
};

/**
 * Executes all hook levels in sequence (collection -> folders -> request)
 * Always uses consolidated execution for better performance
 *
 * @param {object} extractedHooks - Hooks extracted from all levels
 * @param {string} hookEvent - The hook event to trigger
 * @param {object} eventData - Data to pass to hook handlers
 * @param {HookExecutionOptions} options - Execution options
 * @returns {Promise<HookExecutionResult|null>} Execution result or null if no hooks
 */
const executeAllHookLevels = async (extractedHooks, hookEvent, eventData, options) => {
  // Always use consolidated execution - single VM for all levels
  const result = await executeConsolidatedHooks(extractedHooks, hookEvent, eventData, options);
  if (result?.hookManager && typeof result.hookManager.dispose === 'function') {
    result.hookManager.dispose();
  }
  return result;
};

/**
 * Creates a reusable hook executor with cached configuration
 * Useful for collection runs where the same configuration is used for multiple requests
 *
 * @param {HookExecutionOptions} baseOptions - Base options to use for all executions
 * @returns {object} Hook executor with pre-configured methods
 */
const createHookExecutor = (baseOptions) => {
  return {
    /**
     * Execute hooks for a single level
     */
    executeLevel: (hooksFile, hookEvent, eventData, overrideOptions = {}) => {
      return executeHooksForLevel(hooksFile, hookEvent, eventData, {
        ...baseOptions,
        ...overrideOptions
      });
    },

    /**
     * Execute consolidated hooks
     */
    executeConsolidated: (extractedHooks, hookEvent, eventData, overrideOptions = {}) => {
      return executeConsolidatedHooks(extractedHooks, hookEvent, eventData, {
        ...baseOptions,
        ...overrideOptions
      });
    },

    /**
     * Execute all hook levels
     */
    executeAll: (extractedHooks, hookEvent, eventData, overrideOptions = {}) => {
      return executeAllHookLevels(extractedHooks, hookEvent, eventData, {
        ...baseOptions,
        ...overrideOptions
      });
    }
  };
};

module.exports = {
  // Core execution functions
  executeHooksForLevel,
  executeConsolidatedHooks,
  executeAllHookLevels,

  // Factory function
  createHookExecutor,

  // Constants
  HOOK_EVENTS
};
