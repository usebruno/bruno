const HeaderList = require('./header-list');
const { parseUrl } = require('./utils/url');

/**
 * A path parameter of the request, such as `id` in `/users/:id`.
 * @typedef {object} PathParam
 * @property {string} name - The parameter's name, without the leading `:`.
 * @property {string} value - Its value.
 * @property {string} type - Always `'path'`.
 */

/**
 * The shorthand properties (`req.url`, `req.method`, …) are snapshots taken when the script
 * starts; assigning to them changes nothing. Use the setter methods to change the request.
 */
class BrunoRequest {
  constructor(req) {
    /** @internal */
    this.req = req;
    /**
     * The request URL, as it was when the script started.
     * @type {string}
     * @readonly
     * @category URL
     */
    this.url = req.url;
    /**
     * The HTTP method, as it was when the script started.
     * @type {string}
     * @readonly
     * @category Method
     */
    this.method = req.method;
    /**
     * The request headers, as a `{ name: value }` object. Use `req.setHeader()` or
     * `req.headerList` to change them.
     * @type {Record<string, any>}
     * @readonly
     * @category Headers
     */
    this.headers = req.headers;
    /**
     * The request timeout in milliseconds, as it was when the script started.
     * @type {number | undefined}
     * @readonly
     * @category Settings
     */
    this.timeout = req.timeout;
    /**
     * The request's name, as shown in the sidebar.
     * @type {string}
     * @readonly
     * @category Info
     */
    this.name = req.name;
    /**
     * The request's path parameters. `req.getPathParams()` returns a copy.
     * @type {PathParam[] | undefined}
     * @readonly
     * @category URL
     */
    this.pathParams = req.pathParams;
    /**
     * The request's tags.
     * @type {string[]}
     * @readonly
     * @category Info
     */
    this.tags = req.tags || [];
    /**
     * The request headers as a list: read, add, change and remove headers, disabled ones included.
     *
     * Keys match case-insensitively. Changes apply to the request that is sent.
     * @example
     * req.headerList.upsert({ key: 'Authorization', value: `Bearer ${bru.getVar('token')}` });
     * req.headerList.remove('X-Debug');
     * @readonly
     * @category Headers
     */
    this.headerList = new HeaderList(this.req);
    /**
     * The request body, parsed when the content type is JSON. Use `req.setBody()` to change it.
     * @type {any}
     * @category Body
     */
    this.body;
    /**
     * We automatically parse the JSON body if the content type is JSON
     * This is to make it easier for the user to access the body directly
     *
     * It must be noted that the request data is always a string and is what gets sent over the network
     * If the user wants to access the raw data, they can use getBody({raw: true}) method
     */
    const isJson = this.hasJSONContentType(this.req.headers);
    if (isJson) {
      this.body = this.__safeParseJSON(req.data);
    }
  }

  /**
   * Get the request URL.
   * @returns {string} The URL. In a pre-request script its `{{variables}}` are not interpolated yet.
   * @category URL
   */
  getUrl() {
    return this.req.url;
  }

  /**
   * Change the request URL.
   * @param {string} url - The new URL.
   * @example
   * req.setUrl(`${bru.getEnvVar('baseUrl')}/v2/users`);
   * @category URL
   */
  setUrl(url) {
    this.url = url;
    this.req.url = url;
  }

  /**
   * Get the host of the request URL, with the port when it has one.
   * @returns {string} The host, such as `'api.example.com:8080'`, or `''` when the URL is invalid.
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
   * Get the path of the request URL, with the path parameters filled in.
   * @returns {string} The path, such as `'/users/42'`, or `''` when the URL is invalid.
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
   * Get the query string of the request URL.
   * @returns {string} The query string without the leading `?`, or `''` when there is none.
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
   * Get the kind of authentication the request uses.
   * @returns {'oauth2' | 'oauth1' | 'bearer' | 'basic' | 'apikey' | 'awsv4' | 'digest' | 'wsse' | 'none'} The auth mode.
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
   * Change the HTTP method.
   * @param {string} method - The new method, such as `'POST'`.
   * @category Method
   */
  setMethod(method) {
    this.method = method;
    this.req.method = method;
  }

  /**
   * Get the request headers.
   * @returns {Record<string, any>} The headers object, by name. Changing it changes the request.
   * @category Headers
   */
  getHeaders() {
    return this.req.headers;
  }

  /**
   * Replaces the whole header set, dropping headers set at collection/folder level.
   * TODO: make this upsert instead, since setHeaders is the bulk form of setHeader.
   */
  /**
   * Replace all the request headers, including those set at collection and folder level.
   * @param {Record<string, any>} headers - The new headers, by name.
   * @category Headers
   */
  setHeaders(headers) {
    this.req.headers = headers;
  }

  /**
   * Remove several headers, including default headers such as `User-Agent`.
   * @param {string[]} headers - The names of the headers to remove.
   * @category Headers
   */
  deleteHeaders(headers) {
    headers.forEach((name) => this.deleteHeader(name));
  }

  /**
   * Get the value of a request header.
   *
   * The name matches exactly; use `req.headerList.get()` for a case-insensitive lookup.
   * @param {string} name - The header's name.
   * @returns {any} The value, or `undefined` when the header is not set.
   * @category Headers
   */
  getHeader(name) {
    return this.req.headers[name];
  }

  /**
   * Set a request header, replacing a header of the same name.
   * @param {string} name - The header's name.
   * @param {any} value - The header's value.
   * @example
   * req.setHeader('Authorization', `Bearer ${bru.getVar('token')}`);
   * @category Headers
   */
  setHeader(name, value) {
    this.req.headers[name] = value;
  }

  /**
   * Remove a request header, including default headers such as `User-Agent`.
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
    return contentType.includes('json');
  }

  /**
   * Get the request body.
   *
   * A JSON body is returned parsed; pass `{ raw: true }` for the string that is sent.
   * @param {{ raw?: boolean }} [options] - `raw: true` returns the body as it is sent.
   * @returns {any} The body.
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
   * With a JSON content type, an object is serialized for you. Pass `{ raw: true }` to send
   * `data` exactly as given.
   * @param {any} data - The new body.
   * @param {{ raw?: boolean }} [options] - `raw: true` skips JSON serialization.
   * @example
   * req.setBody({ ...req.getBody(), requestedAt: Date.now() });
   * @category Body
   */
  setBody(data, options = {}) {
    if (options.raw) {
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
   * @param {number} maxRedirects - The limit. `0` disables following redirects.
   * @category Settings
   */
  setMaxRedirects(maxRedirects) {
    this.req.maxRedirects = maxRedirects;
  }

  /**
   * Get the request timeout.
   * @returns {number | undefined} The timeout in milliseconds.
   * @category Settings
   */
  getTimeout() {
    return this.req.timeout;
  }

  /**
   * Set the request timeout.
   * @param {number} timeout - The timeout in milliseconds.
   * @category Settings
   */
  setTimeout(timeout) {
    this.timeout = timeout;
    this.req.timeout = timeout;
  }

  /**
   * Handle the request failing to get a response, such as a connection error or a timeout.
   *
   * Variables the handler sets are kept, as they are for a script.
   * @param {(error: any) => void | Promise<void>} callback - Called with the error.
   * @example
   * req.onFail((error) => {
   *   console.error('request failed', error.message);
   * });
   * @context pre-request
   * @runtime nodevm
   * @category Errors
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
   * Keep the response body as a string instead of parsing it as JSON.
   * @context pre-request
   * @category Body
   */
  disableParsingResponseJson() {
    this.req.__brunoDisableParsingResponseJson = true;
  }

  /**
   * Get how the request is being run.
   * @returns {'standalone' | 'runner' | 'cli'} `'standalone'` when sent on its own from the app,
   *   `'runner'` in a collection run, `'cli'` from the Bruno CLI.
   * @category Info
   */
  getExecutionMode() {
    return this.req.__bruno__executionMode;
  }

  /**
   * Get the request's name, as shown in the sidebar.
   * @returns {string} The name.
   * @category Info
   */
  getName() {
    return this.req.name;
  }

  /**
   * Get the request's path parameters.
   * @returns {PathParam[]} A copy of the parameters, in URL order.
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
   * @category Info
   */
  getTags() {
    return this.req.tags || [];
  }
}

module.exports = BrunoRequest;
