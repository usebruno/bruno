const { runScriptInNodeVm } = require('../sandbox/node-vm');
const Bru = require('../bru');
const HookManager = require('../hook-manager');
const { cleanJson } = require('../utils');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { buildConsolidatedScript, fromExtractedHooks } = require('./hooks-consolidator');

/**
 * HooksRuntime manages the execution of hook scripts in a sandboxed environment.
 *
 * Optimizations:
 * - Lazy VM creation: VMs are only created when hooks are present
 * - Consolidated execution: Multiple hook levels can be batched into a single VM
 * - Shared HookManager: Can reuse an existing HookManager for handler registration
 *
 * @class
 */
class HooksRuntime {
  /**
   * Creates a new HooksRuntime instance
   * @param {object} [props] - Configuration options
   * @param {string} [props.runtime='quickjs'] - Runtime to use ('quickjs' or 'nodevm')
   */
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
    // Track statistics for performance monitoring
    this._stats = {
      vmCreations: 0,
      consolidatedRuns: 0,
      singleLevelRuns: 0,
      skippedRuns: 0
    };
  }

  /**
   * Get execution statistics
   * @returns {object} Statistics about hook execution
   */
  get stats() {
    return { ...this._stats };
  }

  /**
   * Check if hooks content is empty/whitespace
   * @private
   * @param {string} content - Content to check
   * @returns {boolean} True if empty
   */
  _isEmptyContent(content) {
    return !content || !content.trim();
  }

  /**
   * Run hooks script to register event handlers
   * @param {object} options - Configuration options
   * @param {string} [options.hooksFile] - The hooks script content (for single-level execution)
   * @param {object} options.request - The request object (used for variable extraction only)
   * @param {object} options.envVariables - Environment variables
   * @param {object} options.runtimeVariables - Runtime variables
   * @param {string} options.collectionPath - Collection path
   * @param {function} [options.onConsoleLog] - Console log callback
   * @param {object} options.processEnvVars - Process environment variables
   * @param {object} options.scriptingConfig - Scripting configuration
   * @param {function} [options.runRequestByItemPathname] - Function to run requests
   * @param {string} options.collectionName - Collection name
   * @param {HookManager} [options.hookManager] - Existing HookManager instance to use (for shared hook registration)
   * @param {boolean} [options.consolidated=false] - Whether to use consolidated execution mode
   * @param {object} [options.consolidatedHooks] - Consolidated hooks data (when consolidated=true)
   * @param {string} [options.consolidatedHooks.collectionHooks] - Collection-level hooks script
   * @param {Array<object>} [options.consolidatedHooks.folderHooks] - Array of folder hooks
   * @param {string} [options.consolidatedHooks.requestHooks] - Request-level hooks script
   * @returns {object} Result containing the hookManager instance
   */
  async runHooks(options) {
    const {
      hooksFile,
      request,
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      runRequestByItemPathname,
      collectionName,
      hookManager,
      consolidated = false,
      consolidatedHooks
    } = options;
    const activeHookManager = hookManager || new HookManager();
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const requestVariables = request?.requestVariables || {};
    const promptVariables = request?.promptVariables || {};

    // Consolidated execution mode: build and execute consolidated script
    if (consolidated && consolidatedHooks) {
      return this._runConsolidatedHooks({
        consolidatedHooks,
        request,
        envVariables,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        runRequestByItemPathname,
        collectionName,
        activeHookManager,
        globalEnvironmentVariables,
        oauth2CredentialVariables,
        collectionVariables,
        folderVariables,
        requestVariables,
        promptVariables
      });
    }

    // Single-level execution mode (original behavior)
    // Pass activeHookManager to Bru so it uses the same instance (whether provided or newly created)
    const bru = new Bru(this.runtime, envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, promptVariables, activeHookManager);

    const context = {
      bru
    };

    if (onConsoleLog && typeof onConsoleLog === 'function') {
      const customLogger = (type) => {
        return (...args) => {
          onConsoleLog(type, cleanJson(args));
        };
      };
      context.console = {
        log: customLogger('log'),
        debug: customLogger('debug'),
        info: customLogger('info'),
        warn: customLogger('warn'),
        error: customLogger('error')
      };
    }

    if (runRequestByItemPathname) {
      context.bru.runRequest = runRequestByItemPathname;
    }

    // Lazy VM creation: If no hooks file, return early without creating a VM
    if (this._isEmptyContent(hooksFile)) {
      this._stats.skippedRuns++;
      return {
        hookManager: activeHookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
      };
    }

    this._stats.singleLevelRuns++;
    this._stats.vmCreations++;

    // Execute hooks script
    // Note: Hooks need the VM to persist so registered handlers can be called later
    // The cleanup function is registered with the HookManager and called when dispose() is invoked
    if (this.runtime === 'nodevm') {
      await runScriptInNodeVm({
        script: hooksFile,
        context,
        collectionPath,
        scriptingConfig
      });

      return {
        hookManager: activeHookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
      };
    }

    // For QuickJS, persist the VM so hook handlers can be called later during the collection run
    // The cleanup function is registered with the HookManager to be called when dispose() is invoked
    const result = await executeQuickJsVmAsync({
      script: hooksFile,
      context: context,
      collectionPath,
      persistVm: true // Keep VM alive for hook handler calls
    });

    // Register VM cleanup with HookManager so it's disposed when HookManager.dispose() is called
    if (result?.cleanup && typeof activeHookManager.registerCleanup === 'function') {
      activeHookManager.registerCleanup(result.cleanup);
    }

    return {
      hookManager: activeHookManager,
      envVariables: cleanJson(envVariables),
      runtimeVariables: cleanJson(runtimeVariables),
      persistentEnvVariables: bru.persistentEnvVariables,
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
    };
  }

  /**
   * Run consolidated hooks execution - all levels in a single VM run
   * This is more efficient when there are multiple hook levels (collection, folder, request)
   * @private
   * @param {object} options - Execution options
   * @returns {Promise<object>} Result containing hookManager and variable states
   */
  async _runConsolidatedHooks(options) {
    const {
      consolidatedHooks,
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      runRequestByItemPathname,
      collectionName,
      activeHookManager,
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      collectionVariables,
      folderVariables,
      requestVariables,
      promptVariables
    } = options;

    // Build consolidated script from all hook levels
    const config = fromExtractedHooks(consolidatedHooks);
    const { script: consolidatedScript, hasHooks, levels } = buildConsolidatedScript(config);

    // Lazy VM creation: If no hooks, return early without creating a VM
    if (!hasHooks || !consolidatedScript) {
      this._stats.skippedRuns++;
      const bru = new Bru(
        this.runtime,
        envVariables,
        runtimeVariables,
        processEnvVars,
        collectionPath,
        collectionVariables,
        folderVariables,
        requestVariables,
        globalEnvironmentVariables,
        oauth2CredentialVariables,
        collectionName,
        promptVariables,
        activeHookManager
      );
      return {
        hookManager: activeHookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
      };
    }

    this._stats.consolidatedRuns++;
    this._stats.vmCreations++;

    // Create a single Bru instance for consolidated execution
    // All hook levels will share this instance's HookManager
    const bru = new Bru(
      this.runtime,
      envVariables,
      runtimeVariables,
      processEnvVars,
      collectionPath,
      collectionVariables,
      folderVariables,
      requestVariables,
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      collectionName,
      promptVariables,
      activeHookManager
    );

    // Prepare context with error handling callback
    const context = {
      bru,
      __hookResult: null,
      __onHookError: (level, error) => {
        if (onConsoleLog) {
          onConsoleLog('error', [`[Hook Error] ${level}: ${error?.message || error}`]);
        }
      }
    };

    // Add custom console logger
    if (onConsoleLog && typeof onConsoleLog === 'function') {
      const customLogger = (type) => {
        return (...args) => {
          onConsoleLog(type, cleanJson(args));
        };
      };
      context.console = {
        log: customLogger('log'),
        debug: customLogger('debug'),
        info: customLogger('info'),
        warn: customLogger('warn'),
        error: customLogger('error')
      };
    }

    // Add runRequest function if provided
    if (runRequestByItemPathname) {
      context.bru.runRequest = runRequestByItemPathname;
    }

    // Execute consolidated script
    if (this.runtime === 'nodevm') {
      await runScriptInNodeVm({
        script: consolidatedScript,
        context,
        collectionPath,
        scriptingConfig
      });

      return {
        hookManager: activeHookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
      };
    }

    // For QuickJS, persist the VM so hook handlers can be called later
    const result = await executeQuickJsVmAsync({
      script: consolidatedScript,
      context: context,
      collectionPath,
      persistVm: true
    });

    // Register VM cleanup with HookManager
    if (result?.cleanup && typeof activeHookManager.registerCleanup === 'function') {
      activeHookManager.registerCleanup(result.cleanup);
    }

    return {
      hookManager: activeHookManager,
      envVariables: cleanJson(envVariables),
      runtimeVariables: cleanJson(runtimeVariables),
      persistentEnvVariables: bru.persistentEnvVariables,
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
    };
  }
}

module.exports = HooksRuntime;
