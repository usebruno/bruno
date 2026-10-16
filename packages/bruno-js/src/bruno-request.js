const { getMediaType } = require('@usebruno/common').utils;
const HeaderList = require('./header-list');
const { parseUrl } = require('./utils/url');

/**
 * The HTTP request: URL, method, headers, body and settings.
 */
class BrunoRequest {
  /**
   * The following properties are available as shorthand:
   * - req.url
   * - req.method
   * - req.headers (raw headers object)
   * - req.headerList (PropertyList API for headers)
   * - req.timeout
   * - req.body
   *
   * Above shorthands are useful for accessing the request properties directly in the scripts
   * It must be noted that the user cannot set these properties directly.
   * They should use the respective setter methods to set these properties.
   */
  constructor(req) {
    /** @internal */
    this.req = req;
    /**
     * The request URL, as when the script started. In a pre-request script its `{{variables}}`
     * are not interpolated yet.
     * @type {string}
     * @category URL
     */
    this.url = req.url;
    /**
     * The HTTP method, as when the script started.
     * @type {string}
     * @category Method
     */
    this.method = req.method;
    /**
     * The request headers, as an object. Names keep the case they were set with.
     * @type {Record<string, any>}
     * @category Headers
     */
    this.headers = req.headers;
    /**
     * The timeout in milliseconds, as when the script started.
     * @type {number}
     * @category Settings
     */
    this.timeout = req.timeout;
    /**
     * The request's name in the collection.
     * @type {string}
     * @category Request info
     */
    this.name = req.name;
    /**
     * The path parameters, such as `id` in `/users/:id`.
     * @type {{ name: string, value: string, type: string }[]}
     * @category URL
     */
    this.pathParams = req.pathParams;
    /**
     * The request's tags.
     * @type {string[]}
     * @category Request info
     */
    this.tags = req.tags || [];
    /**
     * The request headers as a list, with case-insensitive lookups and the request's disabled
     * headers.
     * @type {import('./header-list')}
     * @category Headers
     */
    this.headerList = new HeaderList(this.req);
    /**
     * We automatically parse the JSON body if the content type is JSON
     * This is to make it easier for the user to access the body directly
     *
     * It must be noted that the request data is always a string and is what gets sent over the network
     * If the user wants to access the raw data, they can use getBody({raw: true}) method
     */
    const isJson = this.hasJSONContentType(this.req.headers);
    if (isJson) {
      /**
       * The request body, parsed when it is JSON. Developer Mode sets it only for a JSON body;
       * `getBody()` works for every body.
       * @type {any}
       * @category Body
       */
      this.body = this.__safeParseJSON(req.data);
    }
  }

  /**
   * Get the request URL. In a pre-request script its `{{variables}}` are not interpolated yet.
   * @returns {string} The URL.
   * @category URL
   */
  getUrl() {
    return this.req.url;
  }

  /**
   * Set the request URL. It may contain `{{variables}}`.
   * @param {string} url - The new URL.
   * @example
   * req.setUrl('{{baseUrl}}/v2/users');
   * @category URL
   */
  setUrl(url) {
    this.url = url;
    this.req.url = url;
  }

  /**
   * Get the host of the request URL, with its port when the URL has one.
   * @returns {string} The host, or `''` when the URL has none.
   * @category URL
   */
  getHost() {
    try {
      return parseUrl(this.req.url).host;
    } catch (e) {
      return '';
    }
  }

  /**
   * Get the path of the request URL.
   *
   * A `:name` segment is replaced with the value of that path parameter, when it has one.
   * @returns {string} The path, or `''` when the URL has none.
   * @category URL
   */
  getPath() {
    try {
      let { pathname } = parseUrl(this.req.url);

      // If path params exist, interpolate them into the pathname
      if (this.req.pathParams && Array.isArray(this.req.pathParams)) {
        pathname = pathname
          .split('/')
          .map((segment) => {
            if (segment.startsWith(':')) {
              const paramName = segment.slice(1);
              const pathParam = this.req.pathParams.find((param) => param.name === paramName);
              if (
                pathParam
                && pathParam.enabled !== false
                && pathParam.value !== null
                && pathParam.value !== undefined
                && (typeof pathParam.value !== 'string' || pathParam.value.trim() !== '')
              ) {
                return pathParam.value;
              }
            }
            return segment;
          })
          .join('/');
      }

      return pathname;
    } catch (e) {
      return '';
    }
  }

  /**
   * Get the query string of the request URL, without the `?`.
   * @returns {string} The query string, or `''` when there is none.
   * @category URL
   */
  getQueryString() {
    try {
      return parseUrl(this.req.url).queryString;
    } catch (e) {
      return '';
    }
  }

  /**
   * Get the HTTP method.
   * @returns {string} The method, such as `'GET'`.
   * @category Method
   */
  getMethod() {
    return this.req.method;
  }

  /**
   * Get the kind of auth the request uses.
   * @returns {string} One of `'oauth2'`, `'oauth1'`, `'bearer'`, `'basic'`, `'apikey'`, `'awsv4'`,
   *   `'digest'`, `'wsse'` or `'none'`.
   * @category Auth
   */
  getAuthMode() {
    const headers = this.req.headers;
    if (this.req?.oauth2) {
      return 'oauth2';
    } else if (this.req?.oauth1config) {
      return 'oauth1';
    } else if (headers?.['Authorization']?.startsWith('Bearer')) {
      return 'bearer';
    } else if (headers?.['Authorization']?.startsWith('Basic') || this.req?.auth?.username) {
      return 'basic';
    } else if (this.req?.apiKeyAuthValueForQueryParams) {
      return 'apikey';
    } else if (this.req?.apiKeyHeaderName && this.headers?.[this.req.apiKeyHeaderName] !== undefined) {
      return 'apikey';
    } else if (this.req?.awsv4) {
      return 'awsv4';
    } else if (this.req?.digestConfig) {
      return 'digest';
    } else if (headers?.['X-WSSE'] || this.req?.auth?.username) {
      return 'wsse';
    } else {
      return 'none';
    }
  }

  /**
   * Set the HTTP method.
   * @param {string} method - The new method, such as `'POST'`.
   * @category Method
   */
  setMethod(method) {
    this.method = method;
    this.req.method = method;
  }

  /**
   * Get the request headers, as an object. Names keep the case they were set with.
   * @returns {Record<string, any>} The headers.
   * @category Headers
   */
  getHeaders() {
    return this.req.headers;
  }

  // TODO: make this upsert instead, since setHeaders is the bulk form of setHeader.
  /**
   * Replace all request headers, including those set at the collection and folder level.
   * @param {Record<string, any>} headers - The new headers, as an object.
   * @category Headers
   */
  setHeaders(headers) {
    this.req.headers = headers;
  }

  /**
   * Remove several request headers, as `deleteHeader` does for each.
   * @param {string[]} headers - The header names, matched exactly.
   * @category Headers
   */
  deleteHeaders(headers) {
    headers.forEach((name) => this.deleteHeader(name));
  }

  /**
   * Get the value of a request header.
   *
   * The name must match the case the header was set with; `req.headerList.get()` matches any
   * case.
   * @param {string} name - The header's name.
   * @returns {any} The value, or `undefined` when there is no such header.
   * @category Headers
   */
  getHeader(name) {
    return this.req.headers[name];
  }

  /**
   * Set a request header.
   *
   * The name is used exactly as given, so a header whose name differs only in case is kept
   * alongside; `req.headerList.upsert()` replaces it instead.
   * @param {string} name - The header's name.
   * @param {any} value - The header's value.
   * @example
   * req.setHeader('Authorization', `Bearer ${bru.getEnvVar('token')}`);
   * @category Headers
   */
  setHeader(name, value) {
    this.req.headers[name] = value;
  }

  /**
   * Remove a request header. The name must match the case the header was set with.
   *
   * A default header Bruno adds after the script, such as `User-Agent`, is not added when it has
   * this name.
   * @param {string} name - The header's name.
   * @category Headers
   */
  deleteHeader(name) {
    delete this.req.headers[name];

    /**
      Store header name to be applied in the axios request interceptor.
      Default headers (user-agent, accept, accept-encoding, etc.) are added after
      the pre-request script runs, so we track them here and delete them later.
    */
    if (!this.req.__headersToDelete) {
      this.req.__headersToDelete = [];
    }
    if (!this.req.__headersToDelete.includes(name)) {
      this.req.__headersToDelete.push(name);
    }
  }

  /** @internal */
  hasJSONContentType(headers) {
    const contentType = headers?.['Content-Type'] || headers?.['content-type'] || '';
    return getMediaType(contentType).includes('json');
  }

  /**
   * Get the request body.
   *
   * With a JSON content type the body is parsed; pass `{ raw: true }` for the body as it is sent.
   * @param {{ raw?: boolean }} [options] - `raw: true` returns the body as it is sent.
   * @returns {any} The body.
   * @example
   * const { username } = req.getBody();
   * @category Body
   */
  getBody(options = {}) {
    if (options.raw) {
      return this.req.data;
    }

    const isJson = this.hasJSONContentType(this.req.headers);
    if (isJson) {
      return this.__safeParseJSON(this.req.data);
    }

    return this.req.data;
  }

  /**
   * Replace the request body.
   *
   * With a JSON content type, an object is serialized to JSON. Pass `{ raw: true }` to send `data`
   * exactly as given. A `Buffer` is always sent as-is.
   * @param {any} data - The new body.
   * @param {{ raw?: boolean }} [options] - `raw: true` skips JSON serialization.
   * @example
   * req.setBody({ ...req.getBody(), requestedAt: Date.now() });
   * @category Body
   */
  setBody(data, options = {}) {
    if (options.raw || Buffer.isBuffer(data)) {
      this.req.data = data;
      this.body = data;
      return;
    }

    const isJson = this.hasJSONContentType(this.req.headers);
    if (isJson && this.__isObject(data)) {
      this.body = data;
      this.req.data = this.__safeStringifyJSON(data);
      return;
    }

    this.req.data = data;
    this.body = data;
  }

  /**
   * Set how many redirects the request may follow.
   * @param {number} maxRedirects - The limit. `0` follows none.
   * @category Settings
   */
  setMaxRedirects(maxRedirects) {
    this.req.maxRedirects = maxRedirects;
  }

  /**
   * Get the request timeout.
   * @returns {number} The timeout, in milliseconds.
   * @category Settings
   */
  getTimeout() {
    return this.req.timeout;
  }

  /**
   * Set the request timeout.
   * @param {number} timeout - The timeout, in milliseconds.
   * @category Settings
   */
  setTimeout(timeout) {
    this.timeout = timeout;
    this.req.timeout = timeout;
  }

  /**
   * Run a function when the request fails with an error, such as a network error, instead of
   * getting a response.
   * @param {(error: Error) => any} callback - Called with the error.
   * @example
   * req.onFail((error) => {
   *   console.log('Request failed:', error.message);
   * });
   * @runtime nodevm
   * @category Events
   */
  onFail(callback) {
    if (typeof callback === 'function') {
      this.req.onFailHandler = callback;
    } else if (callback) {
      throw new Error(`${callback} is not a function`);
    }
  }

  /** @internal */
  __safeParseJSON(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }

  /** @internal */
  __safeStringifyJSON(obj) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return obj;
    }
  }

  /** @internal */
  __isObject(obj) {
    return obj !== null && typeof obj === 'object';
  }

  /**
   * Keep the response body as received, rather than parsing it as JSON.
   * @category Settings
   */
  disableParsingResponseJson() {
    this.req.__brunoDisableParsingResponseJson = true;
  }

  /**
   * Get how the request is being run.
   * @returns {string} `'standalone'` when sent on its own, `'runner'` in the collection runner, or
   *   `'cli'` in the Bruno CLI.
   * @category Request info
   */
  getExecutionMode() {
    return this.req.__bruno__executionMode;
  }

  /**
   * Get the request's name in the collection.
   * @returns {string} The name.
   * @category Request info
   */
  getName() {
    return this.req.name;
  }

  /**
   * Get the path parameters, such as `id` in `/users/:id`.
   * @returns {{ name: string, value: string, type: string }[]} One entry per parameter.
   * @category URL
   */
  getPathParams() {
    const params = Array.isArray(this.req.pathParams) ? this.req.pathParams : [];

    return params.map((param) => ({
      name: param.name,
      value: param.value,
      type: param.type
    }));
  }

  /**
   * Get the request's tags.
   * @returns {string[]} The tags.
   * @category Request info
   */
  getTags() {
    return this.req.tags || [];
  }
}

module.exports = BrunoRequest;
