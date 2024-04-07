import vm from 'node:vm';
import { Bru } from './dataObject/Bru';
import { BrunoRequest } from './dataObject/BrunoRequest';
import lodash from 'lodash';
import path from 'node:path';
import { cleanJson } from './utils';
import chai from 'chai';
import { BrunoResponse } from './dataObject/BrunoResponse';
import { TestResults } from './dataObject/TestResults';
import { Test } from './dataObject/Test';
import { BrunoConfig, RequestContext, RequestItem, Response } from '../types';

// Save the original require inside an "alias" variable so the "vite-plugin-commonjs" does not complain about the
// intentional dynamic require
const dynamicRequire = require;

export async function runScript(
  script: string,
  request: RequestItem,
  response: Response | null,
  variables: RequestContext['variables'],
  useTests: boolean,
  collectionPath: string,
  scriptingConfig: BrunoConfig['scripts'],
  onConsoleLog?: (type: string, payload: any) => void
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
    await vm.runInThisContext(`
      (async ({ require, console, req, res, bru, expect, assert, test }) => {
        ${script}
      });
    `)(scriptContext);
  }

  return {
    envVariables: cleanJson(scriptContext.bru.envVariables),
    collectionVariables: cleanJson(scriptContext.bru.collectionVariables),
    nextRequestName: scriptContext.bru._nextRequest,
    results: scriptContext.brunoTestResults ? cleanJson(scriptContext.brunoTestResults.getResults()) : null
  };
}

function buildScriptContext(
  request: RequestItem,
  response: Response | null,
  variables: RequestContext['variables'],
  useTests: boolean,
  collectionPath: string,
  scriptingConfig: BrunoConfig['scripts'],
  onConsoleLog?: (type: string, payload: any) => void
) {
  const context: {
    require: (module: string) => unknown;
    console: ReturnType<typeof createCustomConsole>;
    req: BrunoRequest;
    res: BrunoResponse | null;
    bru: Bru;
    expect: typeof chai.expect | null;
    assert: typeof chai.assert | null;
    brunoTestResults: TestResults | null;
    test: ReturnType<typeof Test> | null;
  } = {
    require: createCustomRequire(scriptingConfig, collectionPath),
    console: createCustomConsole(onConsoleLog),
    req: new BrunoRequest(request, response !== null),
    res: null,
    bru: new Bru(variables.environment, variables.collection, variables.process, collectionPath, ''),
    expect: null,
    assert: null,
    brunoTestResults: null,
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
  'axios',
  'chai',
  'crypto-js',
  'node-vault'
];

function createCustomRequire(scriptingConfig: BrunoConfig['scripts'], collectionPath: string) {
  const customWhitelistedModules = lodash.get(scriptingConfig, 'moduleWhitelist', []);

  const whitelistedModules = [...defaultModuleWhiteList, ...customWhitelistedModules];

  const allowScriptFilesystemAccess = lodash.get(scriptingConfig, 'filesystemAccess.allow', false);
  if (allowScriptFilesystemAccess) {
    // TODO: Allow other modules like os, child_process etc too?
    whitelistedModules.push('fs');
  }

  const additionalContextRoots = lodash.get(scriptingConfig, 'additionalContextRoots', []);
  const additionalContextRootsAbsolute = lodash
    .chain(additionalContextRoots)
    .map((acr) => (acr.startsWith('/') ? acr : path.join(collectionPath, acr)))
    .value();
  additionalContextRootsAbsolute.push(collectionPath);

  return (moduleName: string) => {
    // First check If we want to require a native node module or
    // Remove the "node:" prefix, to make sure "node:fs" and "fs" can be required, and we only need to whitelist one
    if (whitelistedModules.includes(moduleName.replace(/^node:/, ''))) {
      try {
        return dynamicRequire(moduleName);
      } catch {
        // This can happen, if it s module installed by the user under additionalContextRoots
        // So now we check if the user installed it themselves
        let modulePath;
        try {
          modulePath = require.resolve(moduleName, { paths: additionalContextRootsAbsolute });
          return dynamicRequire(modulePath);
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
        return dynamicRequire(fullScriptPath);
      } catch (error) {
        triedPaths.push({ fullScriptPath, error });
      }
    }

    const triedPathsFormatted = triedPaths.map((i) => `- "${i.fullScriptPath}": ${i.error}\n`);
    throw new Error(`Failed to require "${moduleName}"!

If you tried to require a internal node module / external package, make sure its whitelisted in the "bruno.json" under "scriptConfig".
If you wanted to require an external script make sure the path is correct or added to "additionalContextRoots" in your "bruno.json".

${
  triedPathsFormatted.length === 0
    ? 'No additional context roots where defined'
    : 'We searched the following paths for your script:'
}
${triedPathsFormatted}`);
  };
}

function createCustomConsole(onConsoleLog?: (type: string, payload: any) => void) {
  const customLogger = (type: string) => {
    return (...args: any[]) => {
      console.log('cleanResult', args, cleanJson(args));
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
  const brunoTestResults = new TestResults();
  const test = Test(brunoTestResults, chai);

  return {
    test,
    brunoTestResults,
    expect: chai.expect,
    assert: chai.assert
  };
}
