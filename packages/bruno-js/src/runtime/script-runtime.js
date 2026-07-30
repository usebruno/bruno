const chai = require('chai');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const BrunoResponse = require('../bruno-response');
const { cleanJson } = require('../utils');
const { createBruTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { SANDBOX } = require('../utils/sandbox');
const { bindRunRequest, createScopeSetter } = require('./scripted-entries');
const { SCRIPT_PHASES } = require('@usebruno/common');

class ScriptRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  // ── HTTP phases ─────────────────────────────────────────────────────────────

  async runHttpPreRequestScript(
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
    const req = new BrunoRequest(request);

    // extend bru with result getter methods
    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      req,
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

    // Helper to build the result object for pre-request scripts
    // Extracted to avoid duplication across runtime branches
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

    // Track script errors to attach partial results before re-throwing
    // This ensures that any test() calls that passed before the error are preserved
    // Similar pattern to test-runtime.js which already handles this correctly
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

      // If script errored, attach partial results so callers can display passed tests
      // before the error occurred (e.g., 2 tests pass, then script throws)
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

  async runHttpPostResponseScript(
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

    bindRunRequest(bru, runRequestByItemPathname);

    // Helper to build the result object for post-response scripts
    // Extracted to avoid duplication across runtime branches
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

    // Track script errors to attach partial results before re-throwing
    // This ensures that any test() calls that passed before the error are preserved
    // Similar pattern to test-runtime.js which already handles this correctly
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

      // If script errored, attach partial results so callers can display passed tests
      // before the error occurred (e.g., 2 tests pass, then script throws)
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

  // ── gRPC phases ─────────────────────────────────────────────────────────────

  /** gRPC beforeCallStart — builds `bru` with the `bru.grpc.request.*` namespace. */
  async runGrpcBeforeCallStartScript(
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
    const {
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      collectionVariables,
      folderVariables,
      requestVariables,
      promptVariables,
      assertionResults,
      certsAndProxyConfig,
      scriptPath
    } = this.#extractScriptVars(request);
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
      phaseType: SCRIPT_PHASES.GRPC.BEFORE_CALL_START.FIELD
    });

    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults,
      __bruSetScope: createScopeSetter(bru)
    };

    const bruConsole = this.#buildConsole(onConsoleLog);
    if (bruConsole) context.console = bruConsole;

    bindRunRequest(bru, runRequestByItemPathname);

    const buildRequestScriptResult = () => this.#buildScriptResult({
      primary: { request },
      bru,
      testResults: __brunoTestResults,
      envVariables,
      runtimeVariables,
      collectionVariables,
      globalEnvironmentVariables
    });

    return this.#executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildRequestScriptResult);
  }

  // beforeMessageSend — mutate one outgoing message; returns the script result + the final `message`.
  async runGrpcBeforeMessageSendScript(
    script,
    request,
    outgoingMessage,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname,
    collectionName
  ) {
    const {
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      collectionVariables,
      folderVariables,
      requestVariables,
      promptVariables,
      assertionResults,
      certsAndProxyConfig,
      scriptPath
    } = this.#extractScriptVars(request);
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
      phaseType: SCRIPT_PHASES.GRPC.BEFORE_MESSAGE_SEND.FIELD,
      phaseData: { message: outgoingMessage }
    });

    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults,
      __bruSetScope: createScopeSetter(bru)
    };

    const bruConsole = this.#buildConsole(onConsoleLog);
    if (bruConsole) context.console = bruConsole;

    bindRunRequest(bru, runRequestByItemPathname);

    const buildRequestScriptResult = () => this.#buildScriptResult({
      primary: { request },
      bru,
      testResults: __brunoTestResults,
      envVariables,
      runtimeVariables,
      collectionVariables,
      globalEnvironmentVariables
    });

    const result = await this.#executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildRequestScriptResult);
    return { ...result, message: outgoingMessage };
  }

  /** gRPC afterMessageReceive — read a received message (and its receive time) as it arrives. */
  async runGrpcAfterMessageReceiveScript(
    script,
    request,
    message,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname,
    collectionName,
    messageReceivedAt
  ) {
    const {
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      collectionVariables,
      folderVariables,
      requestVariables,
      promptVariables,
      assertionResults,
      certsAndProxyConfig,
      scriptPath
    } = this.#extractScriptVars(request);
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
      phaseType: SCRIPT_PHASES.GRPC.AFTER_MESSAGE_RECEIVE.FIELD,
      phaseData: { message, timestamp: messageReceivedAt }
    });

    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults,
      __bruSetScope: createScopeSetter(bru)
    };

    const bruConsole = this.#buildConsole(onConsoleLog);
    if (bruConsole) context.console = bruConsole;

    bindRunRequest(bru, runRequestByItemPathname);

    const buildResponseScriptResult = () => this.#buildScriptResult({
      primary: { response: message },
      bru,
      testResults: __brunoTestResults,
      envVariables,
      runtimeVariables,
      collectionVariables,
      globalEnvironmentVariables
    });

    return this.#executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildResponseScriptResult);
  }

  /** gRPC afterCallEnd — builds `bru` with the `bru.grpc.response.*` namespace. */
  async runGrpcAfterCallEndScript(
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
    const {
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      collectionVariables,
      folderVariables,
      requestVariables,
      promptVariables,
      assertionResults,
      certsAndProxyConfig,
      scriptPath
    } = this.#extractScriptVars(request);
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
      phaseType: SCRIPT_PHASES.GRPC.AFTER_CALL_END.FIELD,
      phaseData: response // { responses, statusCode, statusText, trailers }
    });

    const { __brunoTestResults, test } = createBruTestResultMethods(bru, assertionResults, chai);

    const context = {
      bru,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __brunoTestResults: __brunoTestResults,
      __bruSetScope: createScopeSetter(bru)
    };

    const bruConsole = this.#buildConsole(onConsoleLog);
    if (bruConsole) context.console = bruConsole;

    bindRunRequest(bru, runRequestByItemPathname);

    const buildResponseScriptResult = () => this.#buildScriptResult({
      primary: { response },
      bru,
      testResults: __brunoTestResults,
      envVariables,
      runtimeVariables,
      collectionVariables,
      globalEnvironmentVariables
    });

    return this.#executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildResponseScriptResult);
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  // Build the sandbox `console` proxy that forwards to onConsoleLog (or undefined if none).
  #buildConsole(onConsoleLog) {
    if (typeof onConsoleLog !== 'function') return undefined;
    const customLogger = (type) => {
      return (...args) => {
        onConsoleLog(type, cleanJson(args));
      };
    };
    return {
      log: customLogger('log'),
      debug: customLogger('debug'),
      info: customLogger('info'),
      warn: customLogger('warn'),
      error: customLogger('error')
    };
  }

  // Run the script in the configured sandbox (nodevm or quickjs). On error, attach the partial
  // result (so passed test() calls are preserved) and re-throw; otherwise return the built result.
  async #executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildResult) {
    let scriptError = null;
    try {
      if (this.runtime === SANDBOX.NODEVM) {
        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig, scriptPath });
      } else {
        // default runtime is `quickjs`
        await executeQuickJsVmAsync({ script, context, collectionPath, scriptPath });
      }
    } catch (error) {
      scriptError = error;
    }

    if (scriptError) {
      scriptError.partialResults = buildResult();
      throw scriptError;
    }
    return buildResult();
  }

  // Pull the per-request values used to build `bru` (each defaults to empty).
  #extractScriptVars(request) {
    return {
      globalEnvironmentVariables: request?.globalEnvironmentVariables || {},
      oauth2CredentialVariables: request?.oauth2CredentialVariables || {},
      collectionVariables: request?.collectionVariables || {},
      folderVariables: request?.folderVariables || {},
      requestVariables: request?.requestVariables || {},
      promptVariables: request?.promptVariables || {},
      assertionResults: request?.assertionResults || [],
      certsAndProxyConfig: request?.certsAndProxyConfig,
      scriptPath: request?.pathname
    };
  }

  // Script result, shared by all phases. `primary` is `{ request }` before / `{ response }` after;
  // a variable scope is null when the script didn't write to it, so callers can skip the write.
  #buildScriptResult({ primary, bru, testResults, envVariables, runtimeVariables, collectionVariables, globalEnvironmentVariables }) {
    return {
      ...primary,
      envVariables: bru._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: bru._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: bru._collVarsDirty ? cleanJson(collectionVariables) : null,
      persistentEnvVariables: cleanJson(bru.persistentEnvVariables),
      globalEnvironmentVariables: bru._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      oauth2CredentialsToReset: bru.oauth2CredentialsToReset,
      results: cleanJson(testResults.getResults()),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution,
      scriptedRequestEntries: cleanJson(bru.scriptedRequestEntries || [])
    };
  }
}

module.exports = ScriptRuntime;
