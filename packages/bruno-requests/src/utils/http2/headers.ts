type HeaderValue = string | string[] | number;
export type Http1Headers = Record<string, HeaderValue | undefined | null>;
export type Http2RequestHeaders = Record<string, HeaderValue>;

/**
 * Headers used only in HTTP/1.1 connections.
 * HTTP/2 doesn't allow them, and sending them may cause the server to reject the request.
 */
const CONNECTION_SPECIFIC_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade'
]);

export const buildHttp2RequestHeaders = (method: string, url: string, headers: Http1Headers = {}): Http2RequestHeaders => {
  const parsed = new URL(url);

  const http2Headers: Http2RequestHeaders = {
    ':method': (method || 'GET').toUpperCase(),
    ':scheme': parsed.protocol.replace(/:$/, ''),
    ':authority': parsed.host,
    ':path': `${parsed.pathname}${parsed.search}` || '/'
  };

  for (const [rawName, value] of Object.entries(headers)) {
    if (value == null) continue;

    const name = rawName.toLowerCase();

    // Skip headers that HTTP/2 doesn't allow or handles separately.
    if (
      name.startsWith(':')
      || name === 'host'
      || CONNECTION_SPECIFIC_HEADERS.has(name)
    ) {
      continue;
    }

    // HTTP/2 only allows only "trailers" as the TE value.
    if (name === 'te') {
      if (String(value).toLowerCase() === 'trailers') {
        http2Headers.te = 'trailers';
      }
      continue;
    }

    http2Headers[name] = value;
  }

  return http2Headers;
};

/**
 * Split an HTTP/2 response header block back into the `{ status, headers }` shape
 */
export const parseHttp2ResponseHeaders = (
  http2headers: Record<string, string | string[] | undefined>
): { status: number; headers: Record<string, string | string[]> } => {
  const headers: Record<string, string | string[]> = {};
  let status = 0;

  for (const [name, value] of Object.entries(http2headers)) {
    if (value === undefined) {
      continue;
    }
    if (name === ':status') {
      status = Number(value);
      continue;
    }
    if (name.startsWith(':')) {
      continue;
    }
    headers[name] = value;
  }

  return { status, headers };
};
