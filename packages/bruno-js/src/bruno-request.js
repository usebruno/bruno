class BrunoRequest {
  /**
   * The following properties are available as shorthand:
   * - req.url
   * - req.method
   * - req.headers
   * - req.timeout
   * - req.body
   * 
   * Above shorthands are useful for accessing the request properties directly in the scripts
   * It must be noted that the user cannot set these properties directly.
   * They should use the respective setter methods to set these properties.
   */
  constructor(req) {
    this.req = req;
    this.url = req.url;
    this.method = req.method;
    this.headers = req.headers;
    this.timeout = req.timeout;
    this.name = req.name;
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
   * Get the request URL with enhanced properties
   *
   * Returns a String object that can be used as a regular string (backward compatible)
   * but also has additional properties for convenience:
   * - .host: Array of hostname parts (e.g., ["api", "example", "com"]) - matches Postman's pm.request.url.host
   * - .path: Array of path segments (e.g., ["users", "123"])
   *
   * Examples:
   *   const url = req.getUrl(); // "https://api.example.com/users/123"
   *   const host = req.getUrl().host; // ["api", "example", "com"]
   *   const segments = req.getUrl().path; // ["users", "123"]
   *   const firstSegment = req.getUrl().path[0]; // "users"
   *
   * @returns {String} URL string with additional properties
   */
  getUrl() {
    const url = this.req.url || '';

    // Create a String object (not primitive) so we can attach properties
    const urlString = new String(url);

    try {
      // Add .host property (array of hostname parts, matching Postman's behavior)
      const parts = url.split('/');
      const hostString = parts[2] || '';
      // Split hostname by dots to create array (e.g., "api.example.com" -> ["api", "example", "com"])
      urlString.host = hostString ? hostString.split('.') : [];

      // Add .path property (array of path segments)
      const cleanUrl = url.split('?')[0].split('#')[0];
      const pathParts = cleanUrl.split('/').slice(3);
      urlString.path = pathParts.filter(Boolean);

      // Add .getHost() method (returns hostname as string, matching Postman's behavior)
      urlString.getHost = function () {
        return this.host.join('.');
      };
    } catch (e) {
      // If parsing fails, set safe defaults
      urlString.host = [];
      urlString.path = [];
      urlString.getHost = function () {
        return '';
      };
    }

    return urlString;
  }

  setUrl(url) {
    this.url = url;
    this.req.url = url;
  }

  getMethod() {
    return this.req.method;
  }
  getAuthMode() {
    if (this.req?.oauth2) {
      return 'oauth2';
    } else if (this.headers?.['Authorization']?.startsWith('Bearer')) {
      return 'bearer';
    } else if (this.headers?.['Authorization']?.startsWith('Basic') || this.req?.auth?.username) {
      return 'basic';
    } else if (this.req?.awsv4) {
      return 'awsv4';
    } else if (this.req?.digestConfig) {
      return 'digest';
    } else if (this.headers?.['X-WSSE'] || this.req?.auth?.username) {
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
    this.headers = headers;
    this.req.headers = headers;
  }

  getHeader(name) {
    return this.req.headers[name];
  }

  setHeader(name, value) {
    this.headers[name] = value;
    this.req.headers[name] = value;
  }

  hasJSONContentType(headers) {
    const contentType = headers?.['Content-Type'] || headers?.['content-type'] || '';
    return contentType.includes('json');
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

    const isJson = this.hasJSONContentType(this.req.headers);
    if (isJson) {
      return this.__safeParseJSON(this.req.data);
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

    const isJson = this.hasJSONContentType(this.req.headers);
    if (isJson && this.__isObject(data)) {
      this.body = data;
      this.req.data = this.__safeStringifyJSON(data);
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

  __safeParseJSON(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }

  __safeStringifyJSON(obj) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return obj;
    }
  }

  __isObject(obj) {
    return obj !== null && typeof obj === 'object';
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
}

module.exports = BrunoRequest;
