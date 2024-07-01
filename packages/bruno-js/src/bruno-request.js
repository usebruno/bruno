class BrunoRequest {
  constructor(req) {
    this.req = req;
    this.url = req.url;
    this.method = req.method;
    this.headers = req.headers;
    this.body = req.data;
    this.timeout = req.timeout;
    this.credentials = req.credentials;
  }

  getUrl() {
    return this.req.url;
  }

  setUrl(url) {
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
    } else {
      return 'none';
    }
  }

  setMethod(method) {
    this.req.method = method;
  }

  getHeaders() {
    return this.req.headers;
  }

  setHeaders(headers) {
    this.req.headers = headers;
  }

  getHeader(name) {
    return this.req.headers[name];
  }

  setHeader(name, value) {
    this.req.headers[name] = value;
  }

  getBody() {
    return this.req.data;
  }

  setBody(data) {
    this.req.data = data;
  }

  setMaxRedirects(maxRedirects) {
    this.req.maxRedirects = maxRedirects;
  }

  getTimeout() {
    return this.req.timeout;
  }

  setTimeout(timeout) {
    this.req.timeout = timeout;
  }
}

module.exports = BrunoRequest;
