import * as monaco from 'monaco-editor';

/**
 * Registers the Bruno scripting API type definitions with Monaco's
 * JavaScript language service. Enables autocomplete and hover docs
 * for bru, req, and res objects.
 *
 * Type definitions are derived from the source implementations in
 * packages/bruno-js/src/ (bru.js, bruno-request.js, bruno-response.js).
 *
 * Idempotent — addExtraLib with the same filename replaces the previous
 * registration, and setDiagnosticsOptions/setCompilerOptions are safe to
 * call multiple times.
 *
 * Must be called after Monaco is loaded (not at module top level).
 */
let typesRegistered = false;

export const registerBrunoApiTypes = () => {
  if (typesRegistered) return;
  typesRegistered = true;

  const typeDefs = `
/**
 * Bruno Request object — available in pre-request and post-response scripts.
 *
 * Shorthand properties (url, method, headers, body, timeout) are read-only.
 * Use the setter methods to modify request properties.
 *
 * @see https://docs.usebruno.com/scripting/request
 */
declare const req: BrunoRequest;

/**
 * Bruno Response object — available in post-response scripts and tests.
 *
 * The response object is also callable as a function for query operations:
 * \`res('data.users[0].name')\`
 *
 * @see https://docs.usebruno.com/scripting/response
 */
declare const res: BrunoResponse;

/**
 * Bruno Runtime API — available in all scripts (pre-request, post-response, tests).
 *
 * Provides access to variables, environment, cookies, and utility functions.
 *
 * @see https://docs.usebruno.com/scripting/bru
 */
declare const bru: BrunoRuntime;

/**
 * Chai-compatible expect assertion function.
 * @example
 * expect(res.getStatus()).to.equal(200);
 * expect(res.getBody().name).to.be.a('string');
 */
declare const expect: any;

/**
 * Define a test case.
 * @param name - The name of the test
 * @param fn - The test function (can be async)
 * @example
 * test('should return 200', () => {
 *   expect(res.getStatus()).to.equal(200);
 * });
 */
declare function test(name: string, fn: () => void | Promise<void>): void;

interface BrunoRequest {
  /** The request URL (read-only shorthand — use setUrl() to modify) */
  readonly url: string;
  /** The HTTP method (read-only shorthand — use setMethod() to modify) */
  readonly method: string;
  /** The request headers (read-only shorthand — use setHeader()/setHeaders() to modify) */
  readonly headers: Record<string, string>;
  /**
   * The request body. Automatically parsed to an object if Content-Type is JSON.
   * (read-only shorthand — use setBody() to modify)
   */
  readonly body: any;
  /** The request timeout in ms (read-only shorthand — use setTimeout() to modify) */
  readonly timeout: number;
  /** The request name */
  readonly name: string;
  /** Path parameters as key-value pairs */
  readonly pathParams: Record<string, string>;
  /** Tags associated with this request */
  readonly tags: string[];

  /** Get the full request URL */
  getUrl(): string;

  /**
   * Set the request URL.
   * @param url - The new URL
   * @example req.setUrl('https://api.example.com/users');
   */
  setUrl(url: string): void;

  /**
   * Get the hostname from the URL.
   * @example req.getHost() // 'api.example.com'
   */
  getHost(): string;

  /**
   * Get the path from the URL. Path parameters are interpolated.
   * @example req.getPath() // '/api/users/123'
   */
  getPath(): string;

  /**
   * Get the query string from the URL (without the leading '?').
   * @example req.getQueryString() // 'page=1&limit=10'
   */
  getQueryString(): string;

  /** Get the HTTP method (GET, POST, PUT, etc.) */
  getMethod(): string;

  /**
   * Set the HTTP method.
   * @param method - The HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)
   */
  setMethod(method: string): void;

  /**
   * Get the authentication mode used for this request.
   * @returns One of: 'oauth2', 'oauth1', 'bearer', 'basic', 'awsv4', 'digest', 'wsse', 'none'
   */
  getAuthMode(): 'oauth2' | 'oauth1' | 'bearer' | 'basic' | 'awsv4' | 'digest' | 'wsse' | 'none';

  /**
   * Get a specific header value by name.
   * @param name - The header name (case-sensitive)
   */
  getHeader(name: string): string | undefined;

  /** Get all request headers as a key-value object */
  getHeaders(): Record<string, string>;

  /**
   * Set a single request header.
   * @param name - The header name
   * @param value - The header value
   * @example req.setHeader('Authorization', 'Bearer token123');
   */
  setHeader(name: string, value: string): void;

  /**
   * Replace all request headers.
   * @param headers - Object containing all headers
   */
  setHeaders(headers: Record<string, string>): void;

  /**
   * Delete a single request header.
   * Also prevents default headers (like User-Agent) from being re-added.
   * @param name - The header name to delete
   */
  deleteHeader(name: string): void;

  /**
   * Delete multiple request headers.
   * @param names - Array of header names to delete
   * @example req.deleteHeaders(['X-Custom-Header', 'Authorization']);
   */
  deleteHeaders(names: string[]): void;

  /**
   * Get the request body.
   * JSON bodies are automatically parsed to objects.
   * Pass \`{ raw: true }\` to get the raw string body.
   * @example
   * req.getBody()             // { name: 'John' } (parsed)
   * req.getBody({ raw: true }) // '{"name":"John"}' (raw string)
   */
  getBody(options?: { raw?: boolean }): any;

  /**
   * Set the request body.
   * For JSON content types, objects are automatically stringified.
   * Pass \`{ raw: true }\` to set the body as-is without processing.
   * @example
   * req.setBody({ name: 'John' });
   * req.setBody('raw string data', { raw: true });
   */
  setBody(data: any, options?: { raw?: boolean }): void;

  /**
   * Set the maximum number of redirects to follow.
   * @param maxRedirects - Maximum redirects (0 to disable)
   */
  setMaxRedirects(maxRedirects: number): void;

  /** Get the request timeout in milliseconds */
  getTimeout(): number;

  /**
   * Set the request timeout.
   * @param timeout - Timeout in milliseconds
   */
  setTimeout(timeout: number): void;

  /**
   * Get the execution mode of the request.
   * @returns The execution mode string (e.g., 'standalone' or 'runner')
   */
  getExecutionMode(): string;

  /** Get the request name as defined in the collection */
  getName(): string;

  /**
   * Get the path parameters for this request.
   * @returns Array of path parameter objects with name, value, and type
   */
  getPathParams(): Array<{ name: string; value: string; type: string }>;

  /**
   * Get the tags associated with this request.
   * @returns Array of tag strings
   */
  getTags(): string[];

  /**
   * Disable automatic JSON parsing of the response body.
   * Useful when you need the raw response string.
   */
  disableParsingResponseJson(): void;

  /**
   * Register an error handler that runs if the request fails.
   * @param callback - Function called with the error object
   * @example
   * req.onFail((err) => {
   *   console.log('Request failed:', err.message);
   * });
   */
  onFail(callback: (err: Error) => void): void;
}

interface BrunoResponse {
  /** The HTTP status code (e.g., 200, 404) */
  readonly status: number;
  /** The HTTP status text (e.g., 'OK', 'Not Found') */
  readonly statusText: string;
  /** The response headers */
  readonly headers: Record<string, string>;
  /** The response body (automatically parsed if JSON) */
  readonly body: any;
  /** The response time in milliseconds */
  readonly responseTime: number;
  /** The final URL after redirects */
  readonly url: string;

  /** Get the HTTP status code */
  getStatus(): number;

  /** Get the HTTP status text */
  getStatusText(): string;

  /**
   * Get a specific response header value.
   * @param name - The header name
   */
  getHeader(name: string): string | undefined;

  /** Get all response headers */
  getHeaders(): Record<string, string>;

  /** Get the response body */
  getBody(): any;

  /**
   * Replace the response body. Also updates the underlying data buffer.
   * @param data - The new body data
   */
  setBody(data: any): void;

  /** Get the response time in milliseconds */
  getResponseTime(): number;

  /**
   * Get the response size breakdown in bytes.
   * @returns Object with header, body, and total sizes
   * @example
   * const size = res.getSize();
   * console.log(size.body);  // body size in bytes
   * console.log(size.total); // total size in bytes
   */
  getSize(): { header: number; body: number; total: number };

  /** Get the final URL after redirects */
  getUrl(): string;

  /**
   * Get the raw response data buffer.
   * @returns The underlying Buffer object
   */
  getDataBuffer(): any;
}

interface BrunoCookieJar {
  getCookie(url: string, name: string, callback?: Function): any;
  getCookies(url: string, callback?: Function): any[];
  setCookie(rawCookie: string, url: string, callback?: Function): void;
  setCookies(cookies: string[]): void;
  clear(): void;
  deleteCookies(url: string): void;
  deleteCookie(url: string, name: string): void;
  hasCookie(url: string, name: string): boolean;
}

interface BrunoCookies {
  /** Get a cookie value by name */
  get(name: string): string | undefined;
  /** Check if a cookie exists */
  has(name: string): boolean;
  /** Get the first cookie */
  one(): any;
  /** Get all cookies as an array */
  all(): any[];
  /** Get the number of cookies */
  count(): number;
  /** Get a cookie by index */
  idx(index: number): any;
  /** Find the index of a cookie by name */
  indexOf(name: string): number;
  /** Find a cookie matching a predicate */
  find(predicate: (cookie: any) => boolean): any;
  /** Filter cookies matching a predicate */
  filter(predicate: (cookie: any) => boolean): any[];
  /** Iterate over each cookie */
  each(callback: (cookie: any) => void): void;
  /** Map cookies to a new array */
  map<T>(callback: (cookie: any) => T): T[];
  /** Reduce cookies to a single value */
  reduce<T>(callback: (acc: T, cookie: any) => T, initial: T): T;
  /** Convert all cookies to a key-value object */
  toObject(): Record<string, string>;
  /** Convert all cookies to a string */
  toString(): string;
  /** Add a new cookie */
  add(name: string, value: string): void;
  /** Add or update a cookie */
  upsert(name: string, value: string): void;
  /** Remove a cookie by name */
  remove(name: string): void;
  /** Delete a cookie by name */
  delete(name: string): void;
  /** Clear all cookies */
  clear(): void;
  /** Get the underlying cookie jar for advanced operations */
  jar(): BrunoCookieJar;
}

interface BrunoRunner {
  /**
   * Set the next request to execute in the runner.
   * @param requestName - The name of the next request
   */
  setNextRequest(requestName: string): void;
  /** Skip the current request in the runner */
  skipRequest(): void;
  /** Stop the runner execution entirely */
  stopExecution(): void;
}

interface BrunoUtils {
  /**
   * Minify a JSON string or object by removing whitespace.
   * @param json - A JSON string or object to minify
   * @returns The minified JSON string
   * @throws Error if the input is not valid JSON
   * @example bru.utils.minifyJson('{ "key": "value" }') // '{"key":"value"}'
   */
  minifyJson(json: string | object): string;

  /**
   * Minify an XML string by removing whitespace and indentation.
   * @param xml - The XML string to minify
   * @returns The minified XML string
   * @throws Error if the input is not a valid string
   */
  minifyXml(xml: string): string;
}

interface BrunoRuntime {
  /**
   * Get the current working directory of the collection.
   * @returns The absolute path to the collection folder
   */
  cwd(): string;

  /**
   * Get the collection name.
   * @returns The name of the current collection
   */
  getCollectionName(): string;

  /**
   * Check if running in safe mode (QuickJS sandbox).
   * @returns true if safe mode (QuickJS), false if Node VM
   */
  isSafeMode(): boolean;

  // ─── Environment Variables ─────────────────────────────────

  /**
   * Get the active environment name.
   * @returns The name of the currently selected environment
   * @example
   * const envName = bru.getEnvName(); // 'Production'
   */
  getEnvName(): string;

  /**
   * Get an environment variable value. Values containing \`{{references}}\` are interpolated.
   * @param key - The variable name
   * @example bru.getEnvVar('baseUrl') // 'https://api.example.com'
   */
  getEnvVar(key: string): any;

  /**
   * Set an environment variable. The value is available for the duration of the request lifecycle.
   * @param key - The variable name (alphanumeric, hyphens, underscores, dots only)
   * @param value - The variable value
   * @example bru.setEnvVar('token', 'abc123');
   */
  setEnvVar(key: string, value: any): void;
  /**
   * Set an environment variable with options.
   * @param key - The variable name
   * @param value - The variable value (must be a string when persist is true)
   * @param options - Options object
   * @param options.persist - If true, the value is persisted to the environment file on disk
   * @example bru.setEnvVar('token', 'abc123', { persist: true });
   */
  setEnvVar(key: string, value: any, options: { persist?: boolean }): void;

  /**
   * Delete an environment variable.
   * @param key - The variable name to delete
   */
  deleteEnvVar(key: string): void;

  /**
   * Get all environment variables as a key-value object.
   * @returns Object containing all environment variables (excludes internal __name__)
   */
  getAllEnvVars(): Record<string, any>;

  /** Delete all environment variables (the environment name is preserved) */
  deleteAllEnvVars(): void;

  /**
   * Check if an environment variable exists.
   * @param key - The variable name
   */
  hasEnvVar(key: string): boolean;

  // ─── Global Environment Variables ──────────────────────────

  /**
   * Get a global environment variable value. Values are interpolated.
   * @param key - The variable name
   */
  getGlobalEnvVar(key: string): any;

  /**
   * Set a global environment variable.
   * @param key - The variable name
   * @param value - The variable value
   */
  setGlobalEnvVar(key: string, value: any): void;

  /**
   * Get all global environment variables as a key-value object.
   */
  getAllGlobalEnvVars(): Record<string, any>;

  // ─── Collection / Folder / Request Variables ───────────────

  /**
   * Get a collection-level variable value. Values are interpolated.
   * @param key - The variable name
   */
  getCollectionVar(key: string): any;

  /**
   * Check if a collection-level variable exists.
   * @param key - The variable name
   */
  hasCollectionVar(key: string): boolean;

  /**
   * Get a folder-level variable value. Values are interpolated.
   * @param key - The variable name
   */
  getFolderVar(key: string): any;

  /**
   * Get a request-level variable value. Values are interpolated.
   * @param key - The variable name
   */
  getRequestVar(key: string): any;

  // ─── Runtime Variables ─────────────────────────────────────

  /**
   * Check if a runtime variable exists.
   * @param key - The variable name
   */
  hasVar(key: string): boolean;

  /**
   * Get a runtime variable value. Values are interpolated.
   * @param key - The variable name (alphanumeric, hyphens, underscores, dots only)
   */
  getVar(key: string): any;

  /**
   * Set a runtime variable. Available for the duration of the request lifecycle.
   * @param key - The variable name (alphanumeric, hyphens, underscores, dots only)
   * @param value - The variable value
   * @example bru.setVar('userId', response.body.id);
   */
  setVar(key: string, value: any): void;

  /**
   * Delete a runtime variable.
   * @param key - The variable name
   */
  deleteVar(key: string): void;

  /** Delete all runtime variables */
  deleteAllVars(): void;

  /**
   * Get all runtime variables as a key-value object.
   */
  getAllVars(): Record<string, any>;

  // ─── Process Environment ───────────────────────────────────

  /**
   * Get a process environment variable (from system or .env file).
   * @param key - The environment variable name
   * @example bru.getProcessEnv('API_KEY')
   */
  getProcessEnv(key: string): string | undefined;

  // ─── OAuth2 ────────────────────────────────────────────────

  /**
   * Get an OAuth2 credential variable (e.g., access token).
   * @param key - The credential variable key (e.g., '$oauth2.credentialId.access_token')
   */
  getOauth2CredentialVar(key: string): any;

  /**
   * Reset an OAuth2 credential, clearing its cached token.
   * @param credentialId - The credential ID to reset
   */
  resetOauth2Credential(credentialId: string): void;

  // ─── Request Control ───────────────────────────────────────

  /**
   * Set the next request to execute (in runner mode).
   * @param nextRequest - The name of the next request to execute
   */
  setNextRequest(nextRequest: string): void;

  /** Runner control methods for managing collection runner execution */
  runner: BrunoRunner;

  // ─── HTTP Requests from Scripts ────────────────────────────

  /**
   * Send an arbitrary HTTP request from within a script.
   * Uses the collection's proxy and TLS settings if configured.
   * @param requestConfig - Axios-compatible request config object
   * @returns Promise resolving to the response
   * @example
   * const response = await bru.sendRequest({
   *   method: 'GET',
   *   url: 'https://api.example.com/users',
   *   headers: { 'Authorization': 'Bearer token' }
   * });
   */
  sendRequest(requestConfig: any): Promise<any>;
  /**
   * Send an HTTP request with a callback.
   * @param requestConfig - Axios-compatible request config object
   * @param callback - Callback receiving (error, response)
   * @example
   * bru.sendRequest({ method: 'GET', url: '/api/users' }, (err, res) => {
   *   if (err) console.log(err);
   *   else console.log(res.status);
   * });
   */
  sendRequest(requestConfig: any, callback: (err: any, res: any) => void): Promise<any>;

  // ─── Test Results ──────────────────────────────────────────

  /** Get assertion results from the current run */
  getAssertionResults(): any[];
  /** Get test results from the current run */
  getTestResults(): any[];

  // ─── Utilities ─────────────────────────────────────────────

  /**
   * Sleep for the specified duration.
   * @param ms - Duration in milliseconds
   * @example await bru.sleep(1000); // wait 1 second
   */
  sleep(ms: number): Promise<void>;

  /**
   * Interpolate Bruno variables in a string or object.
   * Replaces \`{{variableName}}\` with resolved values from all variable scopes.
   * @param str - The string or object to interpolate
   * @returns The interpolated string or object
   * @example bru.interpolate('Hello {{name}}') // 'Hello John'
   */
  interpolate(str: string): string;
  /**
   * Interpolate Bruno variables in an object (deep interpolation).
   * @param obj - The object to interpolate
   * @returns A new object with all string values interpolated
   */
  interpolate(obj: object): object;

  /** Cookie management for the current request URL */
  cookies: BrunoCookies;

  /** Utility functions for data transformation */
  utils: BrunoUtils;
}
`;

  monaco.languages.typescript.javascriptDefaults.addExtraLib(typeDefs, 'bruno-api.d.ts');

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false
  });
};
