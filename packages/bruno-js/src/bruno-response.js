class BrunoResponse {
  constructor(res) {
    this.res = res;
    this.status = res ? res.status : null;
    this.statusText = res ? res.statusText : null;
    this.headers = res ? res.headers : null;
    this.body = res ? res.data : null;
    this.responseTime = res ? res.responseTime : null;
    this.url = res ? res.request?.res?.responseUrl : null;
  }

  getStatus() {
    return this.res ? this.status : null;
  }

  getHeader(name) {
    return this.res && this.headers ? this.headers[name] : null;
  }

  getHeaders() {
    return this.res ? this.headers : null;
  }

  getBody() {
    return this.res ? this.data : null;
  }

  getResponseTime() {
    return this.res ? this.responseTime : null;
  }

  getUrl() {
    return this.res ? this.url : null;
  }

  setBody(data) {
    if (!this.res) {
      return;
    }

    this.body = data;
    this.res.data = data;
  }
}

module.exports = BrunoResponse;
