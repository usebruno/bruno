class BrunoResponse {
  constructor(response) {
    this._response = response;
    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.body = response.data;
  }

  getStatus() {
    return this._response.status;
  }

  getHeader(name) {
    return this._response.header[name];
  }

  getHeaders() {
    return this._response.headers;
  }

  getBody() {
    return this._response.data;
  }
}

module.exports = BrunoResponse;
