class BrunoResponse {
  constructor(response) {
    this._response = response;
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

  getData() {
    return this._response.data;
  }
}

module.exports = BrunoResponse;
