const chai = require('chai');
const Bru = require('../bru');
const { cleanJson } = require('../utils');
const { createBruTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { SANDBOX } = require('../utils/sandbox');
const { bindRunRequest, createScopeSetter } = require('./scripted-entries');

/**
 * Runs the scripts of a gRPC call. Each of the four phases (beforeCallStart, beforeMessageSend,
 * afterMessageReceive, afterCallEnd) runs through `runGrpcScript`, which builds the phase-aware
 * `bru.grpc` namespace from `phase` + `phaseData` — there is no `req`/`res` in the sandbox, since a
 * gRPC call has messages rather than a single request/response pair.
 */
class GrpcScriptRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  /**
   * @param {object} args
   * @param {string} args.phaseType - the phase's `request.script` field, e.g. `beforeCallStart`
   * @param {object} [args.phaseData] - payload for the `bru.grpc` namespace (message, response, ...)
   * @param {object} [args.primary] - `{ request }` before the call, `{ response }` after it
   */
  async runGrpcScript({
    phaseType,
    script,
    request,
    phaseData,
    primary = { request },
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname = null,
    collectionName
  }) {
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
      requestUrl: request?.url,
      request,
      phaseType,
      phaseData
    });

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

    bindRunRequest(bru, runRequestByItemPathname);

    // `primary` is `{ request }` for the phases that run before the call and `{ response }` for the
    // ones after it, so the caller gets back whichever the phase could have mutated.
    const buildGrpcScriptResult = () => ({
      ...primary,
      envVariables: bru._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: bru._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: bru._collVarsDirty ? cleanJson(collectionVariables) : null,
      persistentEnvVariables: cleanJson(bru.persistentEnvVariables),
      globalEnvironmentVariables: bru._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      oauth2CredentialsToReset: bru.oauth2CredentialsToReset,
      results: cleanJson(__brunoTestResults.getResults()),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution,
      scriptedRequestEntries: cleanJson(bru.scriptedRequestEntries || [])
    });

    // Track script errors to attach partial results before re-throwing, so any test() calls that
    // passed before the error are preserved
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
        scriptError.partialResults = buildGrpcScriptResult();
        throw scriptError;
      }

      return buildGrpcScriptResult();
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
      scriptError.partialResults = buildGrpcScriptResult();
      throw scriptError;
    }

    return buildGrpcScriptResult();
  }
}

module.exports = GrpcScriptRuntime;
