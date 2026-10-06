const { get } = require('@usebruno/query');
const _ = require('lodash');
const HeaderList = require('./header-list');

/**
 * The size of a response, in bytes.
 * @typedef {object} ResponseSize
 * @property {number} header - The size of the status line and headers.
 * @property {number} body - The size of the body as received.
 * @property {number} total - `header + body`.
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
     * The response headers, by lower-case name. A repeated header, such as `set-cookie`, has an
     * array of values.
     * @type {Record<string, any> | null}
     * @readonly
     * @category Headers
     */
    this.headers = res ? res.headers : null;
    /**
     * The response body, parsed when it is JSON. Use `res.setBody()` to change it.
     * @type {any}
     * @readonly
     * @category Body
     */
    this.body = res ? res.data : null;
    /**
     * How long the request took, in milliseconds.
     * @type {number | null}
     * @readonly
     * @category Info
     */
    this.responseTime = res ? res.responseTime : null;
    /**
     * The URL the response came from, after any redirects.
     * @type {string | null}
     * @readonly
     * @category Info
     */
    this.url = res?.request ? res.request.protocol + '//' + res.request.host + res.request.path : null;

    // HeaderList in static read-only mode — write methods throw
    /**
     * The response headers as a read-only list, with case-insensitive lookups.
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
   * test('responds with 200', () => expect(res.getStatus()).to.equal(200));
   * @category Status
   */
  getStatus() {
    return this.res ? this.res.status : null;
  }

  /**
   * Get the HTTP status text.
   * @returns {string | null} The status text, such as `'OK'`.
   * @category Status
   */
  getStatusText() {
    return this.res ? this.res.statusText : null;
  }

  /**
   * Get the value of a response header, whatever the case of `name`.
   * @param {string} name - The header's name.
   * @returns {any} The value, an array of values for a repeated header, or `undefined` when the
   *   header is absent.
   * @example
   * const contentType = res.getHeader('Content-Type');
   * @category Headers
   */
  getHeader(name) {
    if (typeof name !== 'string' || !this.res?.headers) {
      return null;
    }
    return this.res.headers[name.toLowerCase()];
  }

  /**
   * Get the response headers.
   * @returns {Record<string, any> | null} The headers, by lower-case name.
   * @category Headers
   */
  getHeaders() {
    return this.res ? this.res.headers : null;
  }

  /**
   * Get the response body.
   * @returns {any} The body, parsed when it is JSON.
   * @example
   * const { token } = res.getBody();
   * @category Body
   */
  getBody() {
    return this.res ? this.res.data : null;
  }

  /**
   * Get how long the request took.
   * @returns {number | null} The time in milliseconds.
   * @category Info
   */
  getResponseTime() {
    return this.res ? this.res.responseTime : null;
  }

  /**
   * Get the URL the response came from, after any redirects.
   * @returns {string | null} The URL.
   * @category Info
   */
  getUrl() {
    return this.res ? this.url : null;
  }

  /**
   * Replace the response body, as later scripts, tests and the response pane see it.
   * @param {any} data - The new body. It is copied, so later changes to `data` don't affect it.
   * @example
   * res.setBody({ ...res.getBody(), token: '[redacted]' });
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
   * Get the size of the response.
   * @returns {ResponseSize} The header, body and total sizes in bytes.
   * @category Info
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
   * Get the response body as the raw bytes received.
   * @returns {Uint8Array | null} A Node.js `Buffer` of the body.
   * @runtime nodevm
   * @category Body
   */
  getDataBuffer() {
    return this.res ? this.res.dataBuffer : null;
  }
}

module.exports = BrunoResponse;
