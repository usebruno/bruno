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

  setBody(data) {
    if (!this.res) {
      return;
    }

    const clonedData = _.cloneDeep(data);
    this.res.data = clonedData;
    this.body = clonedData;
  }

  getSize() {
    if (!this.res) return { header: 0, body: 0, total: 0 };

    let bodySize = 0;
    // Prefer raw dataBuffer if available
    if (Buffer.isBuffer(this.res.dataBuffer)) {
      bodySize = this.res.dataBuffer.length;
    } else {
        const raw =
          typeof this.res.data === 'string'
            ? this.res.data
            : JSON.stringify(this.res.data ?? '');
        bodySize = Buffer.byteLength(raw);
    }

    const headerLines = [
      `HTTP/1.1 ${this.res.status} ${this.res.statusText}`,
      ...Object.entries(this.res.headers || {}).flatMap(([key, value]) =>
        Array.isArray(value)
          ? value.map((v) => `${key}: ${v}`)
          : [`${key}: ${value}`]
      ),
      '',
      ''
    ];
    const headerSize = Buffer.byteLength(headerLines.join('\r\n'));

    return { header: headerSize, body: bodySize, total: headerSize + bodySize };
  }
}

module.exports = BrunoResponse;
