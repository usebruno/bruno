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

const resolveAllowInvalidHeaders = (requestSettings = {}, env = process.env) => {
  if (typeof requestSettings.allowInvalidHeaders === 'boolean') {
    return requestSettings.allowInvalidHeaders;
  }

  const fromEnv = parseEnvBoolean(env.BRUNO_ALLOW_INVALID_HEADERS);
  if (typeof fromEnv === 'boolean') {
    return fromEnv;
  }

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
  headers[name.toLowerCase()] = value;
};

const normalizeAccessControlAllowHeadersValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  let normalized = value.replace(/[\r\n]+[ \t]+/g, ' ').replace(/[\r\n]+/g, ' ');

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
