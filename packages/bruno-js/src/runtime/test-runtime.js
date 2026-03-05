const chai = require('chai');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const BrunoResponse = require('../bruno-response');
const { cleanJson } = require('../utils');
const { createBruTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const jsonwebtoken = require('jsonwebtoken');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { SANDBOX } = require('../utils/sandbox');

class TestRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  async runTests(
    testsFile,
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
    const assertionResults = request?.assertionResults || [];
    const certsAndProxyConfig = request?.certsAndProxyConfig;
    const scriptPath = request?.pathname;
    const bru = new Bru(this.runtime, envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, promptVariables, certsAndProxyConfig);
    const req = new BrunoRequest(request);
    const res = new BrunoResponse(response);

    // extend bru with result getter methods
    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    if (!testsFile || !testsFile.length) {
      return {
        request,
        envVariables,
        runtimeVariables,
        globalEnvironmentVariables,
        results: __brunoTestResults.getResults(),
        nextRequestName: bru.nextRequest
      };
    }

    const context = {
      test,
      bru,
      req,
      res,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults,
      jwt: jsonwebtoken
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
        debug: customLogger('debug'),
        error: customLogger('error')
      };
    }

    if (runRequestByItemPathname) {
      context.bru.runRequest = runRequestByItemPathname;
    }

    let scriptError = null;

    try {
      if (this.runtime === SANDBOX.NODEVM) {
        await runScriptInNodeVm({
          script: testsFile,
          context,
          collectionPath,
          scriptingConfig,
          scriptPath
        });
      } else {
        // default runtime is `quickjs`
        await executeQuickJsVmAsync({
          script: testsFile,
          context: context,
          collectionPath,
          scriptPath
        });
      }
    } catch (error) {
      scriptError = error;
    }

    const result = {
      request,
      envVariables: cleanJson(envVariables),
      runtimeVariables: cleanJson(runtimeVariables),
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
      persistentEnvVariables: cleanJson(bru.persistentEnvVariables),
      oauth2CredentialsToReset: bru.oauth2CredentialsToReset,
      results: cleanJson(__brunoTestResults.getResults()),
      nextRequestName: bru.nextRequest
    };

    if (scriptError) {
      scriptError.partialResults = result;
      throw scriptError;
    }

    return result;
  }
}

module.exports = TestRuntime;
