const chai = require('chai');
const Bru = require('../bru');
const BrunoGrpcRequest = require('./bruno-grpc-request');
const BrunoGrpcResponse = require('./bruno-grpc-response');
const { cleanJson } = require('../utils');
const { createBruTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { SANDBOX } = require('../utils/sandbox');
const { createScopeSetter } = require('../runtime/scripted-entries');

const RUN_REQUEST_UNSUPPORTED = 'bru.runRequest is not supported in gRPC scripts';

// A gRPC request can't run another request yet, so there is no `runRequestByItemPathname` to bind.
const bindUnsupportedRunRequest = (bru) => {
  bru.runRequest = () => Promise.reject(new Error(RUN_REQUEST_UNSUPPORTED));
};

/**
 * Runs the gRPC lifecycle hooks
 *
 * The two methods below mirror `ScriptRuntime`'s `runRequestScript` / `runResponseScript` step for
 * step, substituting the gRPC request/response models.
 *
 * Two intentional differences from `ScriptRuntime`, not oversights:
 * - `bru.runRequest` rejects instead of running anything (see `bindUnsupportedRunRequest`).
 * - The models live under `bru.grpc` rather than as the `req` / `res` globals HTTP scripts get.
 */
class GrpcScriptRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  async runGrpcRequestScript(
    script,
    request,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
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
    const bru = new Bru({
      runtime: this.runtime,
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
      certsAndProxyConfig,
      requestUrl: request?.url
    });

    // Initial scope - `request.messages` reports what the call sent, so it is still empty here.
    bru.grpc = { request: new BrunoGrpcRequest(request, { metadataWritable: true }) };

    // extend bru with result getter methods
    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults,
      __bruSetScope: createScopeSetter(bru)
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

    bindUnsupportedRunRequest(bru);

    const buildRequestScriptResult = () => ({
      request,
      envVariables: bru._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: bru._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: bru._collVarsDirty ? cleanJson(collectionVariables) : null,
      globalEnvironmentVariables: bru._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      oauth2CredentialsToReset: bru.oauth2CredentialsToReset,
      results: cleanJson(__brunoTestResults.getResults()),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution,
      scriptedRequestEntries: cleanJson(bru.scriptedRequestEntries || [])
    });

    // Track script errors to attach partial results before re-throwing, so the variables the hook
    // set before it threw still reach the caller
    let scriptError = null;

    if (this.runtime === SANDBOX.NODEVM) {
      try {
        await runScriptInNodeVm({
          script,
          context,
          collectionPath,
          scriptingConfig,
          scriptPath
        });
      } catch (error) {
        scriptError = error;
      }

      if (scriptError) {
        scriptError.partialResults = buildRequestScriptResult();
        throw scriptError;
      }

      return buildRequestScriptResult();
    }

    // default runtime is `quickjs`
    try {
      await executeQuickJsVmAsync({
        script: script,
        context: context,
        collectionPath,
        scriptPath
      });
    } catch (error) {
      scriptError = error;
    }

    if (scriptError) {
      scriptError.partialResults = buildRequestScriptResult();
      throw scriptError;
    }

    return buildRequestScriptResult();
  }

  async runGrpcResponseScript(
    script,
    request,
    response,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    collectionName,
    { sentMessages = [] } = {}
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
    const bru = new Bru({
      runtime: this.runtime,
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
      certsAndProxyConfig,
      requestUrl: request?.url
    });

    // Passing sentMessages so only messages sent by client is accessible
    bru.grpc = {
      request: new BrunoGrpcRequest(request, { sentMessages }),
      response: new BrunoGrpcResponse(response)
    };

    // extend bru with result getter methods
    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults,
      __bruSetScope: createScopeSetter(bru)
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

    bindUnsupportedRunRequest(bru);

    const buildResponseScriptResult = () => ({
      response,
      envVariables: bru._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: bru._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: bru._collVarsDirty ? cleanJson(collectionVariables) : null,
      globalEnvironmentVariables: bru._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      oauth2CredentialsToReset: bru.oauth2CredentialsToReset,
      results: cleanJson(__brunoTestResults.getResults()),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution,
      scriptedRequestEntries: cleanJson(bru.scriptedRequestEntries || [])
    });

    let scriptError = null;

    if (this.runtime === SANDBOX.NODEVM) {
      try {
        await runScriptInNodeVm({
          script,
          context,
          collectionPath,
          scriptingConfig,
          scriptPath
        });
      } catch (error) {
        scriptError = error;
      }

      if (scriptError) {
        scriptError.partialResults = buildResponseScriptResult();
        throw scriptError;
      }

      return buildResponseScriptResult();
    }

    // default runtime is `quickjs`
    try {
      await executeQuickJsVmAsync({
        script: script,
        context: context,
        collectionPath,
        scriptPath
      });
    } catch (error) {
      scriptError = error;
    }

    if (scriptError) {
      scriptError.partialResults = buildResponseScriptResult();
      throw scriptError;
    }

    return buildResponseScriptResult();
  }
}

module.exports = GrpcScriptRuntime;
