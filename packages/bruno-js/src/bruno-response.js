class BrunoResponse {
  constructor(res) {
    this.res = res;
    this.status = res.status;
    this.statusText = res.statusText;
    this.headers = res.headers;
    this.body = res.data;
  }

  getStatus() {
    return this.res.status;
  }

  getHeader(name) {
    return this.res.header[name];
  }

  getHeaders() {
    return this.res.headers;
  }

  getBody() {
    return this.res.data;
  }
}

module.exports = BrunoResponse;
