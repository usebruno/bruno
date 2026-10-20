const http = require('node:http');
const zlib = require('node:zlib');
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

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const deleteAuthorizationHeader = (headers) => {
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === 'authorization') {
      delete headers[name];
    }
  }
};

/**
 * Convert URL credentials into a Basic Authorization header.
 * Like axios, URL credentials override any existing Authorization header.
 */
const applyUrlCredentials = (url, headers) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!parsed.username && !parsed.password) {
    return;
  }
  deleteAuthorizationHeader(headers);
  const credentials = `${safeDecode(parsed.username)}:${safeDecode(parsed.password)}`;
  headers['Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
};

const inflate = (buffer) => {
  try {
    return zlib.inflateSync(buffer);
  } catch {
    return zlib.inflateRawSync(buffer);
  }
};

/**
 * Decompress gzip, deflate, or Brotli responses and remove outdated headers.
 * Leave the response unchanged if decompression fails or the encoding is unsupported.
 */
const decompressBody = (buffer, headers) => {
  const encoding = String(headers['content-encoding'] || '').toLowerCase();
  if (!encoding || encoding === 'identity' || buffer.length === 0) {
    return { data: buffer, headers };
  }
  let data;
  try {
    if (encoding === 'gzip' || encoding === 'x-gzip') {
      data = zlib.gunzipSync(buffer);
    } else if (encoding === 'deflate') {
      data = inflate(buffer);
    } else if (encoding === 'br') {
      data = zlib.brotliDecompressSync(buffer);
    } else {
      return { data: buffer, headers };
    }
  } catch {
    return { data: buffer, headers };
  }
  const nextHeaders = { ...headers };
  delete nextHeaders['content-encoding'];
  delete nextHeaders['content-length'];
  return { data, headers: nextHeaders };
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
const createHttp2Adapter = ({ tlsOptions }) => (config) => {
  const headers = normalizeHeaders(config.headers);
  applyUrlCredentials(config.url, headers);

  return sendHttp2Request({
    method: config.method ? String(config.method).toUpperCase() : 'GET',
    url: config.url,
    headers,
    body: config.data,
    tlsOptions,
    lookup: config.lookup,
    timeout: config.timeout
  }).then(
    (result) => {
      const { data: decoded, headers: responseHeaders }
        = config.decompress === false
          ? { data: result.data, headers: result.headers }
          : decompressBody(result.data, result.headers);

      const response = {
        data: decodeBody(decoded, config.responseType),
        status: result.status,
        statusText: http.STATUS_CODES[result.status] || '',
        headers: responseHeaders,
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
};

module.exports = { createHttp2Adapter };
