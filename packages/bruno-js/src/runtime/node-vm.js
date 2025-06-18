const vm = require('node:vm');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { get } = require('lodash');
const lodash = require('lodash');
const path = require('path');
const { cleanJson } = require('../utils');
const chai = require('chai');
const BrunoResponse = require('../bruno-response');
const TestResults = require('../test-results');
const Test = require('../test');

// Hack for: https://github.com/Its-treason/bruno/issues/17
// This adds the path to Electrons node modules to the global node process
// TODO: Test if this only need to be done for Electron or also CLI. (I think only CLI)
const electronNodeModules = require.resolve('axios').match(/^(.+?[\\\/]node_modules)[\\\/]/)?.[1];
if (process.env.NODE_PATH) {
  const nodePathSeparator = process.platform === 'win32' ? ';' : ':';
  process.env.NODE_PATH = `${process.env.NODE_PATH}${nodePathSeparator}${electronNodeModules}`;
} else {
  process.env.NODE_PATH = electronNodeModules;
}
require('module').Module._initPaths();

/**
 * @param {string} script
 * @param {object} request
 * @param {object|null} response
 * @param {{
 *   envVariables: Record<string, unknown>,
 *   collectionVariables: Record<string, unknown>,
 *   processEnvVars: Record<string, unknown>,
 * }} variables
 * @param {boolean} useTests
 * @param {string} collectionPath
 * @param {object} scriptingConfig
 * @param {(type: string, context: any) => void} onConsoleLog
 *
 * @returns {Promise<{
 *   collectionVariables: Record<string, unknown>,
 *   envVariables: Record<string, unknown>,
 *   nextRequestName: string,
 *   results: array|null,
 * }>}
 */
async function runScriptNodeVm(
  script,
  request,
  response,
  variables,
  useTests,
  collectionPath,
  scriptingConfig,
  onConsoleLog
) {
  const scriptContext = buildScriptContext(
    request,
    response,
    variables,
    useTests,
    collectionPath,
    scriptingConfig,
    onConsoleLog
  );

  if (script.trim().length !== 0) {
    try {
      await vm.runInThisContext(`
      // Only overwrite require and console in this context, so it doesn't break other packages
      (async function BRUNO_SCRIPT_WRAPPER({ require, console, brunoTestResults: __internal__brunoTestResults, ...brunoContext }) {
        // Assign all bruno variables to the global context, so they can be accessed in external scripts
        // See: https://github.com/Its-treason/bruno/issues/6
        // This will pollute the global context. But i don't a better solution
        Object.assign(global, {
          ...brunoContext,
          console: {
             ...globalThis.console,
             ...console
          }
        });
        ${script}
      });
    `)(scriptContext);
    } catch (error) {
      throw new UserScriptError(error, script);
    } finally {
      // Cleanup global namespace
      Object.assign(global, {
        req: undefined,
        res: undefined,
        bru: undefined,
        test: undefined,
        expect: undefined,
        assert: undefined,
        console: originalConsole
      });
    }
  }

  return {
    envVariables: cleanJson(scriptContext.bru.envVariables),
    collectionVariables: cleanJson(scriptContext.bru.collectionVariables),
    nextRequestName: scriptContext.bru.nextRequest,
    results: scriptContext.__brunoTestResults ? cleanJson(scriptContext.__brunoTestResults.getResults()) : null
  };
}

/**
 * @typedef {{
 *   require: (module: string) => (*),
 *   console: {object},
 *   req: {BrunoRequest},
 *   res: {BrunoResponse},
 *   bru: {Bru},
 *   expect: {ExpectStatic},
 *   assert: {AssertStatic},
 *   __brunoTestResults: {object},
 *   test: {Test},
 * }} ScriptContext
 *
 * @param {object} request
 * @param {object|null} response
 * @param {{
 *   envVariables: Record<string, unknown>,
 *   collectionVariables: Record<string, unknown>,
 *   processEnvVars: Record<string, unknown>,
 * }} variables
 * @param {boolean} useTests
 * @param {string} collectionPath
 * @param {object} scriptingConfig
 * @param {(type: string, context: any) => void} onConsoleLog
 *
 * @return {ScriptContext}
 */
function buildScriptContext(request, response, variables, useTests, collectionPath, scriptingConfig, onConsoleLog) {
  const context = {
    require: createCustomRequire(scriptingConfig, collectionPath),
    console: createCustomConsole(onConsoleLog),
    req: new BrunoRequest(request),
    res: null,
    bru: new Bru(variables.envVariables, variables.collectionVariables, variables.processEnvVars, collectionPath),
    expect: null,
    assert: null,
    __brunoTestResults: null,
    test: null
  };

  if (response) {
    context.res = new BrunoResponse(response);
  }

  if (useTests) {
    Object.assign(context, createTestContext());
  }

  return context;
}

const defaultModuleWhiteList = [
  // Node libs
  'path',
  'stream',
  'util',
  'url',
  'http',
  'https',
  'punycode',
  'zlib',
  // Pre-installed 3rd libs
  'ajv',
  'ajv-formats',
  'atob',
  'btoa',
  'lodash',
  'moment',
  'uuid',
  'nanoid',
  'node-fetch',
  'axios',
  'chai',
  'crypto-js',
  'node-vault',
  'xml2js',
  'cheerio',
  'jsonwebtoken'
];

/**
 * @param {object} scriptingConfig Config from collection's bruno.json
 * @param {string} collectionPath
 *
 * @returns {(module: string) => (*)}
 */
function createCustomRequire(scriptingConfig, collectionPath) {
  const customWhitelistedModules = get(scriptingConfig, 'moduleWhitelist', []);

  const whitelistedModules = [...defaultModuleWhiteList, ...customWhitelistedModules];

  const allowScriptFilesystemAccess = get(scriptingConfig, 'filesystemAccess.allow', false);
  if (allowScriptFilesystemAccess) {
    whitelistedModules.push('fs');
  }

  const additionalContextRoots = get(scriptingConfig, 'additionalContextRoots', []);
  const additionalContextRootsAbsolute = lodash
    .chain(additionalContextRoots)
    .map((acr) => (acr.startsWith('/') ? acr : path.join(collectionPath, acr)))
    .value();
  additionalContextRootsAbsolute.push(collectionPath);

  return (moduleName) => {
    // First check If we want to require a native node module or an internal node module
    // Remove the "node:" prefix, to make sure "node:fs" and "fs" can be required, and we only need to whitelist one
    if (whitelistedModules.includes(moduleName.replace(/^node:/, ''))) {
      try {
        return require(moduleName);
      } catch {
        // This can happen, if it s module installed by the user under additionalContextRoots
        // So now we check if the user installed it themselves
        let modulePath;
        try {
          modulePath = require.resolve(moduleName, { paths: additionalContextRootsAbsolute });
          return require(modulePath);
        } catch (error) {
          throw new Error(`Could not resolve module "${moduleName}": ${error}
          This most likely means you did not install the module under "additionalContextRoots" using a package manger like npm.
          
          These are your current "additionalContextRoots":
          - ${additionalContextRootsAbsolute.join('- ') || 'No "additionalContextRoots" defined'}
          `);
        }
      }
    }

    const triedPaths = [];
    for (const contextRoot of additionalContextRootsAbsolute) {
      const fullScriptPath = path.join(contextRoot, moduleName);
      try {
        return require(fullScriptPath);
      } catch {
        triedPaths.push({ fullScriptPath });
      }
    }

    const triedPathsFormatted = triedPaths.map((i) => `- ${i.fullScriptPath}\n`);
    throw new Error(`Failed to require "${moduleName}"!

If you tried to require a internal node module / external package, make sure its whitelisted in the "bruno.json" under "scriptConfig".
If you wanted to require an external script make sure the path is correct or added to "additionalContextRoots" in your "bruno.json".

${triedPathsFormatted.length === 0
        ? 'No additional context roots where defined'
        : 'We searched the following paths for your script:'
      }
${triedPathsFormatted}`);
  };
}

function createCustomConsole(onConsoleLog) {
  const customLogger = (type) => {
    return (...args) => {
      onConsoleLog && onConsoleLog(type, cleanJson(args));
    };
  };
  return {
    log: customLogger('log'),
    info: customLogger('info'),
    warn: customLogger('warn'),
    error: customLogger('error')
  };
}

function createTestContext() {
  const __brunoTestResults = new TestResults();
  const test = Test(__brunoTestResults, chai);

  return {
    test,
    __brunoTestResults,
    expect: chai.expect,
    assert: chai.assert
  };
}

module.exports = {
  runScript
};
