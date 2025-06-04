const { get } = require('@usebruno/query');
const _ = require('lodash');

class BrunoResponse {
  constructor(res) {
    this.res = res;
    this.status = res ? res.status : null;
    this.statusText = res ? res.statusText : null;
    this.headers = res ? res.headers : null;
    this.body = res ? res.data : null;
    this.responseTime = res ? res.responseTime : null;
    this.url = res ? res.request?.res?.responseUrl : null;

    // Make the instance callable
    const callable = (...args) => get(this.body, ...args);
    Object.setPrototypeOf(callable, this.constructor.prototype);
    Object.assign(callable, this);

    return callable;
  }

  getStatus() {
    return this.res ? this.status : null;
  }

  getStatusText() {
    return this.res ? this.res.statusText : null;
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

    const clonedData = _.cloneDeep(data);
    this.res.data = clonedData;
    this.body = clonedData;
  }
}

module.exports = BrunoResponse;
