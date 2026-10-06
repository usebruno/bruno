const { cloneDeep, isEqual } = require('lodash');
const xmlFormat = require('xml-formatter');
const { interpolate: _interpolate } = require('@usebruno/common');
const { createSendRequest } = require('@usebruno/requests').scripting;
const { jar: createCookieJar, getCookiesForUrl } = require('@usebruno/requests').cookies;
const CookieList = require('./cookie-list');

const variableNameRegex = /^[\w-.]*$/;

const assertValidVariableName = (key) => {
  if (variableNameRegex.test(key) === false) {
    throw new Error(
      `Variable name: "${key}" contains invalid characters!`
      + ' Names must only contain alpha-numeric characters, "-", "_", "."'
    );
  }
};

/**
 * Controls for the collection runner.
 * @typedef {object} Runner
 * @property {() => void} skipRequest - Skip the current request. Call it from a pre-request script; the request is not sent and is reported as skipped.
 * @property {() => void} stopExecution - Stop the collection run once the current request finishes. No further requests are run.
 * @property {(requestName: string | null) => void} setNextRequest - Choose the request the runner runs next, by its name. `null` ends the run after the current request.
 */

/**
 * Helpers for formatting payloads.
 * @typedef {object} ScriptUtils
 * @property {(json: string | object) => string} minifyJson - Minify JSON: strip all whitespace from a JSON string, or serialize an object without any. Throws on invalid JSON.
 * @property {(xml: string) => string} minifyXml - Minify an XML string by removing the whitespace between tags. Throws on invalid XML.
 */

/**
 * The response of a request sent with `bru.sendRequest()`.
 * @typedef {object} SendRequestResponse
 * @property {number} status - The HTTP status code.
 * @property {string} statusText - The HTTP status text.
 * @property {Record<string, string | string[]>} headers - The response headers, with lower-case names.
 * @property {*} data - The response body, parsed as JSON when it is JSON.
 */

/**
 * The response of a collection request run with `bru.runRequest()`.
 * @typedef {object} RunRequestResponse
 * @property {number | string} status - The HTTP status code, or `'skipped'` for a request that can't be run from a script (WebSocket and gRPC requests).
 * @property {string} statusText - The HTTP status text, or why the request was skipped.
 * @property {Record<string, string | string[]>} headers - The response headers.
 * @property {*} data - The response body.
 * @property {number} duration - How long the request took, in milliseconds.
 * @property {number} size - The size of the response, in bytes.
 */

/**
 * Pass and fail counts of a set of results.
 * @typedef {object} ResultsSummary
 * @property {number} total - How many results there are.
 * @property {number} passed - How many passed.
 * @property {number} failed - How many failed.
 * @property {number} skipped - How many were skipped.
 */

/**
 * One `test()` result.
 * @typedef {object} TestResult
 * @property {'pass' | 'fail' | 'skip'} status - The outcome.
 * @property {string} description - The name the test was declared with.
 * @property {*} [expected] - The expected value, for a failed assertion.
 * @property {*} [actual] - The actual value, for a failed assertion.
 * @property {string} [error] - The failure message.
 */

/**
 * The `test()` results of the current script so far.
 * @typedef {object} TestResults
 * @property {ResultsSummary} summary - Pass and fail counts.
 * @property {TestResult[]} results - One entry per test, in the order they finished.
 */

/**
 * One result of the request's Assert tab.
 * @typedef {object} AssertionResult
 * @property {'pass' | 'fail'} status - The outcome.
 * @property {string} lhsExpr - The expression asserted on, such as `res.status`.
 * @property {string} rhsExpr - The assertion as written, such as `eq 200`.
 * @property {string} operator - The assertion's operator, such as `eq`.
 * @property {*} rhsOperand - The value the expression was compared with.
 * @property {string} [error] - The failure message.
 */

/**
 * The results of the request's Assert tab.
 * @typedef {object} AssertionResults
 * @property {ResultsSummary} summary - Pass and fail counts.
 * @property {AssertionResult[]} results - One entry per assertion.
 */

/**
 * Bruno's scripting API, available to every script as `bru`: variables at every scope, the
 * collection runner, cookies, and sending requests from a script.
 */
class Bru {
  /**
   * @param {object} options - Single options object (destructured)
   * @param {string} options.runtime - The runtime environment ('quickjs' or 'nodevm')
   * @param {object} [options.envVariables={}] - Environment variables
   * @param {object} [options.runtimeVariables={}] - Runtime variables
   * @param {object} [options.processEnvVars={}] - Process environment variables (deep cloned)
   * @param {string} [options.collectionPath] - Path to the collection
   * @param {object} [options.collectionVariables={}] - Collection-level variables
   * @param {object} [options.folderVariables={}] - Folder-level variables
   * @param {object} [options.requestVariables={}] - Request-level variables
   * @param {object} [options.globalEnvironmentVariables={}] - Global environment variables
   * @param {object} [options.oauth2CredentialVariables={}] - OAuth2 credential variables
   * @param {string} [options.collectionName] - Name of the collection
   * @param {object} [options.promptVariables={}] - Prompt variables
   * @param {object} [options.certsAndProxyConfig] - Configuration for bru.sendRequest (proxy, certs, TLS)
   * @param {string} [options.certsAndProxyConfig.collectionPath] - Path to the collection
   * @param {object} [options.certsAndProxyConfig.options] - TLS and proxy options
   * @param {object} [options.certsAndProxyConfig.clientCertificates] - Client certificate configuration
   * @param {object} [options.certsAndProxyConfig.collectionLevelProxy] - Collection-level proxy settings
   * @param {object} [options.certsAndProxyConfig.systemProxyConfig] - System proxy configuration
   * @param {string} [options.requestUrl] - The URL of the current request (used for cookie access)
   */
  constructor({
    runtime,
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
    requestUrl
  }) {
    /** @internal */
    this.envVariables = envVariables || {};
    /** @internal */
    this.runtimeVariables = runtimeVariables || {};
    /** @internal */
    this.promptVariables = promptVariables || {};
    /** @internal */
    this.processEnvVars = cloneDeep(processEnvVars || {});
    /** @internal */
    this.collectionVariables = collectionVariables || {};
    /** @internal */
    this.folderVariables = folderVariables || {};
    /** @internal */
    this.requestVariables = requestVariables || {};
    /** @internal */
    this.globalEnvironmentVariables = globalEnvironmentVariables || {};
    /** @internal */
    this.oauth2CredentialVariables = oauth2CredentialVariables || {};
    /** @internal */
    this.collectionPath = collectionPath;
    /** @internal */
    this.collectionName = collectionName;
    // Set by the host-side __bruSetScope global at the top of each segment's IIFE.
    /** @internal */
    this._currentScope = null;
    /** @internal */
    this.scriptedRequestEntries = [];
    /**
     * Send an HTTP request from the script and resolve with its response.
     *
     * Takes an axios request config (`method`, `url`, `headers`, `data`, `timeout`, …) or just a
     * URL. The request goes through the collection's proxy and certificate settings. Without a
     * callback the promise rejects on a network error or a 4xx/5xx status; with one, the callback
     * gets `(error, response)` instead, and `error.status` holds the HTTP status.
     *
     * @type {(config: object | string, callback?: (error: any, response: SendRequestResponse | null) => void | Promise<void>) => Promise<SendRequestResponse>}
     * @param config - An axios request config, or the URL to GET.
     * @param callback - Called with `(error, response)` once the request settles.
     * @returns The response.
     * @example
     * const response = await bru.sendRequest({
     *   method: 'POST',
     *   url: 'https://echo.usebruno.com',
     *   headers: { 'Content-Type': 'application/json' },
     *   data: { hello: 'bruno' }
     * });
     * bru.setVar('echoed', response.data);
     * @category Requests
     */
    this.sendRequest = (...args) => {
      const scopeSnapshot = this._currentScope ? { ...this._currentScope } : null;
      const send = createSendRequest(certsAndProxyConfig, {
        onComplete: (entry) =>
          this._recordScriptedRequest({ source: 'sendRequest', scope: scopeSnapshot, ...entry })
      });
      return send(...args);
    };
    /** @internal */
    this.runtime = runtime;
    /** @internal */
    this.requestUrl = requestUrl;
    /**
     * The cookies of the current request's URL, read from and written to the app's cookie jar.
     *
     * Reads are synchronous; writes return a promise. `bru.cookies.jar()` reaches cookies of any URL.
     * @example
     * const sessionId = bru.cookies.get('sid');
     * await bru.cookies.upsert({ key: 'lang', value: 'en' });
     * @category Cookies
     */
    this.cookies = new CookieList({
      getUrl: () => this.interpolate(this.requestUrl),
      interpolate: (str) => this.interpolate(str),
      createCookieJar,
      getCookiesForUrl
    });
    // Dirty flags — set by mutators so runtimes can skip IPC/disk writes for unchanged scopes
    /** @internal */
    this._envDirty = false;
    /** @internal */
    this._globalEnvDirty = false;
    /** @internal */
    this._collVarsDirty = false;
    /** @internal */
    this._runtimeVarsDirty = false;
    // Holds credential IDs to be reset after script execution
    /** @internal */
    this.oauth2CredentialsToReset = [];
    // Runner outcomes, set by `runner` and `setNextRequest()` and read back by the runtimes.
    /** @internal @type {string | null | undefined} */
    this.nextRequest;
    /** @internal @type {boolean | undefined} */
    this.skipRequest;
    /** @internal @type {boolean | undefined} */
    this.stopExecution;
    /**
     * Steer the collection runner: skip the current request, stop the run, or choose what runs next.
     *
     * These only take effect when the request runs as part of a collection or folder run.
     * @type {Runner}
     * @example
     * if (!bru.getEnvVar('token')) {
     *   bru.runner.skipRequest();
     * }
     * @category Runner
     */
    this.runner = {
      skipRequest: () => {
        this.skipRequest = true;
      },
      stopExecution: () => {
        this.stopExecution = true;
      },
      setNextRequest: (nextRequest) => {
        this.nextRequest = nextRequest;
      }
    };

    /**
     * Helpers for formatting payloads.
     * @type {ScriptUtils}
     * @example
     * req.setBody(bru.utils.minifyJson(req.getBody({ raw: true })), { raw: true });
     * @runtime nodevm
     * @category Utilities
     */
    this.utils = {
      minifyJson: (json) => {
        if (json === null || json === undefined) {
          throw new Error('Failed to minify');
        }

        if (typeof json === 'object') {
          try {
            return JSON.stringify(json);
          } catch (err) {
            throw new Error(`Failed to minify: ${err?.message || err}`);
          }
        }

        if (typeof json === 'string') {
          const trimmed = json.trim();
          if (trimmed === '') return trimmed;
          try {
            return JSON.stringify(JSON.parse(trimmed));
          } catch (err) {
            throw new Error(`Failed to minify: ${err?.message || err}`);
          }
        }

        throw new TypeError('minifyJson expects a string or object');
      },

      minifyXml: (xml) => {
        if (xml === null || xml === undefined) {
          throw new Error('Failed to minify');
        }

        if (typeof xml === 'string') {
          try {
            return xmlFormat(xml, { collapseContent: false, indentation: '', lineSeparator: '' });
          } catch (err) {
            throw new Error(`Failed to minify: ${err?.message || err}`);
          }
        }

        throw new TypeError('minifyXml expects a string');
      }
    };

    /**
     * Run another request of the collection and resolve with its response.
     *
     * The request runs with its own scripts, variables and auth, as if it were sent from the app.
     * WebSocket and gRPC requests can't be run this way and resolve with `status: 'skipped'`.
     *
     * @type {(requestPathName: string) => Promise<RunRequestResponse>}
     * @param requestPathName - The request's path from the collection root, with or without the
     *   file extension, such as `'auth/login'`.
     * @returns The response.
     * @example
     * const login = await bru.runRequest('auth/login');
     * bru.setVar('token', login.data.token);
     * @context pre-request post-response tests
     * @category Requests
     */
    this.runRequest;

    /**
     * Get the `test()` results of the current script so far.
     * @type {() => Promise<TestResults>}
     * @returns The pass and fail counts and one entry per test.
     * @example
     * const { summary } = await bru.getTestResults();
     * console.log(`${summary.passed}/${summary.total} passed`);
     * @category Tests
     */
    this.getTestResults;

    /**
     * Get the results of the request's Assert tab.
     *
     * Assertions run after the post-response script and before the tests, so only tests see them.
     * @type {() => Promise<AssertionResults>}
     * @returns The pass and fail counts and one entry per assertion.
     * @example
     * const { summary } = await bru.getAssertionResults();
     * test('all assertions pass', () => expect(summary.failed).to.equal(0));
     * @context tests
     * @category Tests
     */
    this.getAssertionResults;

    /**
     * The gRPC call the hook runs in: its request and, once the server answers, its response.
     * @type {import('../types/globals').Grpc}
     * @context grpc:before-call-start grpc:before-message-send grpc:after-message-receive grpc:after-call-end
     * @category gRPC
     */
    this.grpc;
  }

  /**
   * Replace the `{{variable}}` placeholders in a string, or in every string of an object.
   *
   * Variables resolve the same way they do in a request, from every scope, and
   * `{{process.env.NAME}}` reads a process environment variable.
   *
   * @param {string | object} strOrObj - The string, or an object whose string values to interpolate.
   * @returns {any} The interpolated string, or a new object.
   * @example
   * const url = bru.interpolate('{{baseUrl}}/users/{{userId}}');
   * @category Utilities
   */
  interpolate = (strOrObj) => {
    if (!strOrObj) return strOrObj;
    const isObj = typeof strOrObj === 'object';
    const strToInterpolate = isObj ? JSON.stringify(strOrObj) : strOrObj;

    const combinedVars = {
      ...this.globalEnvironmentVariables,
      ...this.collectionVariables,
      ...this.envVariables,
      ...this.folderVariables,
      ...this.requestVariables,
      ...this.oauth2CredentialVariables,
      ...this.runtimeVariables,
      ...this.promptVariables,
      process: {
        env: {
          ...this.processEnvVars
        }
      }
    };

    const interpolatedStr = _interpolate(strToInterpolate, combinedVars);
    return isObj ? JSON.parse(interpolatedStr) : interpolatedStr;
  };

  /**
   * Get the path of the collection's folder on disk.
   * @returns {string} The collection's directory.
   * @category Collection
   */
  cwd() {
    return this.collectionPath;
  }

  /** @internal */
  _recordScriptedRequest(entry) {
    // Prefer scope passed in by the caller (snapshot at call time). Fall back to
    // _currentScope for callers that don't supply one (e.g. bru.runRequest).
    const { scope: providedScope, ...rest } = entry;
    const scope = providedScope !== undefined
      ? providedScope
      : (this._currentScope ? { ...this._currentScope } : null);
    this.scriptedRequestEntries.push({ ...rest, scope });
  }

  /**
   * Get the name of the selected environment.
   * @returns {string | undefined} The environment's name, or `undefined` when none is selected.
   * @category Environment
   */
  getEnvName() {
    return this.envVariables.__name__;
  }

  /**
   * Read a process environment variable, including those from the collection's `.env` file.
   * @param {string} key - The variable's name.
   * @returns {string | undefined} The value, or `undefined` when it is not set.
   * @example
   * const apiKey = bru.getProcessEnv('API_KEY');
   * @category Environment
   */
  getProcessEnv(key) {
    return this.processEnvVars[key];
  }

  /**
   * Check whether the selected environment defines a variable.
   * @param {string} key - The variable's name.
   * @returns {boolean} `true` when the variable exists, even with an empty value.
   * @category Environment
   */
  hasEnvVar(key) {
    return Object.hasOwn(this.envVariables, key);
  }

  /**
   * Get the value of a variable of the selected environment.
   *
   * `{{placeholders}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when it is not set.
   * @example
   * const baseUrl = bru.getEnvVar('baseUrl');
   * @category Environment
   */
  getEnvVar(key) {
    return this.interpolate(this.envVariables[key]);
  }

  /**
   * Set a variable of the selected environment, creating it when it doesn't exist.
   *
   * The change is visible to the requests that run after this one.
   * @param {string} key - The variable's name: letters, digits, `-`, `_` and `.` only.
   * @param {any} value - The value. Objects and arrays are stored as they are.
   * @example
   * bru.setEnvVar('token', res.body.token);
   * @category Environment
   */
  setEnvVar(key, value) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    assertValidVariableName(key);

    // Deep-equal compare so object/array writes that mutate in place
    // (e.g. `const c = bru.getEnvVar('cfg'); c.port = 4000; bru.setEnvVar('cfg', c);`)
    // still flip the dirty flag — strict `!==` returned false for same-reference writes.
    if (!Object.hasOwn(this.envVariables, key) || !isEqual(this.envVariables[key], value)) {
      this.envVariables[key] = value;
      this._envDirty = true;
    }
  }

  /**
   * Delete a variable from the selected environment.
   * @param {string} key - The variable's name. Nothing happens when it doesn't exist.
   * @category Environment
   */
  deleteEnvVar(key) {
    if (key === '__name__') return;
    if (Object.hasOwn(this.envVariables, key)) {
      delete this.envVariables[key];
      this._envDirty = true;
    }
  }

  /**
   * Get every variable of the selected environment.
   * @returns {Record<string, any>} A copy of the variables, by name. Values are not interpolated.
   * @category Environment
   */
  getAllEnvVars() {
    const vars = Object.assign({}, this.envVariables);
    delete vars.__name__;
    return vars;
  }

  /**
   * Delete every variable of the selected environment.
   * @category Environment
   */
  deleteAllEnvVars() {
    // Iterate via Object.keys (own enumerable) so a user-set `hasOwnProperty` var
    // can't shadow Object.prototype.hasOwnProperty and crash the loop.
    let removed = false;
    for (const key of Object.keys(this.envVariables)) {
      if (key === '__name__') continue;
      delete this.envVariables[key];
      removed = true;
    }
    if (removed) this._envDirty = true;
  }

  /**
   * Check whether the selected global environment defines a variable.
   * @param {string} key - The variable's name.
   * @returns {boolean} `true` when the variable exists.
   * @category Global environment
   */
  hasGlobalEnvVar(key) {
    return Object.hasOwn(this.globalEnvironmentVariables, key);
  }

  /**
   * Get the value of a variable of the selected global environment.
   *
   * `{{placeholders}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when it is not set.
   * @category Global environment
   */
  getGlobalEnvVar(key) {
    return this.interpolate(this.globalEnvironmentVariables[key]);
  }

  /**
   * Set a variable of the selected global environment, creating it when it doesn't exist.
   * @param {string} key - The variable's name: letters, digits, `-`, `_` and `.` only.
   * @param {any} value - The value.
   * @example
   * bru.setGlobalEnvVar('region', 'eu-west-1');
   * @category Global environment
   */
  setGlobalEnvVar(key, value) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    assertValidVariableName(key);

    if (!Object.hasOwn(this.globalEnvironmentVariables, key) || !isEqual(this.globalEnvironmentVariables[key], value)) {
      this.globalEnvironmentVariables[key] = value;
      this._globalEnvDirty = true;
    }
  }

  /**
   * Delete a variable from the selected global environment.
   * @param {string} key - The variable's name. Nothing happens when it doesn't exist.
   * @category Global environment
   */
  deleteGlobalEnvVar(key) {
    if (Object.hasOwn(this.globalEnvironmentVariables, key)) {
      delete this.globalEnvironmentVariables[key];
      this._globalEnvDirty = true;
    }
  }

  /**
   * Get every variable of the selected global environment.
   * @returns {Record<string, any>} A copy of the variables, by name. Values are not interpolated.
   * @category Global environment
   */
  getAllGlobalEnvVars() {
    return Object.assign({}, this.globalEnvironmentVariables);
  }

  /**
   * Delete every variable of the selected global environment.
   * @category Global environment
   */
  deleteAllGlobalEnvVars() {
    const keys = Object.keys(this.globalEnvironmentVariables);
    if (!keys.length) return;
    for (const key of keys) {
      delete this.globalEnvironmentVariables[key];
    }
    this._globalEnvDirty = true;
  }

  /**
   * Read a value of an OAuth2 credential the collection has fetched.
   * @param {string} key - The credential variable, such as
   *   `'$oauth2.<credentialId>.access_token'`.
   * @returns {any} The value, or `undefined` when there is none.
   * @example
   * const token = bru.getOauth2CredentialVar('$oauth2.my-auth.access_token');
   * @category OAuth2
   */
  getOauth2CredentialVar(key) {
    return this.interpolate(this.oauth2CredentialVariables[key]);
  }

  /**
   * Discard a stored OAuth2 credential, so the next request that uses it fetches a new token.
   *
   * Its values read as `undefined` for the rest of the script.
   * @param {string} credentialId - The credential's ID.
   * @category OAuth2
   */
  resetOauth2Credential(credentialId) {
    if (!credentialId || typeof credentialId !== 'string') {
      throw new Error('credentialId must be a non-empty string');
    }

    if (!this.oauth2CredentialsToReset.includes(credentialId)) {
      this.oauth2CredentialsToReset.push(credentialId);
    }

    // Remove matching credential variables so subsequent getOauth2CredentialVar() calls return undefined
    const prefix = `$oauth2.${credentialId}.`;
    for (const key of Object.keys(this.oauth2CredentialVariables)) {
      if (key.startsWith(prefix)) {
        delete this.oauth2CredentialVariables[key];
      }
    }
  }

  /**
   * Check whether a runtime variable exists.
   * @param {string} key - The variable's name.
   * @returns {boolean} `true` when the variable exists.
   * @category Runtime variables
   */
  hasVar(key) {
    return Object.hasOwn(this.runtimeVariables, key);
  }

  /**
   * Set a runtime variable, creating it when it doesn't exist.
   *
   * Runtime variables last until the app is closed.
   * @param {string} key - The variable's name: letters, digits, `-`, `_` and `.` only.
   * @param {any} value - The value.
   * @example
   * bru.setVar('userId', res.body.id);
   * @category Runtime variables
   */
  setVar(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    assertValidVariableName(key);

    if (!Object.hasOwn(this.runtimeVariables, key) || !isEqual(this.runtimeVariables[key], value)) {
      this.runtimeVariables[key] = value;
      this._runtimeVarsDirty = true;
    }
  }

  /**
   * Get the value of a runtime variable.
   *
   * `{{placeholders}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when it is not set.
   * @example
   * const userId = bru.getVar('userId');
   * @category Runtime variables
   */
  getVar(key) {
    assertValidVariableName(key);

    return this.interpolate(this.runtimeVariables[key]);
  }

  /**
   * Delete a runtime variable.
   * @param {string} key - The variable's name. Nothing happens when it doesn't exist.
   * @category Runtime variables
   */
  deleteVar(key) {
    if (Object.hasOwn(this.runtimeVariables, key)) {
      delete this.runtimeVariables[key];
      this._runtimeVarsDirty = true;
    }
  }

  /**
   * Delete every runtime variable.
   * @category Runtime variables
   */
  deleteAllVars() {
    const keys = Object.keys(this.runtimeVariables);
    if (!keys.length) return;
    for (const key of keys) {
      delete this.runtimeVariables[key];
    }
    this._runtimeVarsDirty = true;
  }

  /**
   * Get every runtime variable.
   * @returns {Record<string, any>} A copy of the variables, by name. Values are not interpolated.
   * @category Runtime variables
   */
  getAllVars() {
    return Object.assign({}, this.runtimeVariables);
  }

  /**
   * Get the value of a collection variable.
   *
   * `{{placeholders}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when it is not set.
   * @category Collection variables
   */
  getCollectionVar(key) {
    return this.interpolate(this.collectionVariables[key]);
  }

  /**
   * Set a collection variable, creating it when it doesn't exist.
   * @param {string} key - The variable's name: letters, digits, `-`, `_` and `.` only.
   * @param {any} value - The value.
   * @category Collection variables
   */
  setCollectionVar(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    assertValidVariableName(key);

    if (!Object.hasOwn(this.collectionVariables, key) || !isEqual(this.collectionVariables[key], value)) {
      this.collectionVariables[key] = value;
      this._collVarsDirty = true;
    }
  }

  /**
   * Check whether a collection variable exists.
   * @param {string} key - The variable's name.
   * @returns {boolean} `true` when the variable exists.
   * @category Collection variables
   */
  hasCollectionVar(key) {
    return Object.hasOwn(this.collectionVariables, key);
  }

  /**
   * Delete a collection variable.
   * @param {string} key - The variable's name. Nothing happens when it doesn't exist.
   * @category Collection variables
   */
  deleteCollectionVar(key) {
    if (Object.hasOwn(this.collectionVariables, key)) {
      delete this.collectionVariables[key];
      this._collVarsDirty = true;
    }
  }

  /**
   * Delete every collection variable.
   * @category Collection variables
   */
  deleteAllCollectionVars() {
    const keys = Object.keys(this.collectionVariables);
    if (!keys.length) return;
    for (const key of keys) {
      delete this.collectionVariables[key];
    }
    this._collVarsDirty = true;
  }

  /**
   * Get every collection variable.
   * @returns {Record<string, any>} A copy of the variables, by name. Values are not interpolated.
   * @category Collection variables
   */
  getAllCollectionVars() {
    return Object.assign({}, this.collectionVariables);
  }

  /**
   * Get the value of a variable of the request's folder. Folder variables are read-only in scripts.
   * @param {string} key - The variable's name.
   * @returns {any} The interpolated value, or `undefined` when it is not set.
   * @category Folder and request variables
   */
  getFolderVar(key) {
    return this.interpolate(this.folderVariables[key]);
  }

  /**
   * Get the value of a variable of the request itself. Request variables are read-only in scripts.
   * @param {string} key - The variable's name.
   * @returns {any} The interpolated value, or `undefined` when it is not set.
   * @category Folder and request variables
   */
  getRequestVar(key) {
    return this.interpolate(this.requestVariables[key]);
  }

  /**
   * Choose the request the collection runner runs next, by its name.
   * @param {string | null} nextRequest - The request's name, or `null` to end the run.
   * @deprecated Use `bru.runner.setNextRequest()`.
   * @category Runner
   */
  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }

  /**
   * Wait for a number of milliseconds.
   * @param {number} ms - How long to wait.
   * @returns {Promise<void>} Resolves once the time has passed.
   * @example
   * await bru.sleep(1000);
   * @category Utilities
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the name of the collection.
   * @returns {string} The collection's name.
   * @category Collection
   */
  getCollectionName() {
    return this.collectionName;
  }

  /**
   * Check whether the script runs in Safe Mode, the sandbox without Node.js modules or file access.
   * @returns {boolean} `true` in Safe Mode, `false` in Developer Mode.
   * @category Utilities
   */
  isSafeMode() {
    return this.runtime === 'quickjs';
  }
}

module.exports = Bru;
