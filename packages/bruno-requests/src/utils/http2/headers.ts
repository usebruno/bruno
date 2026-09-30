import type { OutgoingHttpHeaders } from 'node:http2';

/**
 * HTTP/1.1 → HTTP/2 request header translation.
 *
 * HTTP/2 has no request line: method, scheme, authority and path travel as pseudo-headers.
 * Header names are always lowercase on the wire (HPACK). Connection-specific headers are
 * illegal (RFC 9113 §8.2.2) and Node rejects them with ERR_HTTP2_INVALID_CONNECTION_HEADERS,
 * so they are removed here and reported back for the timeline — a collection with
 * `Connection: keep-alive` copied from curl or Postman should still work, with a visible
 * note, rather than fail. `Host` is expressed as `:authority` and is dropped as a regular
 * header (Node accepts it, but sending both is redundant and some servers reject a mismatch).
 */

/** Headers that must not appear in an HTTP/2 request. Compared case-insensitively. */
export const CONNECTION_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'http2-settings'
] as const;

export type H2HeadersResult = {
  headers: OutgoingHttpHeaders;
  /** Original names (as given) of headers removed because HTTP/2 forbids them. */
  stripped: string[];
};

export type ToH2HeadersParams = {
  method: string;
  /** Absolute URL of the request. */
  url: string | URL;
  headers?: Record<string, unknown>;
};

export function buildHttp2RequestHeaders({ method, url, headers = {} }: ToH2HeadersParams): H2HeadersResult {
  const requestUrl = typeof url === 'string' ? new URL(url) : url;
  const http2Headers: OutgoingHttpHeaders = {
    ':method': method.toUpperCase(),
    ':scheme': requestUrl.protocol.replace(':', ''),
    ':authority': requestUrl.host, // hostname, plus port when it is not the scheme default
    ':path': `${requestUrl.pathname}${requestUrl.search}`
  };
  const stripped: string[] = [];

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    const lowerCaseName = name.toLowerCase();

    // Never let callers inject pseudo-headers.
    if (lowerCaseName.startsWith(':')) continue;

    if ((CONNECTION_HEADERS as readonly string[]).includes(lowerCaseName) || lowerCaseName === 'host') {
      stripped.push(name);
      continue;
    }

    // Node lowercases anyway; doing it here keeps `stripped`/timeline consistent with the
    // wire and makes a later header that differs only in case override an earlier one
    // predictably.
    http2Headers[lowerCaseName] = value as OutgoingHttpHeaders[string];
  }

  return { headers: http2Headers, stripped };
}
