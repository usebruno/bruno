const { runScriptInNodeVm } = require('../sandbox/node-vm');
const { get } = require('lodash');
const Bru = require('../bru');
const HookManager = require('../hook-manager');
const { cleanJson } = require('../utils');
const { mixinTypedArrays } = require('../sandbox/mixins/typed-arrays');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
class HooksRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  /**
   * Run hooks script to register event handlers
   * @param {object} options - Configuration options
   * @param {string} options.hooksFile - The hooks script content
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
      hookManager
    } = options;
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const requestVariables = request?.requestVariables || {};
    const promptVariables = request?.promptVariables || {};
    const bru = new Bru(envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, promptVariables, hookManager);

    const moduleWhitelist = get(scriptingConfig, 'moduleWhitelist', []);
    const whitelistedModules = {};

    for (let module of moduleWhitelist) {
      try {
        whitelistedModules[module] = require(module);
      } catch (e) {
        // Ignore
        console.warn(e);
      }
    }

    const context = {
      bru
    };

    if (this.runtime === 'vm2') {
      mixinTypedArrays(context);
    }

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

    // Ensure bru.hooks is accessible in the context (important for VM sandbox)
    context.bru.hooks = hookManager;

    // If no hooks file, return early with the hookManager
    if (!hooksFile || !hooksFile.length) {
      return {
        hookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
      };
    }

    // Execute hooks script
    if (this.runtime === 'nodevm') {
      await runScriptInNodeVm({
        script: hooksFile,
        context,
        collectionPath,
        scriptingConfig
      });

      return {
        hookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
      };
    }

    if (this.runtime === 'quickjs') {
      await executeQuickJsVmAsync({
        script: hooksFile,
        context: context,
        collectionPath
      });

      return {
        hookManager,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
      };
    }
  }
}

module.exports = HooksRuntime;
