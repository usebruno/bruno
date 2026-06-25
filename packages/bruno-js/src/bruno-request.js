const HeaderList = require('./header-list');
const { hasJSONContentType, safeParseJSON, safeStringifyJSON, isObject } = require('./utils');

class HttpRequest {
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
    this.req = req;
    this.isGrpc = false;
    this.url = req.url;
    this.method = req.method;
    this.headers = req.headers;
    this.timeout = req.timeout;
    this.name = req.name;
    this.pathParams = req.pathParams;
    this.tags = req.tags || [];
    this.headerList = new HeaderList(this.req);
    /**
     * We automatically parse the JSON body if the content type is JSON
     * This is to make it easier for the user to access the body directly
     *
     * It must be noted that the request data is always a string and is what gets sent over the network
     * If the user wants to access the raw data, they can use getBody({raw: true}) method
     */
    const isJson = hasJSONContentType(this.req.headers);
    if (isJson) {
      this.body = safeParseJSON(req.data);
    }
  }

  getUrl() {
    return this.req.url;
  }

  setUrl(url) {
    this.url = url;
    this.req.url = url;
  }

  getHost() {
    try {
      const url = new URL(this.req.url);
      return url.host;
    } catch (e) {
      return '';
    }
  }

  getPath() {
    try {
      const url = new URL(this.req.url);
      let pathname = url.pathname;

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

  getQueryString() {
    try {
      const url = new URL(this.req.url);
      // Return query string without the leading '?'
      return url.search ? url.search.substring(1) : '';
    } catch (e) {
      return '';
    }
  }

  getMethod() {
    return this.req.method;
  }

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

  setMethod(method) {
    this.method = method;
    this.req.method = method;
  }

  getHeaders() {
    return this.req.headers;
  }

  setHeaders(headers) {
    this.req.headers = headers;
  }

  deleteHeaders(headers) {
    headers.forEach((name) => this.deleteHeader(name));
  }

  getHeader(name) {
    return this.req.headers[name];
  }

  setHeader(name, value) {
    this.req.headers[name] = value;
  }

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

  /**
   * Get the body of the request
   *
   * We automatically parse and return the JSON body if the content type is JSON
   * If the user wants the raw body, they can pass the raw option as true
   */
  getBody(options = {}) {
    if (options.raw) {
      return this.req.data;
    }

    const isJson = hasJSONContentType(this.req.headers);
    if (isJson) {
      return safeParseJSON(this.req.data);
    }

    return this.req.data;
  }

  /**
   * If the content type is JSON and if the data is an object
   *  - We set the body property as the object itself
   *  - We set the request data as the stringified JSON as it is what gets sent over the network
   * Otherwise
   *  - We set the request data as the data itself
   *  - We set the body property as the data itself
   *
   * If the user wants to override this behavior, they can pass the raw option as true
   */
  setBody(data, options = {}) {
    if (options.raw) {
      this.req.data = data;
      this.body = data;
      return;
    }

    const isJson = hasJSONContentType(this.req.headers);
    if (isJson && isObject(data)) {
      this.body = data;
      this.req.data = safeStringifyJSON(data);
      return;
    }

    this.req.data = data;
    this.body = data;
  }

  setMaxRedirects(maxRedirects) {
    this.req.maxRedirects = maxRedirects;
  }

  getTimeout() {
    return this.req.timeout;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
    this.req.timeout = timeout;
  }

  onFail(callback) {
    if (typeof callback === 'function') {
      this.req.onFailHandler = callback;
    } else if (callback) {
      throw new Error(`${callback} is not a function`);
    }
  }

  disableParsingResponseJson() {
    this.req.__brunoDisableParsingResponseJson = true;
  }

  getExecutionMode() {
    return this.req.__bruno__executionMode;
  }

  getName() {
    return this.req.name;
  }

  getPathParams() {
    const params = Array.isArray(this.req.pathParams) ? this.req.pathParams : [];

    return params.map((param) => ({
      name: param.name,
      value: param.value,
      type: param.type
    }));
  }

  /**
   * Get the tags associated with this request
   * @returns {Array<string>} Array of tag strings
   */
  getTags() {
    return this.req.tags || [];
  }
}

class GrpcRequest {
  constructor(req) {
    this.req = req;
    this.isGrpc = true;
    this.url = req.url;
    this.method = req.method;
  }

  get messages() {
    return this.getMessages();
  }

  get metadata() {
    return this.req.headers || {};
  }

  getMetadata(key) {
    if (key === undefined) {
      return this.req.headers || {};
    }
    return this.req.headers?.[key];
  }

  setMetadata(key, value) {
    if (!this.req.headers) {
      this.req.headers = {};
    }
    this.req.headers[key] = value;
  }

  hasMetadata(key) {
    return Boolean(this.req.headers && Object.prototype.hasOwnProperty.call(this.req.headers, key));
  }

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
    } else if (this.req?.apiKeyHeaderName && headers?.[this.req.apiKeyHeaderName] !== undefined) {
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

  getUrl() {
    return this.req.url;
  }

  getMessages() {
    const messages = this.req?.body?.grpc;
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages.map((m) => safeParseJSON(m?.content));
  }

  getMessage(index = 0) {
    const message = this.req?.body?.grpc?.[index];
    if (!message) {
      return null;
    }
    return safeParseJSON(message.content);
  }

  setMessage(index, data) {
    const content = isObject(data) ? safeStringifyJSON(data) : data;
    if (!this.req.body || this.req.body.mode !== 'grpc' || !Array.isArray(this.req.body.grpc)) {
      this.req.body = { mode: 'grpc', grpc: [] };
    }
    const messages = this.req.body.grpc;
    if (messages[index]) {
      messages[index] = { ...messages[index], content };
    } else {
      messages[index] = { name: '', content };
    }
  }

  addMessage(message) {
    const content = isObject(message) ? safeStringifyJSON(message) : message;
    if (!this.req.body || this.req.body.mode !== 'grpc' || !Array.isArray(this.req.body.grpc)) {
      this.req.body = { mode: 'grpc', grpc: [] };
    }
    this.req.body.grpc.push({ name: '', content });
  }

  addMessages(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('addMessages expects an array of messages');
    }
    messages.forEach((message) => this.addMessage(message));
  }

  clearMessages() {
    if (!this.req.body || this.req.body.mode !== 'grpc' || !Array.isArray(this.req.body.grpc)) {
      this.req.body = { mode: 'grpc', grpc: [] };
    } else {
      this.req.body.grpc = [];
    }
  }

  getTimeout() {
    return this.req.timeout;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
    this.req.timeout = timeout;
  }

  getName() {
    return this.req.name;
  }

  getTags() {
    return this.req.tags || [];
  }

  getExecutionMode() {
    return this.req.__bruno__executionMode;
  }

  onFail(callback) {
    if (typeof callback === 'function') {
      this.req.onFailHandler = callback;
    } else if (callback) {
      throw new Error(`${callback} is not a function`);
    }
  }
}

function createBrunoRequest(req) {
  switch (req.protocol) {
    case 'grpc':
      return new GrpcRequest(req);

    case 'http':
    default:
      return new HttpRequest(req);
  }
}

module.exports = {
  HttpRequest,
  GrpcRequest,
  createBrunoRequest
};
