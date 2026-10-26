import type { LookupFunction } from 'node:net';
import { establishTlsConnection, type HttpVersionMode, bracketIpv6 } from './tls-connect-options';
import { getSessionKey } from './session-pool';

const DEFAULT_ALPN_TTL_MS = 10 * 60 * 1000;
const PROBE_TIMEOUT_MS = 10 * 1000;

export type NegotiateHttpVersionParams = {
  url: string;
  mode: HttpVersionMode;
  tlsOptions?: object;
  lookup?: LookupFunction;
  proxyUri?: string | null;
  ttlMs?: number;
};

export type HttpVersionDecision = {
  httpVersion: 1 | 2;
  reason: string;
  offered?: string[];
  alpn?: string | null;
};

type AlpnCacheEntry = {
  alpn: string | null;
  expiresAt: number;
};

const alpnCache = new Map<string, AlpnCacheEntry>();

/**
 * Get a readable error reason, including errors wrapped in AggregateError.
 */
const getProbeErrorReason = (error: any): string => {
  if (!error) return 'unknown error';

  if (error.code) {
    return String(error.code);
  }

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    const innerError
      = error.errors.find((err: any) => err?.code || err?.message)
        || error.errors[0];

    return String(innerError?.code || innerError?.message || 'aggregate error');
  }

  return error.message || error.name || 'unknown error';
};

export async function negotiateHttpVersion(
  params: NegotiateHttpVersionParams
): Promise<HttpVersionDecision> {
  const {
    url,
    mode,
    tlsOptions,
    lookup,
    proxyUri = null,
    ttlMs = DEFAULT_ALPN_TTL_MS
  } = params;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return { httpVersion: 1, reason: 'unparseable URL' };
  }

  // Cleartext connections don't support ALPN. Only explicit HTTP/2 uses h2c.
  if (parsedUrl.protocol !== 'https:') {
    if (mode === 'http2') {
      return { httpVersion: 2, reason: 'h2c prior knowledge (cleartext)' };
    }

    return {
      httpVersion: 1,
      reason: mode === 'auto'
        ? 'cleartext, no ALPN, using HTTP/1.1'
        : 'mode http1'
    };
  }

  if (mode === 'http1') {
    return { httpVersion: 1, reason: 'mode http1' };
  }

  if (mode === 'http2') {
    return { httpVersion: 2, reason: 'mode http2 (forced)' };
  }

  // In auto mode, negotiate ALPN and cache the result for this origin.
  const port = Number(parsedUrl.port) || 443;
  const origin = `${parsedUrl.protocol}//${bracketIpv6(parsedUrl.hostname)}:${port}`;
  const cacheKey = getSessionKey({ origin, tlsOptions, proxyUri });

  const cached = alpnCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return {
      httpVersion: cached.alpn === 'h2' ? 2 : 1,
      reason: 'auto (cached)',
      offered: ['h2', 'http/1.1'],
      alpn: cached.alpn
    };
  }

  let probe: Awaited<ReturnType<typeof establishTlsConnection>>;

  try {
    probe = await establishTlsConnection({
      hostname: parsedUrl.hostname,
      port,
      tlsOptions,
      mode: 'auto',
      lookup,
      timeoutMs: PROBE_TIMEOUT_MS
    });
  } catch (error) {
    return {
      httpVersion: 1,
      reason: `ALPN probe failed (${getProbeErrorReason(error)}); using HTTP/1.1`
    };
  }

  probe.socket.destroy();

  alpnCache.set(cacheKey, {
    alpn: probe.alpn,
    expiresAt: Date.now() + ttlMs
  });

  return {
    httpVersion: probe.alpn === 'h2' ? 2 : 1,
    reason: `auto (${probe.protocol ?? 'negotiated'})`,
    offered: probe.offered,
    alpn: probe.alpn
  };
}

export const clearAlpnCache = (): void => alpnCache.clear();

export const canUseHttp2 = (mode: string | null | undefined): boolean =>
  mode === 'http2' || mode === 'auto';
