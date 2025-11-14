const { NodeVM } = require('@usebruno/vm2');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const path = require('path');
const http = require('http');
const https = require('https');
const stream = require('stream');
const util = require('util');
const zlib = require('zlib');
const url = require('url');
const punycode = require('punycode');
const fs = require('fs');
const { get } = require('lodash');
const Bru = require('../bru');
const HookManager = require('../hook-manager');
const { cleanJson } = require('../utils');
const { mixinTypedArrays } = require('../sandbox/mixins/typed-arrays');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');

// Inbuilt Library Support
const ajv = require('ajv');
const addFormats = require('ajv-formats');
const atob = require('atob');
const btoa = require('btoa');
const lodash = require('lodash');
const moment = require('moment');
const uuid = require('uuid');
const nanoid = require('nanoid');
const axios = require('axios');
const fetch = require('node-fetch');
const CryptoJS = require('crypto-js');
const NodeVault = require('node-vault');
const xml2js = require('xml2js');
const cheerio = require('cheerio');
const tv4 = require('tv4');
const jsonwebtoken = require('jsonwebtoken');

class HooksRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'vm2';
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
      hookManager: existingHookManager
    } = options;
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const requestVariables = request?.requestVariables || {};
    const bru = new Bru(envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName);

    // Use existing HookManager if provided, otherwise create new one
    const hookManager = existingHookManager || new HookManager();
    bru.hooks = hookManager;

    const allowScriptFilesystemAccess = get(scriptingConfig, 'filesystemAccess.allow', false);
    const moduleWhitelist = get(scriptingConfig, 'moduleWhitelist', []);
    const additionalContextRoots = get(scriptingConfig, 'additionalContextRoots', []);
    const additionalContextRootsAbsolute = lodash
      .chain(additionalContextRoots)
      .map((acr) => (acr.startsWith('/') ? acr : path.join(collectionPath, acr)))
      .value();

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

    // default runtime is vm2
    const vm = new NodeVM({
      sandbox: context,
      require: {
        context: 'sandbox',
        builtin: ['*'],
        external: true,
        root: [collectionPath, ...additionalContextRootsAbsolute],
        mock: {
          // node libs
          path,
          stream,
          util,
          url,
          http,
          https,
          punycode,
          zlib,
          // 3rd party libs
          ajv,
          'ajv-formats': addFormats,
          atob,
          btoa,
          lodash,
          moment,
          uuid,
          nanoid,
          axios,
          'node-fetch': fetch,
          'crypto-js': CryptoJS,
          'xml2js': xml2js,
          jsonwebtoken,
          cheerio,
          tv4,
          ...whitelistedModules,
          'fs': allowScriptFilesystemAccess ? fs : undefined,
          'node-vault': NodeVault
        }
      }
    });

    const asyncVM = vm.run(`module.exports = async () => { ${hooksFile} }`, path.join(collectionPath, 'vm.js'));
    await asyncVM();

    return {
      hookManager,
      envVariables: cleanJson(envVariables),
      runtimeVariables: cleanJson(runtimeVariables),
      persistentEnvVariables: bru.persistentEnvVariables,
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables)
    };
  }
}

module.exports = HooksRuntime;
