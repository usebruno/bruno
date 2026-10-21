import http from 'node:http';
import zlib from 'node:zlib';
import { PassThrough } from 'node:stream';
import { AxiosError } from 'axios';
import { sendHttp2Request } from './send-request';

type AdapterHeaders = Record<string, any>;
type ResponseHeaders = Record<string, string | string[]>;

/** Axios may hand us an AxiosHeaders instance, flatten it to a plain object. */
const normalizeHeaders = (headers: any): AdapterHeaders => {
  if (headers && typeof headers.toJSON === 'function') {
    return headers.toJSON();
  }
  return headers || {};
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const deleteAuthorizationHeader = (headers: AdapterHeaders): void => {
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === 'authorization') {
      delete headers[name];
    }
  }
};

/**
 * Convert axios's auth option into a Basic Authorization header.
 */
const applyBasicAuthHeader = (
  auth: { username?: string; password?: string } | undefined,
  headers: AdapterHeaders
): void => {
  if (!auth) {
    return;
  }
  const username = auth.username ?? '';
  const password = auth.password ?? '';
  deleteAuthorizationHeader(headers);
  const credentials = `${username}:${password}`;
  headers['Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
};

/**
 * Convert URL credentials into a Basic Authorization header.
 */
const applyUrlCredentials = (url: string, headers: AdapterHeaders): void => {
  let parsed: URL;
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

const inflate = (buffer: Buffer): Buffer => {
  try {
    return zlib.inflateSync(buffer);
  } catch {
    return zlib.inflateRawSync(buffer);
  }
};

/**
 * Decompress gzip, deflate, or Brotli responses and drop the now-stale
 * content-encoding/content-length. Left unchanged on an unknown encoding or failure.
 */
const decompressBody = (buffer: Buffer, headers: ResponseHeaders): { data: Buffer; headers: ResponseHeaders } => {
  const encoding = String(headers['content-encoding'] || '').toLowerCase();
  if (!encoding || encoding === 'identity' || buffer.length === 0) {
    return { data: buffer, headers };
  }
  let data: Buffer;
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

/** Decode the response body per axios responseType. */
const decodeBody = (buffer: Buffer, responseType?: string): Buffer | string | PassThrough => {
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

const buildRequestInfo = (url: string): { protocol: string; host: string; path: string } | null => {
  try {
    const parsed = new URL(url);
    return { protocol: parsed.protocol, host: parsed.host, path: `${parsed.pathname}${parsed.search}` };
  } catch {
    return null;
  }
};

/**
 * axios adapter that sends the request over HTTP/2 and returns an
 * axios-compatible response, validating status the same way the default
 * HTTP/1.1 adapter does.
 */
export const createHttp2Adapter = ({ tlsOptions }: { tlsOptions?: Record<string, unknown> | null }) => (config: any): Promise<any> => {
  const headers = normalizeHeaders(config.headers);
  applyBasicAuthHeader(config.auth, headers);
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
        request: buildRequestInfo(config.url)
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
        response as any
      );
    },
    (err: any) => {
      if (err instanceof AxiosError) {
        throw err;
      }
      throw new AxiosError(err.message, err.code || AxiosError.ERR_NETWORK, config, null);
    }
  );
};
