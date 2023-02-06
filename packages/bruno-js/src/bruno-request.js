class BrunoRequest {
  constructor(request) {
    this._request = request;
  }

  getUrl() {
    return this._request.url;
  }

  setUrl(url) {
    this._request.url = url;
  }

  getMethod() {
    return this._request.method;
  }

  setMethod(method) {
    this._request.method = method;
  }

  getHeaders() {
    return this._request.headers;
  }

  setHeaders(headers) {
    this._request.headers = headers;
  }

  getHeader(name) {
    return this._request.headers[name];
  }

  setHeader(name, value) {
    this._request.headers[name] = value;
  }

  getBody() {
    return this._request.data;
  }

  setBody(data) {
    this._request.data = data;
  }
}

module.exports = BrunoRequest;