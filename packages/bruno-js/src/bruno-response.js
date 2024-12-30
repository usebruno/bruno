const { get } = require("lodash");

class BrunoResponse {
  constructor(res) {
    this.res = res;
    this.status = res ? res.status : null;
    this.statusText = res ? res.statusText : null;
    this.headers = res ? res.headers : null;
    this.body = res ? res.data : null;
    this.responseTime = res ? res.responseTime : null;
      
    const callable = (...args) => this.call(...args);
    Object.setPrototypeOf(callable, this.constructor.prototype);
    Object.assign(callable, this);

    return callable;
  }

  getStatus() {
    return this.res ? this.res.status : null;
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
  }

  call(expr, ...fns) {
    return get(this.res.data, expr, ...fns);
  };
}

module.exports = BrunoResponse;
