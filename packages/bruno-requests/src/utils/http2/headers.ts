import type { OutgoingHttpHeaders } from 'node:http2';

// Headers that must not appear in an HTTP/2 request. Compared case-insensitive
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
  stripped: string[];
};

export type ToH2HeadersParams = {
  method: string;
  url: string | URL;
  headers?: Record<string, unknown>;
};

export function buildHttp2RequestHeaders({ method, url, headers = {} }: ToH2HeadersParams): H2HeadersResult {
  const requestUrl = typeof url === 'string' ? new URL(url) : url;
  const http2Headers: OutgoingHttpHeaders = {
    ':method': method.toUpperCase(),
    ':scheme': requestUrl.protocol.replace(':', ''),
    ':authority': requestUrl.host,
    ':path': `${requestUrl.pathname}${requestUrl.search}`
  };
  const stripped: string[] = [];

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    const lowerCaseName = name.toLowerCase();

    if (lowerCaseName.startsWith(':')) continue;

    // Host header maps to :authority on HTTP/2
    if (lowerCaseName === 'host') {
      http2Headers[':authority'] = value as OutgoingHttpHeaders[string];
      stripped.push(name);
      continue;
    }

    // HTTP2 forbids the TE header except for "trailers"
    if (lowerCaseName === 'te') {
      if (String(value).trim().toLowerCase() === 'trailers') http2Headers['te'] = 'trailers';
      else stripped.push(name);
      continue;
    }

    if ((CONNECTION_HEADERS as readonly string[]).includes(lowerCaseName)) {
      stripped.push(name);
      continue;
    }

    http2Headers[lowerCaseName] = value as OutgoingHttpHeaders[string];
  }

  return { headers: http2Headers, stripped };
}
