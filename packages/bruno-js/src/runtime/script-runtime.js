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

  // Build the result object returned from a script run (shared by all phases). `primary` carries the
  // phase-specific first field — `{ request }` for the "before" phases, `{ response }` for "after".
  #buildScriptResult({ primary, bru, testResults, envVariables, runtimeVariables, globalEnvironmentVariables }) {
    return {
      ...primary,
      envVariables: cleanJson(envVariables),
      runtimeVariables: cleanJson(runtimeVariables),
      persistentEnvVariables: cleanJson(bru.persistentEnvVariables),
      globalEnvironmentVariables: cleanJson(globalEnvironmentVariables),
      oauth2CredentialsToReset: bru.oauth2CredentialsToReset,
      results: cleanJson(testResults.getResults()),
      nextRequestName: bru.nextRequest,
      skipRequest: bru.skipRequest,
      stopExecution: bru.stopExecution,
      scriptedRequestEntries: cleanJson(bru.scriptedRequestEntries || [])
    };
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

    const bruConsole = this.#buildConsole(onConsoleLog);
    if (bruConsole) context.console = bruConsole;

    bindRunRequest(bru, runRequestByItemPathname);

    const buildRequestScriptResult = () => this.#buildScriptResult({
      primary: { request },
      bru,
      testResults: __brunoTestResults,
      envVariables,
      runtimeVariables,
      globalEnvironmentVariables
    });

    return this.#executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildRequestScriptResult);
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

    const bruConsole = this.#buildConsole(onConsoleLog);
    if (bruConsole) context.console = bruConsole;

    bindRunRequest(bru, runRequestByItemPathname);

    const buildResponseScriptResult = () => this.#buildScriptResult({
      primary: { response },
      bru,
      testResults: __brunoTestResults,
      envVariables,
      runtimeVariables,
      globalEnvironmentVariables
    });

    return this.#executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildResponseScriptResult);
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
      phaseData: response // { responses, statusCode, statusMessage, trailers }
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
      globalEnvironmentVariables
    });

    return this.#executeInSandbox({ script, context, collectionPath, scriptingConfig, scriptPath }, buildResponseScriptResult);
  }
}

module.exports = ScriptRuntime;
