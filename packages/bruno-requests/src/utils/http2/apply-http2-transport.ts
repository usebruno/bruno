import { URL } from 'node:url';
import type { Duplex } from 'node:stream';
import type { LookupFunction } from 'node:net';
import { createHttp2Transport } from './create-http2-transport';
import { negotiateHttpVersion, canUseHttp2 } from './negotiate-http-version';
import { hasLiveSession, type TimelineEntry } from './session-pool';
import { proxyKeyFor, redactProxyUri, connectThroughProxy } from './proxy-tunnel';
import type { HttpVersionMode } from './tls-connect-options';

export type Http2TransportConfig = {
  url?: string;
  auth?: { username?: string; password?: string } | null;
  headers?: Record<string, unknown> & { set?: (name: string, value: unknown) => void };
  httpsAgent?: { options?: Record<string, unknown> } | null;
  // Proxy agent for cleartext requests (http://). Used only to detect a configured proxy.
  httpAgent?: unknown;
  lookup?: LookupFunction;
  transport?: unknown;
};

export type ApplyHttp2TransportParams = {
  config: Http2TransportConfig;
  mode: HttpVersionMode | undefined;
  agentOptions?: Record<string, unknown>;
  timeline?: TimelineEntry[] | null;
};

/** The resolved HTTP version plus the metadata the timeline reports. */
type HttpVersionSelection = {
  httpVersion: number;
  socket: Duplex | null;
  reason?: string;
  offered?: string[];
  alpn?: string | null;
};

/**
 * Convert axios's auth configuration into a Basic Authorization header.
 *
 * Axios normally sets this on its HTTP/1.1 ClientRequest, but the HTTP/2
 * transport bypasses that path, so the header has to be built explicitly.
 */
export const applyBasicAuthHeader = (config: Http2TransportConfig): boolean => {
  if (!config) return false;

  let username: string | undefined;
  let password = '';

  if (config.auth && typeof config.auth === 'object') {
    username = config.auth.username || '';
    password = config.auth.password || '';
  } else if (typeof config.url === 'string') {
    try {
      const url = new URL(config.url);

      if (url.username || url.password) {
        username = decodeURIComponent(url.username);
        password = decodeURIComponent(url.password);

        url.username = '';
        url.password = '';
        config.url = url.toString();
      }
    } catch {
      return false;
    }
  }

  if (username === undefined) return false;

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  const authorization = `Basic ${credentials}`;
  if (typeof config.headers?.set === 'function') {
    config.headers.set('Authorization', authorization);
  } else {
    config.headers = {
      ...config.headers,
      Authorization: authorization
    };
  }
  delete config.auth;
  return true;
};

const negotiateHttp2ThroughProxy = async ({
  url,
  config,
  mode,
  tlsOptions,
  proxyKey
}: {
  url: URL;
  config: Http2TransportConfig;
  mode: HttpVersionMode;
  tlsOptions: Record<string, unknown>;
  proxyKey: string;
}): Promise<HttpVersionSelection> => {
  const port = Number(url.port) || 443;
  const origin = `${url.protocol}//${url.hostname}:${port}`;
  const safeProxy = redactProxyUri(proxyKey);
  const offered = mode === 'auto' ? ['h2', 'http/1.1'] : ['h2'];

  // A pooled session already proved the proxy speaks h2; skip a wasteful tunnel.
  if (hasLiveSession({ origin, tlsOptions, proxyUri: proxyKey } as any)) {
    return { httpVersion: 2, socket: null, reason: `reusing pooled HTTP/2 session via ${safeProxy}`, alpn: null };
  }

  try {
    const tunnel = await connectThroughProxy({
      agent: config.httpsAgent as any,
      hostname: url.hostname,
      port,
      tlsOptions,
      alpnProtocols: offered
    });

    const alpn = tunnel.alpn || null;

    if (alpn === 'h2') {
      return {
        httpVersion: 2,
        socket: tunnel.socket,
        reason: `proxy tunnel via ${safeProxy}: server chose h2 (${tunnel.protocol})`,
        offered,
        alpn
      };
    }

    // Server declined h2 over the tunnel, drop the socket and use HTTP/1.1.
    tunnel.socket.destroy();
    return {
      httpVersion: 1,
      socket: null,
      reason: `proxy tunnel via ${safeProxy}: server chose ${alpn || 'none'}; using HTTP/1.1`,
      offered,
      alpn
    };
  } catch (error) {
    // In forced http2 mode a tunnel failure is fatal; in auto it falls back.
    if (mode === 'http2') throw error;
    return {
      httpVersion: 1,
      socket: null,
      reason: `proxy tunnel via ${safeProxy} failed (${(error as Error).message}); using HTTP/1.1`,
      offered,
      alpn: null
    };
  }
};

const selectHttpVersion = async ({
  url,
  config,
  mode,
  tlsOptions,
  proxyKey
}: {
  url: URL | null;
  config: Http2TransportConfig;
  mode: HttpVersionMode;
  tlsOptions: Record<string, unknown>;
  proxyKey: string | null;
}): Promise<HttpVersionSelection> => {
  const isProxiedHttps = proxyKey && url?.protocol === 'https:';

  if (isProxiedHttps && url) {
    return negotiateHttp2ThroughProxy({ url, config, mode, tlsOptions, proxyKey: proxyKey as string });
  }

  const decision = await negotiateHttpVersion({
    url: config.url as string,
    mode,
    tlsOptions,
    lookup: config.lookup,
    proxyUri: proxyKey
  });

  return { ...decision, socket: null };
};

const logHttpVersionDecision = (timeline: TimelineEntry[], decision: HttpVersionSelection): void => {
  const { httpVersion, reason, offered, alpn } = decision;

  if (offered?.length) {
    timeline.push({
      timestamp: new Date(),
      type: 'tls',
      message: `ALPN: offered ${offered.join(', ')} · server accepted ${alpn || 'none'}`
    });
  }

  timeline.push({
    timestamp: new Date(),
    type: 'info',
    message: `HTTP/${httpVersion === 2 ? '2' : '1.1'} selected${reason ? ` (${reason})` : ''}`
  });
};

/**
 * Negotiate the HTTP version and attach the custom transport when HTTP/2 is selected.
 */
export const applyHttp2Transport = async ({
  config,
  mode,
  agentOptions,
  timeline
}: ApplyHttp2TransportParams): Promise<void> => {
  // Remove any transport left over from a previous redirect.
  delete config.transport;

  if (!canUseHttp2(mode)) return;

  let url: URL | null = null;
  try {
    url = new URL(config.url || '');
  } catch {
    url = null;
  }

  // h2c through a proxy tunnel isn't supported: the tunnel path does a TLS handshake, which a
  // cleartext origin has no counterpart for.
  const isCleartext = url?.protocol === 'http:';
  if (isCleartext && (proxyKeyFor(config.httpsAgent) || proxyKeyFor(config.httpAgent))) {
    timeline?.push({
      timestamp: new Date(),
      type: 'info',
      message: 'HTTP/1.1 selected (cleartext request through a proxy; h2c tunnelling is not supported)'
    });
    return;
  }

  const tlsOptions = agentOptions ?? config.httpsAgent?.options ?? {};
  const proxyKey = proxyKeyFor(config.httpsAgent);

  const decision = await selectHttpVersion({ url, config, mode: mode as HttpVersionMode, tlsOptions, proxyKey });

  if (timeline) logHttpVersionDecision(timeline, decision);

  if (decision.httpVersion !== 2) return;

  config.transport = createHttp2Transport({
    tlsOptions,
    // When tunnelling, DNS/connect happens on the proxy side; skip the custom lookup.
    lookup: proxyKey ? undefined : config.lookup,
    proxyUri: proxyKey,
    socket: decision.socket,
    timeline
  }) as unknown;

  if (applyBasicAuthHeader(config) && timeline) {
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: 'HTTP/2: Authorization header built from auth option / URL credentials (axios drops these on h2)'
    });
  }
};
