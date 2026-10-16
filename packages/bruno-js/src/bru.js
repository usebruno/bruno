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
 * A function the collection runner offers a script, through `bru.runner`.
 * @typedef {object} Runner
 * @property {() => void} skipRequest - Skip sending this request in a collection run. It takes
 *   effect only in a pre-request script.
 * @property {() => void} stopExecution - End the collection run once this request is done.
 * @property {(requestName: string | null) => void} setNextRequest - Run the request with this name
 *   next in a collection run, instead of the next one in order. `null` ends the run.
 */

/**
 * Helpers for scripts, through `bru.utils`.
 * @typedef {object} Utils
 * @property {(json: string | object) => string} minifyJson - Convert JSON text, or an object, to
 *   JSON without whitespace. Throws on invalid JSON.
 * @property {(xml: string) => string} minifyXml - Remove the whitespace between the elements of
 *   an XML string. Throws on invalid XML.
 */

/**
 * The options of `bru.sendRequest`: a URL and Axios request options.
 * @typedef {object} SendRequestOptions
 * @property {string} url - The URL. `{{variables}}` are not interpolated; use `bru.interpolate`.
 * @property {string} [method] - The HTTP method. Defaults to `'GET'`.
 * @property {Record<string, any>} [headers] - The request headers.
 * @property {any} [data] - The request body. An object is sent as JSON.
 * @property {Record<string, any>} [params] - Query parameters to add to the URL.
 * @property {number} [timeout] - The timeout, in milliseconds.
 */

/**
 * The response `bru.sendRequest` resolves with.
 * @typedef {object} SendRequestResponse
 * @property {number} status - The HTTP status code.
 * @property {string} statusText - The HTTP status text.
 * @property {Record<string, any>} headers - The response headers.
 * @property {any} data - The response body. A JSON body is parsed.
 */

/**
 * The response `bru.runRequest` resolves with.
 * @typedef {object} RunRequestResponse
 * @property {number | string} status - The HTTP status code, or `'skipped'` for a request whose
 *   protocol a script can't run.
 * @property {string} statusText - The HTTP status text.
 * @property {Record<string, any>} headers - The response headers.
 * @property {any} data - The response body.
 * @property {number} duration - How long the request took, in milliseconds.
 * @property {number} size - The size of the response, in bytes.
 */

/**
 * The totals of a set of results.
 * @typedef {object} ResultsSummary
 * @property {number} total - The number of results.
 * @property {number} passed - The number that passed.
 * @property {number} failed - The number that failed.
 * @property {number} skipped - The number that neither passed nor failed.
 */

/**
 * The result of one `test()`.
 * @typedef {object} TestResult
 * @property {'pass' | 'fail'} status - The outcome.
 * @property {string} description - The test's name.
 * @property {any} [expected] - What a failed assertion expected.
 * @property {any} [actual] - What a failed assertion got.
 * @property {string} [error] - The error message of a failed test.
 */

/**
 * The results of the `test()` calls so far.
 * @typedef {object} TestResults
 * @property {ResultsSummary} summary - The totals.
 * @property {TestResult[]} results - One entry per test, in order.
 */

/**
 * The result of one assertion of the request's Assert tab.
 * @typedef {object} AssertionResult
 * @property {'pass' | 'fail'} status - The outcome.
 * @property {string} lhsExpr - The expression checked, such as `res.status`.
 * @property {string} rhsExpr - The expected expression, such as `eq 200`.
 * @property {string} operator - The operator, such as `eq`.
 * @property {any} rhsOperand - The value compared with.
 * @property {string} [error] - The error message of a failed assertion.
 */

/**
 * The results of the request's assertions.
 * @typedef {object} AssertionResults
 * @property {ResultsSummary} summary - The totals.
 * @property {AssertionResult[]} results - One entry per assertion.
 */

/**
 * Bruno's scripting API, available to every script as `bru`: variables at every scope, the
 * collection runner, cookies, and sending requests from a script.
 */
class Bru {
  #onUnresolved;

  /**
   * @param {object} options - Single options object (destructured)
   * @property {string} options.runtime - The runtime environment ('quickjs' or 'nodevm')
   * @property {object} [options.envVariables={}] - Environment variables
   * @property {object} [options.runtimeVariables={}] - Runtime variables
   * @property {object} [options.processEnvVars={}] - Process environment variables (deep cloned)
   * @property {string} [options.collectionPath] - Path to the collection
   * @property {object} [options.collectionVariables={}] - Collection-level variables
   * @property {object} [options.folderVariables={}] - Folder-level variables
   * @property {object} [options.requestVariables={}] - Request-level variables
   * @property {object} [options.globalEnvironmentVariables={}] - Global environment variables
   * @property {object} [options.oauth2CredentialVariables={}] - OAuth2 credential variables
   * @property {string} [options.collectionName] - Name of the collection
   * @property {object} [options.promptVariables={}] - Prompt variables
   * @property {object} [options.certsAndProxyConfig] - Configuration for bru.sendRequest (proxy, certs, TLS)
   * @property {string} [options.certsAndProxyConfig.collectionPath] - Path to the collection
   * @property {object} [options.certsAndProxyConfig.options] - TLS and proxy options
   * @property {object} [options.certsAndProxyConfig.clientCertificates] - Client certificate configuration
   * @property {object} [options.certsAndProxyConfig.collectionLevelProxy] - Collection-level proxy settings
   * @property {object} [options.certsAndProxyConfig.systemProxyConfig] - System proxy configuration
   * @property {string} [options.requestUrl] - The URL of the current request (used for cookie access)
   * @property {function(string): void} [options.onUnresolved] - Called with each variable a script reads or interpolates that is not defined
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
    requestUrl,
    onUnresolved
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
    this.#onUnresolved = onUnresolved;
    // Set by the host-side __bruSetScope global at the top of each segment's IIFE.
    /** @internal */
    this._currentScope = null;
    /** @internal */
    this.scriptedRequestEntries = [];
    /**
     * Send an HTTP request from the script and wait for the response.
     *
     * Without a callback the promise rejects when the request fails. With one, the callback gets
     * `(error, response)` and the promise resolves with the response, or with nothing on error.
     * The request uses the collection's proxy and certificate settings.
     * @type {(options: SendRequestOptions | string, callback?: (error: any, response: SendRequestResponse | null) => any) => Promise<SendRequestResponse>}
     * @param options - The request: a URL, or a URL with Axios request options.
     * @param callback - Called with the error, or with `null` and the response.
     * @example
     * const response = await bru.sendRequest({
     *   method: 'POST',
     *   url: bru.interpolate('{{authUrl}}/token'),
     *   data: { clientId: bru.getEnvVar('clientId') }
     * });
     * bru.setVar('token', response.data.access_token);
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
     * The cookies the current request sends, and `jar()` for the cookies of any URL.
     * @type {CookieList}
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
    /**
     * Control the collection runner from a script: skip this request, stop the run, or choose
     * the next request.
     * @type {Runner}
     * @example
     * if (!bru.getEnvVar('token')) {
     *   bru.runner.skipRequest();
     * }
     * @category Runner
     */
    this.runner = {
      skipRequest: () => {
        /** @internal */
        this.skipRequest = true;
      },
      stopExecution: () => {
        /** @internal */
        this.stopExecution = true;
      },
      setNextRequest: (nextRequest) => {
        /** @internal */
        this.nextRequest = nextRequest;
      }
    };

    /**
     * Helpers for minifying JSON and XML.
     * @type {Utils}
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
     * Run another request of the collection and wait for its response.
     *
     * In a gRPC hook it rejects: a gRPC script can't run another request.
     * @type {(requestPathName: string) => Promise<RunRequestResponse>}
     * @param requestPathName - The request's path from the collection's folder, with or without
     *   its file extension, such as `'auth/login'`.
     * @example
     * const login = await bru.runRequest('auth/login');
     * bru.setVar('token', login.data.token);
     * @category Requests
     */
    this.runRequest;
    /**
     * Get the results of the `test()` calls this script has made so far.
     * @type {() => Promise<TestResults>}
     * @example
     * const { summary } = await bru.getTestResults();
     * console.log(`${summary.passed}/${summary.total} passed`);
     * @category Tests & assertions
     */
    this.getTestResults;
    /**
     * Get the results of the request's assertions (its Assert tab).
     *
     * The assertions run after the post-response script, so a tests script is the first to see
     * them.
     * @type {() => Promise<AssertionResults>}
     * @example
     * const { summary } = await bru.getAssertionResults();
     * test('all assertions pass', () => expect(summary.failed).to.equal(0));
     * @category Tests & assertions
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
   * Interpolate the `{{variables}}` in a string, or in every string of an object.
   *
   * Variables resolve as in a request: a runtime variable wins over a request, folder,
   * environment, collection or global one. `{{process.env.NAME}}` reads the process environment.
   * @param {string | object} strOrObj - A string, or an object to interpolate a copy of.
   * @returns {any} The interpolated string or object.
   * @example
   * const url = bru.interpolate('{{baseUrl}}/users/{{userId}}');
   * @category Variables
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

    const interpolatedStr = _interpolate(strToInterpolate, combinedVars, {
      onUnresolved: this.#onUnresolved
    });
    return isObj ? JSON.parse(interpolatedStr) : interpolatedStr;
  };

  #readVariable(scope, key) {
    if (!Object.hasOwn(scope, key)) {
      this.#onUnresolved?.(key);
    }
    return this.interpolate(scope[key]);
  }

  /**
   * Get the path of the collection's folder on disk.
   * @returns {string} The collection's folder.
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
   * @returns {string | undefined} The name, or `undefined` when no environment is selected.
   * @category Environment
   */
  getEnvName() {
    return this.envVariables.__name__;
  }

  /**
   * Get a variable of the process environment (`process.env`), including those from the
   * collection's `.env` file.
   * @param {string} key - The variable's name.
   * @returns {string | undefined} The value, or `undefined` when it is not set.
   * @example
   * const apiKey = bru.getProcessEnv('API_KEY');
   * @category Process environment
   */
  getProcessEnv(key) {
    if (!Object.hasOwn(this.processEnvVars, key)) {
      this.#onUnresolved?.(`process.env.${key}`);
    }
    return this.processEnvVars[key];
  }

  /**
   * Check whether the selected environment has a variable with this name.
   * @param {string} key - The variable's name.
   * @returns {boolean} Whether the variable exists.
   * @category Environment
   */
  hasEnvVar(key) {
    return Object.hasOwn(this.envVariables, key);
  }

  /**
   * Get a variable of the selected environment.
   *
   * `{{variables}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when the variable does not exist.
   * @example
   * const baseUrl = bru.getEnvVar('baseUrl');
   * @category Environment
   */
  getEnvVar(key) {
    return this.#readVariable(this.envVariables, key);
  }

  /**
   * Set a variable of the selected environment.
   *
   * Names may contain only letters, digits, `-`, `_` and `.`; any other name throws.
   * @param {string} key - The variable's name.
   * @param {any} value - The value.
   * @example
   * bru.setEnvVar('token', res.getBody().token);
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
   * Delete a variable of the selected environment.
   * @param {string} key - The variable's name.
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
   * Get every variable of the selected environment, as an object. The values are not interpolated.
   * @returns {Record<string, any>} A copy of the variables.
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
   * Check whether the global environment has a variable with this name.
   * @param {string} key - The variable's name.
   * @returns {boolean} Whether the variable exists.
   * @category Global environment
   */
  hasGlobalEnvVar(key) {
    return Object.hasOwn(this.globalEnvironmentVariables, key);
  }

  /**
   * Get a variable of the global environment.
   *
   * `{{variables}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when the variable does not exist.
   * @category Global environment
   */
  getGlobalEnvVar(key) {
    return this.#readVariable(this.globalEnvironmentVariables, key);
  }

  /**
   * Set a variable of the global environment.
   *
   * Names may contain only letters, digits, `-`, `_` and `.`; any other name throws.
   * @param {string} key - The variable's name.
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
   * Delete a variable of the global environment.
   * @param {string} key - The variable's name.
   * @category Global environment
   */
  deleteGlobalEnvVar(key) {
    if (Object.hasOwn(this.globalEnvironmentVariables, key)) {
      delete this.globalEnvironmentVariables[key];
      this._globalEnvDirty = true;
    }
  }

  /**
   * Get every variable of the global environment, as an object. The values are not interpolated.
   * @returns {Record<string, any>} A copy of the variables.
   * @category Global environment
   */
  getAllGlobalEnvVars() {
    return Object.assign({}, this.globalEnvironmentVariables);
  }

  /**
   * Delete every variable of the global environment.
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
   * Get a value of a stored OAuth 2.0 credential.
   *
   * Keys have the form `$oauth2.<credentialId>.<field>`, such as
   * `$oauth2.credentials.access_token`. `{{variables}}` in the value are interpolated.
   * @param {string} key - The key.
   * @returns {any} The value, or `undefined` when there is no such value.
   * @example
   * const token = bru.getOauth2CredentialVar('$oauth2.credentials.access_token');
   * @category OAuth 2.0
   */
  getOauth2CredentialVar(key) {
    return this.#readVariable(this.oauth2CredentialVariables, key);
  }

  /**
   * Clear a stored OAuth 2.0 credential once the script ends, so the next request fetches a new
   * one.
   *
   * For the rest of the script, `getOauth2CredentialVar` returns `undefined` for its values.
   * @param {string} credentialId - The credential's ID. An empty or non-string ID throws.
   * @category OAuth 2.0
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
   * Check whether the runtime variables has a variable with this name.
   * @param {string} key - The variable's name.
   * @returns {boolean} Whether the variable exists.
   * @category Runtime variables
   */
  hasVar(key) {
    return Object.hasOwn(this.runtimeVariables, key);
  }

  /**
   * Set a variable of the runtime variables.
   *
   * Names may contain only letters, digits, `-`, `_` and `.`; any other name throws.
   * @param {string} key - The variable's name.
   * @param {any} value - The value.
   * @example
   * bru.setVar('userId', res.getBody().id);
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
   * Get a runtime variable.
   *
   * `{{variables}}` in the value are interpolated. Names may contain only letters, digits, `-`, `_` and `.`; any other name throws.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when the variable does not exist.
   * @example
   * const userId = bru.getVar('userId');
   * @category Runtime variables
   */
  getVar(key) {
    assertValidVariableName(key);

    return this.#readVariable(this.runtimeVariables, key);
  }

  /**
   * Delete a variable of the runtime variables.
   * @param {string} key - The variable's name.
   * @category Runtime variables
   */
  deleteVar(key) {
    if (Object.hasOwn(this.runtimeVariables, key)) {
      delete this.runtimeVariables[key];
      this._runtimeVarsDirty = true;
    }
  }

  /**
   * Delete every variable of the runtime variables.
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
   * Get every variable of the runtime variables, as an object. The values are not interpolated.
   * @returns {Record<string, any>} A copy of the variables.
   * @category Runtime variables
   */
  getAllVars() {
    return Object.assign({}, this.runtimeVariables);
  }

  /**
   * Get a variable of the collection.
   *
   * `{{variables}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when the variable does not exist.
   * @category Collection variables
   */
  getCollectionVar(key) {
    return this.#readVariable(this.collectionVariables, key);
  }

  /**
   * Set a variable of the collection.
   *
   * Names may contain only letters, digits, `-`, `_` and `.`; any other name throws.
   * @param {string} key - The variable's name.
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
   * Check whether the collection has a variable with this name.
   * @param {string} key - The variable's name.
   * @returns {boolean} Whether the variable exists.
   * @category Collection variables
   */
  hasCollectionVar(key) {
    return Object.hasOwn(this.collectionVariables, key);
  }

  /**
   * Delete a variable of the collection.
   * @param {string} key - The variable's name.
   * @category Collection variables
   */
  deleteCollectionVar(key) {
    if (Object.hasOwn(this.collectionVariables, key)) {
      delete this.collectionVariables[key];
      this._collVarsDirty = true;
    }
  }

  /**
   * Delete every variable of the collection.
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
   * Get every variable of the collection, as an object. The values are not interpolated.
   * @returns {Record<string, any>} A copy of the variables.
   * @category Collection variables
   */
  getAllCollectionVars() {
    return Object.assign({}, this.collectionVariables);
  }

  /**
   * Get a variable of the request's folder.
   *
   * `{{variables}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when the variable does not exist.
   * @category Folder & request variables
   */
  getFolderVar(key) {
    return this.#readVariable(this.folderVariables, key);
  }

  /**
   * Get a variable of the request.
   *
   * `{{variables}}` in the value are interpolated.
   * @param {string} key - The variable's name.
   * @returns {any} The value, or `undefined` when the variable does not exist.
   * @category Folder & request variables
   */
  getRequestVar(key) {
    return this.#readVariable(this.requestVariables, key);
  }

  /**
   * Run the request with this name next in a collection run, the same as
   * `bru.runner.setNextRequest`.
   * @param {string | null} nextRequest - The request's name, or `null` to end the run.
   * @category Runner
   */
  setNextRequest(nextRequest) {
    /** @internal */
    this.nextRequest = nextRequest;
  }

  /**
   * Wait before going on.
   * @param {number} ms - How long to wait, in milliseconds.
   * @returns {Promise<void>} A promise that resolves after `ms`.
   * @example
   * await bru.sleep(1000);
   * @category Utilities
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the collection's name.
   * @returns {string} The name.
   * @category Collection
   */
  getCollectionName() {
    return this.collectionName;
  }

  /**
   * Check whether the script runs in Safe Mode rather than Developer Mode.
   * @returns {boolean} `true` in Safe Mode.
   * @category Runtime
   */
  isSafeMode() {
    return this.runtime === 'quickjs';
  }
}

module.exports = Bru;
