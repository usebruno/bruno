const { get } = require('@usebruno/query');
const _ = require('lodash');
const HeaderList = require('./header-list');

/**
 * The HTTP response: status, headers, body and timing.
 */
class BrunoResponse {
  constructor(res) {
    /** @internal */
    this.res = res;
    /**
     * The HTTP status code.
     * @type {number | null}
     * @readonly
     * @category Status
     */
    this.status = res ? res.status : null;
    /**
     * The HTTP status text, such as `'OK'`.
     * @type {string | null}
     * @readonly
     * @category Status
     */
    this.statusText = res ? res.statusText : null;
    /**
     * The response headers, as an object keyed by lowercase name.
     * @type {Record<string, any> | null}
     * @readonly
     * @category Headers
     */
    this.headers = res ? res.headers : null;
    /**
     * The response body. A JSON body is parsed.
     * @type {any}
     * @readonly
     * @category Body
     */
    this.body = res ? res.data : null;
    /**
     * How long the response took, in milliseconds.
     * @type {number | null}
     * @readonly
     * @category Timing & size
     */
    this.responseTime = res ? res.responseTime : null;
    /**
     * The URL the response came from.
     * @type {string | null}
     * @readonly
     * @category URL
     */
    this.url = res?.request ? res.request.protocol + '//' + res.request.host + res.request.path : null;

    // HeaderList in static read-only mode — write methods throw
    /**
     * The response headers as a list, with case-insensitive lookups.
     * @type {import('./header-list').ReadOnlyHeaderList}
     * @example
     * const contentType = res.headerList.get('content-type');
     * @readonly
     * @category Headers
     */
    this.headerList = new HeaderList(res, { writable: false });

    // Make the instance callable
    const callable = (...args) => get(this.body, ...args);
    Object.setPrototypeOf(callable, this.constructor.prototype);
    Object.assign(callable, this);

    return callable;
  }

  /**
   * Get the HTTP status code.
   * @returns {number | null} The status code.
   * @example
   * expect(res.getStatus()).to.equal(200);
   * @category Status
   */
  getStatus() {
    return this.res ? this.res.status : null;
  }

  /**
   * Get the HTTP status text, such as `'OK'`.
   * @returns {string | null} The status text.
   * @category Status
   */
  getStatusText() {
    return this.res ? this.res.statusText : null;
  }

  /**
   * Get the value of a response header. The name is case-insensitive.
   * @param {string} name - The header's name.
   * @returns {any} The value, or `undefined` when there is no such header.
   * @example
   * const type = res.getHeader('content-type');
   * @category Headers
   */
  getHeader(name) {
    if (typeof name !== 'string' || !this.res?.headers) {
      return null;
    }
    return this.res.headers[name.toLowerCase()];
  }

  /**
   * Get the response headers, as an object keyed by lowercase name.
   * @returns {Record<string, any> | null} The headers.
   * @category Headers
   */
  getHeaders() {
    return this.res ? this.res.headers : null;
  }

  /**
   * Get the response body. A JSON body is parsed.
   * @returns {any} The body.
   * @example
   * bru.setEnvVar('token', res.getBody().token);
   * @category Body
   */
  getBody() {
    return this.res ? this.res.data : null;
  }

  /**
   * Get how long the response took, in milliseconds.
   * @returns {number | null} The response time.
   * @category Timing & size
   */
  getResponseTime() {
    return this.res ? this.res.responseTime : null;
  }

  /**
   * Get the URL the response came from.
   * @returns {string | null} The URL.
   * @category URL
   */
  getUrl() {
    return this.res ? this.url : null;
  }

  /**
   * Replace the response body, as later scripts, tests and the response pane see it.
   *
   * `data` is copied. In Safe Mode `res.body` keeps the old body; `getBody()` returns the new one.
   * @param {any} data - The new body.
   * @example
   * res.setBody({ ...res.getBody(), receivedAt: Date.now() });
   * @category Body
   */
  setBody(data) {
    if (!this.res) {
      return;
    }

    const clonedData = _.cloneDeep(data);
    this.res.data = clonedData;
    this.body = clonedData;

    // Update dataBuffer to match the modified body
    if (clonedData === null || clonedData === undefined) {
      this.res.dataBuffer = Buffer.from('');
    } else if (typeof clonedData === 'string') {
      this.res.dataBuffer = Buffer.from(clonedData);
    } else {
      // For objects, stringify them
      try {
        this.res.dataBuffer = Buffer.from(JSON.stringify(clonedData));
      } catch (e) {
        this.res.dataBuffer = Buffer.from('');
      }
    }
  }

  // TODO: Refactor: dataBuffer size calculation should be handled in a shared utility so it can be passed and reused across the application
  /**
   * Get the size of the response, in bytes.
   *
   * The body is the bytes received, or the `Content-Length` when those are not known. The header
   * size is that of the status line and headers written as HTTP/1.1.
   * @returns {{ header: number, body: number, total: number }} The header, body and total sizes.
   * @category Timing & size
   */
  getSize() {
    if (!this.res) {
      return { header: 0, body: 0, total: 0 };
    }

    const { data, dataBuffer, headers } = this.res;
    let bodySize = 0;

    // Use raw received bytes
    if (Buffer.isBuffer(dataBuffer)) {
      bodySize = dataBuffer.length;
    } else {
      // Use server-reported Content-Length
      const contentLength = headers && (headers['content-length'] || headers['Content-Length']);
      if (contentLength && !isNaN(contentLength)) {
        bodySize = parseInt(contentLength, 10);
      } else if (data != null) {
        // Manual calculation
        const raw = typeof data === 'string' ? data : JSON.stringify(data);
        bodySize = Buffer.byteLength(raw);
      }
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

  /**
   * Get the response body's raw bytes, as a Node.js `Buffer`.
   * @returns {Uint8Array | null} The bytes.
   * @runtime nodevm
   * @category Body
   */
  getDataBuffer() {
    return this.res ? this.res.dataBuffer : null;
  }
}

module.exports = BrunoResponse;
