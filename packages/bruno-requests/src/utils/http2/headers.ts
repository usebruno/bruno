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

export const toHttp2Headers = (method: string, url: string, headers: Http1Headers = {}): Http2RequestHeaders => {
  const parsed = new URL(url);

  const http2Headers: Http2RequestHeaders = {
    ':method': (method || 'GET').toUpperCase(),
    ':scheme': parsed.protocol.replace(/:$/, ''),
    ':authority': parsed.host,
    ':path': `${parsed.pathname}${parsed.search}` || '/'
  };

  for (const [rawName, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      continue;
    }

    // HTTP/2 header names must be lower-case.
    const name = rawName.toLowerCase();

    // drop the caller supplied headers with :
    if (name.startsWith(':')) {
      continue;
    }

    // Host is represented by :authority in HTTP/2.
    if (name === 'host') {
      continue;
    }

    if (CONNECTION_SPECIFIC_HEADERS.has(name)) {
      continue;
    }

    // te is permitted only as "trailers".
    if (name === 'te') {
      if (String(value).toLowerCase() === 'trailers') {
        http2Headers['te'] = 'trailers';
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
export const fromHttp2Headers = (
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
