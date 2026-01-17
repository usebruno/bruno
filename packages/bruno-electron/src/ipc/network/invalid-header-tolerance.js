const TRUTHY = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'n', 'off']);

const parseEnvBoolean = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized.length) {
    return undefined;
  }
  if (TRUTHY.has(normalized)) {
    return true;
  }
  if (FALSY.has(normalized)) {
    return false;
  }
  return undefined;
};

/**
 * Bruno needs to be tolerant of "obsolete line folding" (obs-fold) and other
 * real-world broken HTTP responses that curl/Postman accept.
 *
 * Node's default HTTP parser (llhttp) rejects obs-fold with:
 *   HPE_INVALID_HEADER_TOKEN / "Unexpected whitespace after header value"
 *
 * Enabling `insecureHTTPParser` makes parsing tolerant for these cases.
 * This is a DX trade-off: it can hide server header bugs and is less strict
 * than RFC-compliant parsing, so we provide an opt-out switch.
 */
const resolveAllowInvalidHeaders = (requestSettings = {}, env = process.env) => {
  if (typeof requestSettings.allowInvalidHeaders === 'boolean') {
    return requestSettings.allowInvalidHeaders;
  }

  const fromEnv = parseEnvBoolean(env.BRUNO_ALLOW_INVALID_HEADERS);
  if (typeof fromEnv === 'boolean') {
    return fromEnv;
  }

  // Default ON: Bruno is a debugging client; tolerating common broken servers
  // matches the behavior users expect from curl/Postman/Apifox.
  return true;
};

const isAxiosHeaders = (headers) => {
  return !!headers && typeof headers.get === 'function' && typeof headers.set === 'function';
};

const getHeaderValue = (headers, name) => {
  if (!headers) {
    return undefined;
  }
  if (isAxiosHeaders(headers)) {
    return headers.get(name);
  }
  return headers[name] ?? headers[name.toLowerCase()];
};

const setHeaderValue = (headers, name, value) => {
  if (!headers) {
    return;
  }
  if (isAxiosHeaders(headers)) {
    headers.set(name, value);
    return;
  }
  // Axios normalizes node response header keys to lowercase.
  headers[name.toLowerCase()] = value;
};

const normalizeAccessControlAllowHeadersValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  // Collapse obs-fold into spaces (in case a tolerant parser preserves CRLFs).
  let normalized = value.replace(/[\r\n]+[ \t]+/g, ' ').replace(/[\r\n]+/g, ' ');

  // This header is defined as a comma-separated list of header field-names.
  // In broken responses we sometimes see "Accept:" as a folded continuation.
  const parts = normalized
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.endsWith(':') && /^[A-Za-z0-9-]+:$/.test(p) ? p.slice(0, -1) : p));

  normalized = parts.join(', ');
  return normalized;
};

const normalizeObsFoldedResponseHeaders = (headers, request, env = process.env) => {
  const allowInvalidHeaders = resolveAllowInvalidHeaders(request?.settings || {}, env);
  if (!allowInvalidHeaders) {
    return;
  }

  // If a tolerant parser preserves CR/LF in header values, collapse them to spaces
  // so the rest of Bruno can treat headers as single-line strings.
  if (headers) {
    const entries = isAxiosHeaders(headers) ? Object.entries(headers.toJSON()) : Object.entries(headers);
    for (const [key, value] of entries) {
      if (typeof value !== 'string' || (!value.includes('\n') && !value.includes('\r'))) {
        continue;
      }
      const collapsed = value.replace(/[\r\n]+[ \t]+/g, ' ').replace(/[\r\n]+/g, ' ');
      setHeaderValue(headers, key, collapsed);
    }
  }

  const acah = getHeaderValue(headers, 'access-control-allow-headers');
  if (typeof acah === 'string' && acah.length) {
    setHeaderValue(headers, 'access-control-allow-headers', normalizeAccessControlAllowHeadersValue(acah));
  }
};

const applyInvalidHeaderToleranceToRequest = (request, env = process.env) => {
  const allowInvalidHeaders = resolveAllowInvalidHeaders(request?.settings || {}, env);
  if (allowInvalidHeaders) {
    request.insecureHTTPParser = true;
  }
  return allowInvalidHeaders;
};

module.exports = {
  applyInvalidHeaderToleranceToRequest,
  normalizeObsFoldedResponseHeaders,
  resolveAllowInvalidHeaders
};
