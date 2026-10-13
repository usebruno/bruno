/**
 * http2-wrapper handles the TLS handshake and ALPN negotiation. This module maps the HTTP version
 * preference (auto / http1.1 / http2) to a concrete protocol decision, probing ALPN in `auto` mode.
 *
 * In `auto` mode, probe results are cached for a limited time so we don't need to
 * perform an extra handshake for every request to the same origin.
 */

import * as http2wrapper from 'http2-wrapper';
import type { LookupFunction } from 'node:net';
import { pickTlsFields, wrapLookup } from './tls-options';

export const HTTP_VERSION = {
  AUTO: 'auto',
  HTTP1: 'http1.1',
  HTTP2: 'http2'
} as const;

export type Resolved = {
  protocol: 'http1.1' | 'http2';
  reason: string;
  alpn?: string;
  offered?: string[];
  cached?: boolean;
};

export type HttpVersionPreference = (typeof HTTP_VERSION)[keyof typeof HTTP_VERSION];

export const canUseHttp2 = (
  preference?: HttpVersionPreference
): preference is typeof HTTP_VERSION.HTTP2 | typeof HTTP_VERSION.AUTO =>
  preference === HTTP_VERSION.HTTP2 || preference === HTTP_VERSION.AUTO;

export type ResolveHttpVersionParams = {
  url: string;
  httpVersionPreference: HttpVersionPreference;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
};

const SUPPORTED_ALPN_PROTOCOLS = ['h2', 'http/1.1'] as const;

const alpnCache = http2wrapper.auto.protocolCache;
const resolveAlpnProtocol = http2wrapper.auto.resolveProtocol;

// Must match http2-wrapper's key: `${host}:${port}:${ALPNProtocols.sort()}` (array -> comma-joined string).
const getAlpnCacheKey = (hostname: string, port: number): string =>
  `${hostname}:${port}:${[...SUPPORTED_ALPN_PROTOCOLS].sort().join(',')}`;

const getPort = (url: URL): number =>
  Number(url.port) || (url.protocol === 'https:' ? 443 : 80);

export async function resolveHttpVersion(params: ResolveHttpVersionParams): Promise<Resolved> {
  const { url, httpVersionPreference, tlsOptions, lookup } = params;

  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;
  const port = getPort(parsedUrl);

  // ALPN (and therefore HTTP/2) requires TLS. A cleartext URL is always HTTP/1.1.
  if (parsedUrl.protocol !== 'https:') {
    return {
      protocol: HTTP_VERSION.HTTP1,
      reason: 'cleartext URL; HTTP/2 requires TLS'
    };
  }

  if (httpVersionPreference === HTTP_VERSION.HTTP1) {
    return {
      protocol: HTTP_VERSION.HTTP1,
      reason: 'HTTP/1.1 selected by preference'
    };
  }

  if (httpVersionPreference === HTTP_VERSION.HTTP2) {
    return {
      protocol: HTTP_VERSION.HTTP2,
      reason: 'HTTP/2 selected by preference (TLS, h2 required)'
    };
  }

  // Auto mode: probe the server for ALPN support and cache the result.
  const isCached = alpnCache.has(getAlpnCacheKey(hostname, port));

  try {
    const { alpnProtocol: negotiatedProtocol } = await resolveAlpnProtocol({
      host: hostname,
      port,
      servername: hostname,
      ALPNProtocols: [...SUPPORTED_ALPN_PROTOCOLS],
      ...pickTlsFields(tlsOptions),
      ...(lookup ? { lookup: wrapLookup(lookup) } : {}) });

    const protocol = negotiatedProtocol === 'h2' ? HTTP_VERSION.HTTP2 : HTTP_VERSION.HTTP1;

    return {
      protocol,
      alpn: negotiatedProtocol,
      offered: [...SUPPORTED_ALPN_PROTOCOLS],
      cached: isCached,
      reason: `ALPN negotiated ${negotiatedProtocol || 'nothing'}${isCached ? ' (cached)' : ''}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      protocol: HTTP_VERSION.HTTP1,
      reason: `ALPN probe failed (${errorMessage}); using HTTP/1.1`
    };
  }
}

export const invalidateAlpn = (hostname: string, port: number): boolean =>
  alpnCache.delete(getAlpnCacheKey(hostname, port));

export const clearAlpnCache = (): void => alpnCache.clear();
