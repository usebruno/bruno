import { EventEmitter } from 'node:events';
import net from 'node:net';
import type { TLSSocket } from 'node:tls';
import { applySecureContext } from '../agent-cache';
import { pickTlsFields, stripIpv6Brackets } from './tls-connect-options';
import type { BrunoTlsOptions } from './tls-connect-options';

const TUNNEL_TIMEOUT_MS = 10_000;

export interface ProxyAgentLike {
  connect: (request: EventEmitter, options: Record<string, unknown>) => TLSSocket | Promise<TLSSocket>;
  proxy?: {
    href?: string;
    type?: string | number;
    host?: string;
    port?: string | number;
  };
}

export const isProxyAgent = (agent: unknown): agent is ProxyAgentLike =>
  Boolean(
    agent
    && typeof (agent as ProxyAgentLike).connect === 'function'
    && (agent as ProxyAgentLike).proxy
  );

export const proxyKeyFor = (agent: unknown): string | null => {
  if (!isProxyAgent(agent)) return null;

  const proxy = agent.proxy!;

  if (typeof proxy.href === 'string') {
    return proxy.href;
  }

  return `socks${proxy.type || ''}://${proxy.host}:${proxy.port}`;
};

// Strip any `user:password@` from a proxy URI so credentials never reach the timeline or errors.
export const redactProxyUri = (uri: string | null | undefined): string | null | undefined =>
  typeof uri === 'string' ? uri.replace(/\/\/[^/@]*@/, '//***@') : uri;

export type BuildProxyTlsOptionsParams = {
  hostname: string;
  port: number;
  tlsOptions: BrunoTlsOptions & Record<string, unknown>;
  alpnProtocols?: string[];
};

// Build TLS options for the origin handshake performed inside the proxy tunnel.
export const buildProxyTlsOptions = ({
  hostname,
  port,
  tlsOptions,
  alpnProtocols
}: BuildProxyTlsOptionsParams): Record<string, unknown> => {
  const tlsOnly = pickTlsFields(tlsOptions);

  const options: Record<string, unknown> = {
    ...applySecureContext(tlsOnly as any),
    host: hostname,
    port,
    // SNI must be a hostname. Node rejects IP literals.
    ...(net.isIP(stripIpv6Brackets(hostname)) ? {} : { servername: hostname }),
    secureEndpoint: true,
    rejectUnauthorized: tlsOnly.rejectUnauthorized !== undefined ? tlsOnly.rejectUnauthorized : true
  };

  if (alpnProtocols) {
    options.ALPNProtocols = alpnProtocols;
  }

  return options;
};

export type ConnectThroughProxyParams = {
  agent: ProxyAgentLike;
  hostname: string;
  port: number;
  tlsOptions?: BrunoTlsOptions & Record<string, unknown>;
  alpnProtocols?: string[];
  timeoutMs?: number;
};

export type ProxyTunnelResult = {
  socket: TLSSocket;
  alpn: string | null;
  protocol: string | null;
  proxyStatus?: number;
};

/**
 * Open a TLS connection to the origin through the configured proxy.
 */
export const connectThroughProxy = ({
  agent,
  hostname,
  port,
  tlsOptions = {},
  alpnProtocols,
  timeoutMs = TUNNEL_TIMEOUT_MS
}: ConnectThroughProxyParams): Promise<ProxyTunnelResult> =>
  new Promise((resolve, reject) => {
    const request = new EventEmitter();
    const options = buildProxyTlsOptions({
      hostname,
      port,
      tlsOptions,
      alpnProtocols
    });

    let proxyStatus: number | undefined;
    let socket: TLSSocket | null = null;
    let settled = false;

    request.on('proxyConnect', (response: { statusCode?: number }) => {
      proxyStatus = response?.statusCode;
    });

    const fail = (error: Error) => {
      if (settled) return;

      settled = true;
      clearTimeout(timer);
      socket?.destroy();

      reject(error);
    };

    // Prevent stalled proxy connections or TLS handshakes from hanging.
    const timer = setTimeout(() => {
      const error = new Error(`proxy tunnel timed out after ${timeoutMs} ms`) as Error & { code?: string };
      error.code = 'ETIMEDOUT';
      fail(error);
    }, timeoutMs);

    const complete = () => {
      if (settled || !socket) return;

      settled = true;
      clearTimeout(timer);
      socket.removeListener('error', fail);

      resolve({
        socket,
        alpn: socket.alpnProtocol || null,
        protocol: socket.getProtocol(),
        proxyStatus
      });
    };

    const handleSocket = (connectedSocket: TLSSocket) => {
      // The tunnel already timed out or failed. close a socket that arrives late so it doesn't leak.
      if (settled) {
        connectedSocket?.destroy();
        return;
      }

      socket = connectedSocket;

      // A refused CONNECT may return a fake socket instead of throwing.
      if (!socket?.encrypted) {
        const error = new Error(
          `proxy CONNECT refused (${proxyStatus || 'no status'})`
        ) as Error & { code?: string; proxyStatus?: number };

        error.code = 'EPROXYREFUSED';
        error.proxyStatus = proxyStatus;

        fail(error);
        return;
      }

      socket.once('error', fail);

      // ALPN is available only after the TLS handshake completes.
      if (socket.alpnProtocol || socket.authorized || socket.authorizationError) {
        complete();
      } else {
        socket.once('secureConnect', complete);
      }
    };

    Promise.resolve()
      .then(() => agent.connect(request, options))
      .then(handleSocket)
      .catch(fail);
  });
