/**
 * SOCKS5 → node:http2 bridge.
 *
 * Node's `http2` module has no Agent API: `http2.connect()` dials directly (or via
 * `createConnection`). Bruno's HTTP/1.1 path uses `SocksProxyAgent` from
 * `socks-proxy-agent`; that agent only runs when Node asks it for a socket. For HTTP/2
 * we call `agent.connect()` ourselves, wait for TLS+ALPN, then hand the socket to
 * `http2.connect` through `createConnection`.
 */

import { EventEmitter } from 'node:events';
import type { Duplex } from 'node:stream';
import type { TLSSocket } from 'node:tls';
import crypto from 'node:crypto';
import type { SocksProxyAgent } from 'socks-proxy-agent';
import { applySecureContext } from '../agent-cache';

/** Process-lifetime key so credential fingerprints stay opaque in session keys / timelines. */
const credentialFingerprintKey = crypto.randomBytes(32);

const DEFAULT_TUNNEL_TIMEOUT_MS = 10_000;

/** Agent-only / non-TLS fields that must not reach `tls.connect`. */
const NON_TLS_OPTION_KEYS = ['keepAlive', 'proxy', 'caCertificatesCount', 'lookup'] as const;

export type SocksProxyLike = {
  host: string;
  port: number;
  type: number;
  userId?: string;
  password?: string;
};

export type Socks5Http2Agent = {
  connect: (req: EventEmitter, opts: Record<string, unknown>) => Promise<Duplex> | Duplex;
  proxy: SocksProxyLike;
};

export function isSocksProxyAgent(agent: unknown): agent is Socks5Http2Agent {
  if (!agent || typeof agent !== 'object') return false;
  const candidate = agent as Partial<Socks5Http2Agent>;
  const proxy = candidate.proxy;
  return (
    typeof candidate.connect === 'function' &&
    Boolean(proxy) &&
    typeof proxy?.host === 'string' &&
    typeof proxy?.port === 'number' &&
    typeof proxy?.type === 'number'
  );
}

/**
 * Stable identity for a SOCKS agent. Includes an opaque credential fingerprint so two
 * proxies on the same host:port with different user/pass never share an HTTP/2 session,
 * without putting the password into timeline text.
 */
export function socks5ProxyKeyFor(agent: Socks5Http2Agent | SocksProxyAgent): string {
  const proxy = (agent as Socks5Http2Agent).proxy;
  const userId = proxy.userId ?? '';
  const password = proxy.password ?? '';
  const credentialKey =
    userId || password
      ? `#${crypto
          .createHmac('sha256', credentialFingerprintKey)
          .update(`${userId}:${password}`)
          .digest('hex')
          .slice(0, 16)}`
      : '';
  return `socks${proxy.type}://${proxy.host}:${proxy.port}${credentialKey}`;
}

export type ConnectSocks5ForHttp2Params = {
  agent: Socks5Http2Agent | SocksProxyAgent;
  hostname: string;
  port?: number;
  /** Same tlsOptions shape `setupProxyAgents()` builds for the h1 path. */
  tlsOptions?: Record<string, unknown>;
  /** ALPN offer for the origin TLS handshake (e.g. `['h2']` or `['h2', 'http/1.1']`). */
  alpnProtocols?: string[];
  timeoutMs?: number;
};

export type ConnectSocks5ForHttp2Result = {
  socket: TLSSocket;
  alpn: string | null;
  protocol: string | null;
};

/**
 * Open a SOCKS5 tunnel to `hostname:port`, upgrade it to TLS (with optional ALPN), and
 * return the encrypted socket ready for `http2.connect({ createConnection })`.
 */
export function connectSocks5ForHttp2({
  agent,
  hostname,
  port = 443,
  tlsOptions = {},
  alpnProtocols,
  timeoutMs = DEFAULT_TUNNEL_TIMEOUT_MS
}: ConnectSocks5ForHttp2Params): Promise<ConnectSocks5ForHttp2Result> {
  if (!isSocksProxyAgent(agent)) {
    return Promise.reject(Object.assign(new Error('connectSocks5ForHttp2: agent is not a SocksProxyAgent'), { code: 'ERR_BRUNO_NOT_SOCKS_AGENT' }));
  }

  return new Promise((resolve, reject) => {
    const tlsOnly: Record<string, unknown> = { ...tlsOptions };
    for (const key of NON_TLS_OPTION_KEYS) {
      delete tlsOnly[key];
    }

    const req = new EventEmitter();
    const opts: Record<string, unknown> = {
      ...(applySecureContext(tlsOnly as any) as Record<string, unknown>),
      host: hostname,
      port,
      servername: hostname,
      secureEndpoint: true,
      rejectUnauthorized: tlsOnly.rejectUnauthorized !== false
    };
    if (alpnProtocols) opts.ALPNProtocols = alpnProtocols;

    let settled = false;
    let socket: Duplex | null = null;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (socket) socket.destroy();
      reject(err);
    };

    const timer = setTimeout(() => {
      fail(Object.assign(new Error(`SOCKS5 http2 tunnel timed out after ${timeoutMs} ms`), { code: 'ETIMEDOUT' }));
    }, timeoutMs);

    Promise.resolve()
      .then(() => agent.connect(req, opts))
      .then((connected) => {
        socket = connected;
        const tlsSocket = connected as TLSSocket;
        if (!tlsSocket || typeof tlsSocket !== 'object' || !('encrypted' in tlsSocket) || !tlsSocket.encrypted) {
          return fail(Object.assign(new Error('SOCKS5 http2 tunnel did not return a TLS socket'), { code: 'EPROXYREFUSED' }));
        }

        const done = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          tlsSocket.removeListener('error', fail);
          resolve({
            socket: tlsSocket,
            alpn: typeof tlsSocket.alpnProtocol === 'string' ? tlsSocket.alpnProtocol : null,
            protocol: typeof tlsSocket.getProtocol === 'function' ? tlsSocket.getProtocol() : null
          });
        };

        tlsSocket.once('error', fail);
        // socks-proxy-agent resolves when tls.connect() returns, before the handshake finishes.
        if (tlsSocket.alpnProtocol || tlsSocket.authorized || tlsSocket.authorizationError) done();
        else tlsSocket.once('secureConnect', done);
      })
      .catch(fail);
  });
}

/**
 * One-shot `createConnection` for `http2.connect`. Consumes the tunnel socket on the first
 * call; later calls throw so a reused factory cannot silently dial direct.
 */
export function createHttp2CreateConnection(socket: Duplex): () => Duplex {
  let pending: Duplex | null = socket;
  return () => {
    const next = pending;
    pending = null;
    if (!next || next.destroyed) {
      throw Object.assign(new Error('SOCKS5 http2 tunnel socket already consumed or destroyed'), {
        code: 'ERR_BRUNO_H2_NO_TUNNEL'
      });
    }
    return next;
  };
}
