const { get } = require('@usebruno/query');

class BrunoResponse {
  constructor(res) {
    this.res = res;
    this.status = res ? res.status : null;
    this.statusText = res ? res.statusText : null;
    this.headers = res ? res.headers : null;
    this.body = res ? res.data : null;
    this.responseTime = res ? res.responseTime : null;

    // Make the instance callable
    const callable = (...args) => get(this.body, ...args);
    Object.setPrototypeOf(callable, this.constructor.prototype);
    Object.assign(callable, this);

    return callable;
  }

  getStatus() {
    return this.res ? this.res.status : null;
  }

  getStatusText() {
    return this.res ? this.res.statusText : null;
  }

  getHeader(name) {
    return this.res && this.res.headers ? this.res.headers[name] : null;
  }

  getHeaders() {
    return this.res ? this.res.headers : null;
  }

  getBody() {
    return this.res ? this.res.data : null;
  }

  getResponseTime() {
    return this.res ? this.res.responseTime : null;
  }

  setBody(data) {
    if (!this.res) {
      return;
    }

    this.body = data;
    this.res.data = data;
    this.res.dataBuffer = Buffer.from(data)
  }
}

module.exports = BrunoResponse;
