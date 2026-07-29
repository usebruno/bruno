// The headers a request actually put on the wire, read back off Node's http.ClientRequest.
//
// Both hosts need this: the Node http adapter appends transport headers (Host, Connection,
// Accept-Encoding, Content-Length, Transfer-Encoding) *after* a request interceptor can observe
// config.headers, so neither the electron timeline nor the CLI report can describe the real request
// from config alone. Only property access on the request object is used here, so this stays free of
// Node built-ins and safe for the renderer bundle.

// The subset of http.ClientRequest this reads. `_header` is private but is the only source that
// carries on-wire casing, order, and repeated names.
type SentHeadersSource = { _header?: unknown; getHeaders?: () => Record<string, unknown> };

export type SentHeader = { name: string; value: string };

// Credentials Bruno injects from preferences rather than from the request definition. They are on
// the wire, but surfacing them would print a stored secret into a timeline users copy and share, so
// the name is kept and the value replaced.
const REDACTED_HEADERS = new Set(['proxy-authorization']);
const REDACTED_VALUE = '<redacted>';

const redact = (name: string, value: string): string =>
  REDACTED_HEADERS.has(name.trim().toLowerCase()) ? REDACTED_VALUE : value;

// `_header` is the serialized block Node writes to the socket, e.g.
// "GET /p HTTP/1.1\r\nHost: x\r\nConnection: keep-alive\r\n\r\n".
const parseHeaderBlock = (raw: string): SentHeader[] => {
  const out: SentHeader[] = [];
  raw
    .split('\r\n')
    .slice(1) // drop the request line
    .forEach((line) => {
      if (!line) return;
      const idx = line.indexOf(':');
      if (idx === -1) return;
      const name = line.slice(0, idx).trim();
      if (!name) return;
      out.push({ name, value: redact(name, line.slice(idx + 1).trim()) });
    });
  return out;
};

/**
 * Read the headers a request sent. Prefers the serialized wire block, which alone preserves on-wire
 * casing, ordering, and headers sent more than once.
 *
 * `getHeaders()` is a lossy fallback: Node emits `Connection` and `Transfer-Encoding` only while
 * serializing, so they are absent there, and array values are folded to one comma-joined string.
 * `hasWireBlock` lets a caller that needs an exact wire match tell the two apart.
 */
export const parseSentHeaders = (req: SentHeadersSource | null | undefined): SentHeader[] => {
  const raw = req?._header;
  if (typeof raw === 'string') return parseHeaderBlock(raw);

  const headers = typeof req?.getHeaders === 'function' ? req.getHeaders() : null;
  if (!headers) return [];
  return Object.entries(headers).map(([name, value]) => ({
    name,
    value: redact(name, Array.isArray(value) ? value.join(', ') : String(value))
  }));
};

// True when parseSentHeaders can report the exact wire block rather than the lossy fallback.
export const hasWireBlock = (req: SentHeadersSource | null | undefined): boolean =>
  typeof req?._header === 'string';

// Fold sent headers into a name -> value object. Repeated names are comma-joined, per RFC 9110's
// equivalence between repeated headers and a single comma-separated one. Used where a consumer's
// contract is an object (the CLI report shape) rather than a list.
export const sentHeadersToObject = (headers: SentHeader[]): Record<string, string> => {
  const out: Record<string, string> = {};
  headers.forEach(({ name, value }) => {
    out[name] = Object.prototype.hasOwnProperty.call(out, name) ? `${out[name]}, ${value}` : value;
  });
  return out;
};
