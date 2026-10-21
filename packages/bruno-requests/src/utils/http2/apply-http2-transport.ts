import { URL } from 'node:url';
import type { Duplex } from 'node:stream';
import type { LookupFunction } from 'node:net';
import { createHttp2Transport } from './create-http2-transport';
import { negotiateHttpVersion, canUseHttp2 } from './negotiate-http-version';
import { hasLiveSession } from './session-pool';
import { proxyKeyFor, connectThroughProxy } from './proxy-tunnel';
import type { HttpVersionMode } from './tls-connect-options';

/**
 * The slice of an axios request config this helper reads and mutates. Kept loose
 * so both the CLI runner and the scripted-request path can pass their configs in.
 */
export type Http2TransportConfig = {
  url?: string;
  auth?: { username?: string; password?: string } | null;
  headers?: Record<string, unknown> & { set?: (name: string, value: unknown) => void };
  httpsAgent?: { options?: Record<string, unknown> } | null;
  lookup?: LookupFunction;
  transport?: unknown;
};

export type ApplyHttp2TransportParams = {
  config: Http2TransportConfig;
  mode: HttpVersionMode | undefined;
};

type HttpVersionSelection = { httpVersion: number; socket: Duplex | null };

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

/**
 * Negotiate HTTP/2 through a proxy CONNECT (or SOCKS) tunnel.
 *
 * Reuses the connected socket when the server selects HTTP/2; otherwise closes
 * it and lets axios fall back to HTTP/1.1 over the proxy.
 */
const negotiateHttp2ThroughProxy = async ({
  config,
  mode,
  tlsOptions,
  proxyKey
}: {
  config: Http2TransportConfig;
  mode: HttpVersionMode;
  tlsOptions: Record<string, unknown>;
  proxyKey: string;
}): Promise<HttpVersionSelection> => {
  const url = new URL(config.url as string);
  const port = Number(url.port) || 443;
  const origin = `${url.protocol}//${url.hostname}:${port}`;
  const offered = mode === 'auto' ? ['h2', 'http/1.1'] : ['h2'];

  // A pooled session already proved the proxy speaks h2; skip a wasteful tunnel.
  if (hasLiveSession({ origin, tlsOptions, proxyUri: proxyKey } as any)) {
    return { httpVersion: 2, socket: null };
  }

  try {
    const tunnel = await connectThroughProxy({
      agent: config.httpsAgent as any,
      hostname: url.hostname,
      port,
      tlsOptions,
      alpnProtocols: offered
    });

    if ((tunnel.alpn || null) === 'h2') {
      return { httpVersion: 2, socket: tunnel.socket };
    }

    // Server declined h2 over the tunnel; drop the socket and use HTTP/1.1.
    tunnel.socket.destroy();
    return { httpVersion: 1, socket: null };
  } catch (error) {
    // In forced http2 mode a tunnel failure is fatal; in auto it falls back.
    if (mode === 'http2') throw error;
    return { httpVersion: 1, socket: null };
  }
};

/**
 * Select the HTTP version for a direct or proxied connection.
 */
const selectHttpVersion = async ({
  config,
  mode,
  tlsOptions,
  proxyKey
}: {
  config: Http2TransportConfig;
  mode: HttpVersionMode;
  tlsOptions: Record<string, unknown>;
  proxyKey: string | null;
}): Promise<HttpVersionSelection> => {
  const isProxiedHttps = proxyKey && /^https:/i.test(config.url || '');

  if (isProxiedHttps) {
    return negotiateHttp2ThroughProxy({ config, mode, tlsOptions, proxyKey: proxyKey as string });
  }

  const decision = await negotiateHttpVersion({
    url: config.url as string,
    mode,
    tlsOptions,
    lookup: config.lookup,
    proxyUri: proxyKey
  });

  return { httpVersion: decision.httpVersion, socket: null };
};

/**
 * Negotiate the HTTP version and attach the custom transport when HTTP/2 is selected.
 *
 * Direct connections negotiate via ALPN (or h2c prior knowledge for cleartext);
 * proxied HTTPS connections negotiate through the proxy tunnel and reuse the
 * connected socket. Shared by the CLI runner and the scripted-request path.
 */
export const applyHttp2Transport = async ({ config, mode }: ApplyHttp2TransportParams): Promise<void> => {
  // Remove any transport left over from a previous redirect.
  delete config.transport;

  if (!canUseHttp2(mode)) return;

  const tlsOptions = config.httpsAgent?.options || {};
  const proxyKey = proxyKeyFor(config.httpsAgent);

  const decision = await selectHttpVersion({ config, mode: mode as HttpVersionMode, tlsOptions, proxyKey });

  if (decision.httpVersion !== 2) return;

  config.transport = createHttp2Transport({
    tlsOptions,
    // When tunnelling, DNS/connect happens on the proxy side; skip the custom lookup.
    lookup: proxyKey ? undefined : config.lookup,
    proxyUri: proxyKey,
    socket: decision.socket
  }) as unknown;

  applyBasicAuthHeader(config);
};
