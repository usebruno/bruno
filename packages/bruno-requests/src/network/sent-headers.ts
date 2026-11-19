import type { ClientRequest } from 'node:http';

const MASK_CHAR = '*';

/**
 * Read headers from the serialized request because this represents what was
 * actually sent. Some headers, such as "Connection", are not included in
 * clientRequest.getHeaders().
*/
export const getSentHeaders = (clientRequest?: ClientRequest | null): Record<string, string> => {
// HTTP/2 exposes sent headers directly instead of a serialized _header string.
// Skip pseudo-headers, which contain the request details, and mask proxy credentials.
  const http2SentHeaders = (clientRequest as { sentHeaders?: Record<string, unknown> })?.sentHeaders;

  // Check for HTTP/2 pseudo-headers so we don't mistake regular headers for HTTP/2.
  const isHttp2
    = http2SentHeaders != null
      && typeof http2SentHeaders === 'object'
      && Object.keys(http2SentHeaders).some((name) => name.startsWith(':'));
  if (isHttp2) {
    const sentHeaders: Record<string, string> = {};

    for (const [name, rawValue] of Object.entries(http2SentHeaders!)) {
      if (name.startsWith(':')) continue;

      const headerName = name.toLowerCase();
      const value = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue);

      sentHeaders[headerName]
        = headerName === 'proxy-authorization' ? MASK_CHAR.repeat(value.length) : value;
    }

    return sentHeaders;
  }

  const headerBlock = (clientRequest as unknown as { _header?: unknown })?._header;
  if (typeof headerBlock !== 'string' || !headerBlock) return {};

  const lines = headerBlock.split(/\r?\n/);
  const sentHeaders: Record<string, string> = {};

  // Start at i = 1 to skip the request line ("GET /path HTTP/1.1")
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');

    // Anything but a positive index is a blank line or a nameless value, neither is a header
    if (colonIdx > 0) {
      const name = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      /** The proxy agent injects this credential and the user never authored it, so the header
       *  stays visible but its value never is, in the timeline or in `request.headers`.
       * */
      sentHeaders[name] = name.toLowerCase() === 'proxy-authorization' ? MASK_CHAR.repeat(value.length) : value;
    }
  }

  return sentHeaders;
};

/** `request.headers` only holds what we put together, the headers table plus anything a
 *  pre-request script set.
 *
 *  But more headers actually go out. axios adds Accept and Accept-Encoding, Bruno adds User-Agent,
 *  Node adds Host and Connection. None of them exist until Node writes the
 *  request to the socket, long after we finished preparing it.
 *
 *  So after the send the two lists disagree, and this copies the missing ones in. It never replaces
 *  a header the user set, ignoring casing, so a declared `user-agent` and a sent `User-Agent` stay
 *  one entry instead of two
 * */
export const applySentHeadersToRequest = (
  request?: { headers?: Record<string, unknown> } | null,
  response?: { sentHeaders?: Record<string, string> } | null
) => {
  if (!request?.headers || !response?.sentHeaders) return;

  const existing = new Set(Object.keys(request.headers).map((name) => name.toLowerCase()));
  const sentHeaders: Record<string, string> = {};

  Object.entries(response.sentHeaders).forEach(([key, value]) => {
    if (!existing.has(key.toLowerCase())) sentHeaders[key] = value;
  });

  request.headers = { ...sentHeaders, ...request.headers };
};
