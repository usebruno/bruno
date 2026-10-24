import crypto from 'node:crypto';

const hash = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  const list = Array.isArray(value) ? value : [value];
  const h = crypto.createHash('sha256');
  for (const v of list) h.update(Buffer.isBuffer(v) ? v : String(v));
  return h.digest('hex').slice(0, 16);
};

/**
 * Build a unique connection key from the origin, TLS settings, and proxy.
 * Used by the ALPN cache and session pool to safely reuse connections.
 */
export const buildConnectionKey = (
  origin: string,
  tlsOptions: Record<string, unknown> = {},
  proxyUri?: string | null
): string =>
  [
    origin,
    hash(tlsOptions.ca),
    hash(tlsOptions.cert),
    hash(tlsOptions.key),
    hash(tlsOptions.pfx),
    tlsOptions.rejectUnauthorized === false ? 'insecure' : 'verify',
    proxyUri || 'direct'
  ].join('|');
