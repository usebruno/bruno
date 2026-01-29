const { runScriptInNodeVm } = require('../sandbox/node-vm');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const BrunoResponse = require('../bruno-response');
const HookManager = require('../hook-manager');
const { cleanJson } = require('../utils');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');

/**
 * HooksRuntime manages the execution of hook scripts in a sandboxed environment.
 *
 * Hooks are now merged into a single script using mergeScripts() in collection.js,
 * following the same pattern as pre-request, post-response, and test scripts.
 *
 * Features:
 * - Lazy VM creation: VMs are only created when hooks are present
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
   * @param {string} [options.hooksFile] - The merged hooks script content
   * @param {object} options.request - The request object (used for variable extraction and BrunoRequest creation)
   * @param {object} [options.response] - The response object (used for BrunoResponse creation, only for afterResponse hooks)
   * @param {object} options.envVariables - Environment variables
   * @param {object} options.runtimeVariables - Runtime variables
   * @param {string} options.collectionPath - Collection path
   * @param {function} [options.onConsoleLog] - Console log callback
   * @param {object} options.processEnvVars - Process environment variables
   * @param {object} options.scriptingConfig - Scripting configuration
   * @param {function} [options.runRequestByItemPathname] - Function to run requests
   * @param {string} options.collectionName - Collection name
   * @param {HookManager} [options.hookManager] - Existing HookManager instance to use (for shared hook registration)
   * @returns {object} Result containing the hookManager instance, and req/res wrapper objects
   */
  async runHooks(options) {
    const {
      hooksFile,
      request,
      response,
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      runRequestByItemPathname,
      collectionName,
      hookManager
    } = options;
    const activeHookManager = hookManager || new HookManager();
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const requestVariables = request?.requestVariables || {};
    const promptVariables = request?.promptVariables || {};

    // Pass activeHookManager to Bru so it uses the same instance (whether provided or newly created)
    const bru = new Bru(this.runtime, envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, promptVariables, activeHookManager);

    // Create BrunoRequest and BrunoResponse wrappers (similar to ScriptRuntime)
    const req = request ? new BrunoRequest(request) : null;
    const res = response ? new BrunoResponse(response) : null;

    const context = {
      bru,
      req,
      res
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
      return {
        hookManager: activeHookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
        nextRequestName: bru.nextRequest,
        skipRequest: bru.skipRequest,
        stopExecution: bru.stopExecution,
        __bru: bru,
        req,
        res
      };
    }

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
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
        nextRequestName: bru.nextRequest,
        skipRequest: bru.skipRequest,
        stopExecution: bru.stopExecution,
        __bru: bru,
        req,
        res
      };
    }

    // For QuickJS, persist the VM so hook handlers can be called later during the collection run
    // The cleanup function is registered with the HookManager to be called when dispose() is invoked
    const result = await executeQuickJsVmAsync({
      script: hooksFile,
      context: context,
      collectionPath
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
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution,
      __bru: bru,
      req,
      res
    };
  }
}

module.exports = HooksRuntime;
