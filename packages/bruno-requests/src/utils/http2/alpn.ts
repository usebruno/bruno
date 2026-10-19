/**
 * Axios doesn't automatically fall back to HTTP/1.1 when a server doesn't support HTTP/2.
 * It only supports prior-knowledge HTTP/2, so a request to an h1-only server will fail the handshake.
 *
 * So, instead we probe the server first (via a TLS handshake) to see if it supports HTTP/2, and cache
 * the result per origin + TLS identity.
 */
import tls from 'node:tls';
import crypto from 'node:crypto';
import type { LookupFunction } from 'node:net';
import { buildTlsConnectOptions, type HttpVersionMode } from './tls-connect-options';

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const PROBE_TIMEOUT_MS = 10 * 1000;

type CacheEntry = { alpn: string | null; expiresAt: number };
const alpnCache = new Map<string, CacheEntry>();

const hash = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  const list = Array.isArray(value) ? value : [value];
  const h = crypto.createHash('sha256');
  for (const v of list) h.update(Buffer.isBuffer(v) ? v : String(v));
  return h.digest('hex').slice(0, 16);
};

/**
 * Cache key = origin + TLS identity + proxy.
 */
const cacheKey = (origin: string, tlsOptions: Record<string, unknown> = {}, proxyUri?: string | null): string =>
  [
    origin,
    hash(tlsOptions.ca),
    hash(tlsOptions.cert),
    hash(tlsOptions.key),
    hash(tlsOptions.pfx),
    tlsOptions.rejectUnauthorized === false ? 'insecure' : 'verify',
    proxyUri || 'direct'
  ].join('|');

export type NegotiationResult = { alpn: string | null; protocol?: string; error?: string };

/** One TLS handshake offering both protocols. resolves to the negotiated ALPN. */
export function negotiateHttpVersion(params: {
  hostname: string;
  port: number;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
}): Promise<NegotiationResult> {
  return new Promise((resolve) => {
    const options = buildTlsConnectOptions({ ...params, mode: 'auto' });
    let settled = false;
    const finish = (result: NegotiationResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };
    const socket = tls.connect(options);
    const timer = setTimeout(
      () => finish({ alpn: null, error: `ALPN probe timed out after ${PROBE_TIMEOUT_MS} ms` }),
      PROBE_TIMEOUT_MS
    );
    socket.once('secureConnect', () => finish({ alpn: socket.alpnProtocol || null, protocol: socket.getProtocol() || undefined }));
    socket.once('error', (err: Error) => finish({ alpn: null, error: err.message }));
  });
}

export type ResolveHttpVersionParams = {
  url: string;
  mode: HttpVersionMode;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
  proxyUri?: string | null;
  ttlMs?: number;
};

export type Resolved = { httpVersion: 1 | 2; reason: string; offered?: string[]; alpn?: string | null };

export async function resolveHttpVersion(params: ResolveHttpVersionParams): Promise<Resolved> {
  const { url, mode, tlsOptions = {}, lookup, proxyUri, ttlMs = DEFAULT_TTL_MS } = params;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { httpVersion: 1, reason: 'unparseable URL' };
  }
  if (parsed.protocol !== 'https:') {
    return { httpVersion: 1, reason: 'cleartext URL (h2c not supported)' };
  }
  if (mode === 'http1.1') {
    return { httpVersion: 1, reason: 'mode http1.1' };
  }
  if (mode === 'http2') {
    return { httpVersion: 2, reason: 'mode http2' };
  }

  // for auto, negotiate via ALPN, cached per origin + TLS identity.
  const port = Number(parsed.port) || 443;
  const origin = `${parsed.hostname}:${port}`;
  const key = cacheKey(origin, tlsOptions || {}, proxyUri);
  const cached = alpnCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      httpVersion: cached.alpn === 'h2' ? 2 : 1,
      reason: 'auto (cached)',
      offered: ['h2', 'http/1.1'],
      alpn: cached.alpn
    };
  }

  const negotiated = await negotiateHttpVersion({ hostname: parsed.hostname, port, tlsOptions, lookup });
  if (negotiated.error) {
    return { httpVersion: 1, reason: `ALPN negotiation failed (${negotiated.error}); using HTTP/1.1` };
  }
  alpnCache.set(key, { alpn: negotiated.alpn, expiresAt: Date.now() + ttlMs });
  return {
    httpVersion: negotiated.alpn === 'h2' ? 2 : 1,
    reason: `auto (${negotiated.protocol || 'negotiated'})`,
    offered: ['h2', 'http/1.1'],
    alpn: negotiated.alpn
  };
}

export const invalidateAlpn = (origin: string): void => {
  for (const key of alpnCache.keys()) if (key.startsWith(`${origin}|`)) alpnCache.delete(key);
};
export const clearAlpnCache = (): void => alpnCache.clear();
