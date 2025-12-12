const chai = require('chai');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const BrunoResponse = require('../bruno-response');
const { cleanJson } = require('../utils');
const { createBruTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');

class ScriptRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  // This approach is getting out of hand
  // Need to refactor this to use a single arg (object) instead of 7
  async runRequestScript(
    script,
    request,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname,
    collectionName
  ) {
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const requestVariables = request?.requestVariables || {};
    const promptVariables = request?.promptVariables || {};
    const assertionResults = request?.assertionResults || [];
    const bru = new Bru(this.runtime, envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, promptVariables);
    const req = new BrunoRequest(request);

    // extend bru with result getter methods
    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      req,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults
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

    if (this.runtime === 'nodevm') {
      await runScriptInNodeVm({
        script,
        context,
        collectionPath,
        scriptingConfig
      });

      return {
        request,
        envVariables: cleanJson(envVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        persistentEnvVariables: bru.persistentEnvVariables,
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
        results: cleanJson(__brunoTestResults.getResults()),
        nextRequestName: bru.nextRequest,
        skipRequest: bru.skipRequest,
        stopExecution: bru.stopExecution
      };
    }

    // default runtime is `quickjs`
    await executeQuickJsVmAsync({
      script: script,
      context: context,
      collectionPath
    });

    return {
      request,
      envVariables: cleanJson(envVariables),
      runtimeVariables: cleanJson(runtimeVariables),
      persistentEnvVariables: bru.persistentEnvVariables,
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
      results: cleanJson(__brunoTestResults.getResults()),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution
    };
  }

  async runResponseScript(
    script,
    request,
    response,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname,
    collectionName
  ) {
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const requestVariables = request?.requestVariables || {};
    const promptVariables = request?.promptVariables || {};
    const assertionResults = request?.assertionResults || {};
    const bru = new Bru(this.runtime, envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, promptVariables);
    const req = new BrunoRequest(request);
    const res = new BrunoResponse(response);

    // extend bru with result getter methods
    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      req,
      res,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults
    };

    if (onConsoleLog && typeof onConsoleLog === 'function') {
      const customLogger = (type) => {
        return (...args) => {
          onConsoleLog(type, cleanJson(args));
        };
      };
      context.console = {
        log: customLogger('log'),
        info: customLogger('info'),
        warn: customLogger('warn'),
        error: customLogger('error'),
        debug: customLogger('debug')
      };
    }

    if (runRequestByItemPathname) {
      context.bru.runRequest = runRequestByItemPathname;
    }

    if (this.runtime === 'nodevm') {
      await runScriptInNodeVm({
        script,
        context,
        collectionPath,
        scriptingConfig
      });

      return {
        response,
        envVariables: cleanJson(envVariables),
        persistentEnvVariables: cleanJson(bru.persistentEnvVariables),
        runtimeVariables: cleanJson(runtimeVariables),
        globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
        results: cleanJson(__brunoTestResults.getResults()),
        nextRequestName: bru.nextRequest,
        skipRequest: bru.skipRequest,
        stopExecution: bru.stopExecution
      };
    }

    // default runtime is `quickjs`
    await executeQuickJsVmAsync({
      script: script,
      context: context,
      collectionPath
    });

    return {
      response,
      envVariables: cleanJson(envVariables),
      persistentEnvVariables: cleanJson(bru.persistentEnvVariables),
      runtimeVariables: cleanJson(runtimeVariables),
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
      results: cleanJson(__brunoTestResults.getResults()),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution
    };
  }
}

module.exports = ScriptRuntime;
