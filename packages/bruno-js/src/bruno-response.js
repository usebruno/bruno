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

  getSize() {
    if (!this.res) {
      return { header: 0, body: 0, total: 0 };
    }

    // Calculate body size using Buffer.byteLength
    const bodyStr = typeof this.res.data === 'string' 
      ? this.res.data 
      : JSON.stringify(this.res.data || '');
    const bodySize = Buffer.byteLength(bodyStr);

    // Calculate headers size by summing each header key and value length
    const headers = this.res.headers || {};
    const headerSize = Object.keys(headers).reduce(
      (total, key) => total + Buffer.byteLength(key) + Buffer.byteLength(String(headers[key])),
      0
    );

    return {
      header: headerSize,
      body: bodySize,
      total: headerSize + bodySize
    };
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
