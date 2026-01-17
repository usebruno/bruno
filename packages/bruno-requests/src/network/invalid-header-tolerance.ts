const TRUTHY = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'n', 'off']);

const parseEnvBoolean = (value: unknown): boolean | undefined => {
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

export const resolveAllowInvalidHeaders = (
  requestSettings: { allowInvalidHeaders?: boolean } = {},
  env: NodeJS.ProcessEnv = process.env
): boolean => {
  if (typeof requestSettings.allowInvalidHeaders === 'boolean') {
    return requestSettings.allowInvalidHeaders;
  }

  const fromEnv = parseEnvBoolean(env.BRUNO_ALLOW_INVALID_HEADERS);
  if (typeof fromEnv === 'boolean') {
    return fromEnv;
  }

  return true;
};

export const normalizeAccessControlAllowHeadersValue = (value: unknown): unknown => {
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

