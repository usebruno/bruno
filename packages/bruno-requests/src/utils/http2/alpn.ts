/**
 * Axios doesn't automatically fall back to HTTP/1.1 when a server doesn't support HTTP/2.
 * It only supports prior-knowledge HTTP/2, so a request to an h1-only server will fail the handshake.
 *
 * So, instead we probe the server first (via a TLS handshake) to see if it supports HTTP/2, and cache
 * the result per origin + TLS identity.
 */
import tls from 'node:tls';
import type { LookupFunction } from 'node:net';
import { buildTlsConnectOptions, type HttpVersionMode } from './tls-connect-options';
import { buildConnectionKey } from './cache-key';
import { connectThroughProxy } from './http2-proxy';

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const PROBE_TIMEOUT_MS = 10 * 1000;

type CacheEntry = { acceptedAlpnProtocol: string | null; expiresAt: number };
const alpnCache = new Map<string, CacheEntry>();

export type NegotiationResult = { acceptedAlpnProtocol: string | null; protocol?: string; error?: string };

/** One TLS handshake offering both protocols. resolves to the negotiated ALPN. */

export function negotiateHttpVersion(params: {
  hostname: string;
  port: number;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
  proxyUri?: string | null;
}): Promise<NegotiationResult> {
  return new Promise((resolve) => {
    const options = buildTlsConnectOptions({
      hostname: params.hostname,
      port: params.port,
      tlsOptions: params.tlsOptions,
      mode: 'auto',
      lookup: params.lookup
    });

    let settled = false;
    let socket: tls.TLSSocket | undefined;

    const finish = (result: NegotiationResult) => {
      if (settled) return;

      settled = true;
      clearTimeout(timer);
      socket?.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        acceptedAlpnProtocol: null,
        error: `ALPN probe timed out after ${PROBE_TIMEOUT_MS} ms`
      });
    }, PROBE_TIMEOUT_MS);

    const onSecureConnect = (connectedSocket: tls.TLSSocket) => {
      finish({
        acceptedAlpnProtocol: connectedSocket.alpnProtocol || null,
        protocol: connectedSocket.getProtocol() || undefined
      });
    };

    const onError = (error: Error) => {
      finish({
        acceptedAlpnProtocol: null,
        error: error.message
      });
    };

    // proxy connection needs a tunnel before the TLS handshake.
    if (params.proxyUri) {
      connectThroughProxy({
        proxyUri: params.proxyUri,
        targetHost: params.hostname,
        targetPort: params.port,
        tlsOptions: params.tlsOptions
      })
        .then((tunnel) => {
          if (settled) {
            tunnel.destroy();
            return;
          }

          socket = tls.connect({
            ...options,
            socket: tunnel
          } as tls.ConnectionOptions);

          socket.once('secureConnect', () => onSecureConnect(socket as tls.TLSSocket));
          socket.once('error', onError);
        })
        .catch(onError);

      return;
    }

    // Connect directly when no proxy is configured.
    socket = tls.connect(options);
    socket.once('secureConnect', () => onSecureConnect(socket as tls.TLSSocket));
    socket.once('error', onError);
  });
}

export type ResolveHttpVersionViaAlpnParams = {
  url: string;
  mode: HttpVersionMode;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
  proxyUri?: string | null;
  ttlMs?: number;
};

export type Resolved = { httpVersion: 1 | 2; reason: string; offered?: string[]; acceptedAlpnProtocol?: string | null };

export async function resolveHttpVersionViaAlpn(params: ResolveHttpVersionViaAlpnParams): Promise<Resolved> {
  const { url, mode, tlsOptions = {}, lookup, proxyUri, ttlMs = DEFAULT_TTL_MS } = params;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return { httpVersion: 1, reason: 'unparseable URL' };
  }

  if (parsedUrl.protocol !== 'https:') {
    return { httpVersion: 1, reason: 'cleartext URL (h2c not supported)' };
  }

  if (mode === 'http1.1') {
    return { httpVersion: 1, reason: 'mode http1.1' };
  }

  if (mode === 'http2') {
    return { httpVersion: 2, reason: 'mode http2' };
  }

  // In auto mode, we will do ALPN .
  const port = Number(parsedUrl.port) || 443;
  const origin = `${parsedUrl.hostname}:${port}`;
  const cacheKey = buildConnectionKey(origin, tlsOptions || {}, proxyUri);

  const cached = alpnCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return {
      httpVersion: cached.acceptedAlpnProtocol === 'h2' ? 2 : 1,
      reason: 'auto (cached)',
      offered: ['h2', 'http/1.1'],
      acceptedAlpnProtocol: cached.acceptedAlpnProtocol
    };
  }

  // No valid cached result. Connect and check which protocol the server accepts.
  const negotiated = await negotiateHttpVersion({
    hostname: parsedUrl.hostname,
    port,
    tlsOptions,
    lookup,
    proxyUri
  });

  if (negotiated.error) {
    return {
      httpVersion: 1,
      reason: `ALPN negotiation failed (${negotiated.error}); using HTTP/1.1`
    };
  }

  // Cache the negotiated protocol so future requests can skip the ALPN probe.
  alpnCache.set(cacheKey, {
    acceptedAlpnProtocol: negotiated.acceptedAlpnProtocol,
    expiresAt: Date.now() + ttlMs
  });

  return {
    httpVersion: negotiated.acceptedAlpnProtocol === 'h2' ? 2 : 1,
    reason: `auto (${negotiated.protocol || 'negotiated'})`,
    offered: ['h2', 'http/1.1'],
    acceptedAlpnProtocol: negotiated.acceptedAlpnProtocol
  };
}

export const invalidateAlpn = (origin: string): void => {
  for (const key of alpnCache.keys()) if (key.startsWith(`${origin}|`)) alpnCache.delete(key);
};
export const clearAlpnCache = (): void => alpnCache.clear();
