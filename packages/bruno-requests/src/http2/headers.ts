/**
 * HTTP/1.1 -> HTTP/2 request header translation.
 *
 * axios hands the transport an HTTP/1.1-shaped request: method, URL and a flat headers object. HTTP/2
 * expresses the request line as pseudo-headers (`:method`, `:scheme`, `:authority`, `:path`), requires
 * lowercase names, and forbids the connection-specific headers that only mean something on a single
 */
import type { OutgoingHttpHeaders } from 'node:http2';

/** Header names that describe an HTTP/1.1 connection and must not be sent over HTTP/2. */
export const CONNECTION_SPECIFIC_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'http2-settings'
]);

export type HeaderValue = string | number | string[] | undefined | null;

export type BuildH2HeadersParams = {
  method: string;
  url: string;
  headers?: Record<string, HeaderValue>;
};

const normalizeValue = (value: HeaderValue): string | string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value);
};

export function buildHttp2Headers({ method, url, headers = {} }: BuildH2HeadersParams): OutgoingHttpHeaders {
  const parsed = new URL(url);
  const http2Headers: OutgoingHttpHeaders = {};
  let authority = parsed.host;
  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = rawName.toLowerCase();

    if (name.startsWith(':')) {
      throw new Error(`HTTP/2 pseudo-header "${rawName}" cannot be set directly; it is derived from the request URL and method`);
    }
    if (CONNECTION_SPECIFIC_HEADERS.has(name)) continue;

    const value = normalizeValue(rawValue);
    if (value === undefined) continue;

    if (name === 'host') {
      // HTTP/1.1 Host becomes :authority, a caller-set Host wins over the URL.
      authority = Array.isArray(value) ? value[0] : value;
      continue;
    }
    if (name === 'te') {
      // HTTP/2 only allows `te` with the value "trailers".
      const te = Array.isArray(value) ? value.join(',') : value;
      if (te.trim().toLowerCase() !== 'trailers') continue;
      http2Headers.te = 'trailers';
      continue;
    }

    http2Headers[name] = value;
  }

  http2Headers[':method'] = method.toUpperCase();
  http2Headers[':scheme'] = parsed.protocol.replace(/:$/, '');
  http2Headers[':authority'] = authority;
  http2Headers[':path'] = `${parsed.pathname}${parsed.search}`;

  return http2Headers;
}
