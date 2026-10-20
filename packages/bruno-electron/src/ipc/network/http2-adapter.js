const http = require('node:http');
const { PassThrough } = require('node:stream');
const { AxiosError } = require('axios');
const { sendHttp2Request } = require('@usebruno/requests');

/**
 * Axios may hand us an AxiosHeaders instance, flatten it to a plain object
 */
const normalizeHeaders = (headers) => {
  if (headers && typeof headers.toJSON === 'function') {
    return headers.toJSON();
  }
  return headers || {};
};

/**
 * Decode the response body based on axios's responseType.
 */
const decodeBody = (buffer, responseType) => {
  if (responseType === 'stream') {
    const stream = new PassThrough();
    stream.end(buffer);
    return stream;
  }
  if (responseType === 'arraybuffer') {
    return buffer;
  }
  return buffer.toString('utf-8');
};

/**
 * Axios adapter for sending requests over HTTP/2.
 * Returns an axios-compatible response and handles status validation
 * the same way as the default HTTP/1.1 adapter.
 */
const createHttp2Adapter = ({ tlsOptions }) => (config) =>
  sendHttp2Request({
    method: config.method ? String(config.method).toUpperCase() : 'GET',
    url: config.url,
    headers: normalizeHeaders(config.headers),
    body: config.data,
    tlsOptions,
    lookup: config.lookup,
    timeout: config.timeout
  }).then(
    (result) => {
      const response = {
        data: decodeBody(result.data, config.responseType),
        status: result.status,
        statusText: http.STATUS_CODES[result.status] || '',
        headers: result.headers,
        // Bruno renders the status line from response.httpVersion; forward '2.0'
        // so it shows HTTP/2.0 (and the multiplexing note fires) instead of 1.1.
        httpVersion: result.httpVersion,
        config,
        request: null
      };

      const { validateStatus } = config;
      if (!validateStatus || validateStatus(response.status)) {
        return response;
      }
      throw new AxiosError(
        `Request failed with status code ${response.status}`,
        [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
        config,
        null,
        response
      );
    },
    (err) => {
      if (err instanceof AxiosError) {
        throw err;
      }
      throw new AxiosError(err.message, err.code || AxiosError.ERR_NETWORK, config, null);
    }
  );

module.exports = { createHttp2Adapter };
