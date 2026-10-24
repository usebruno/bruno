import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';
import { SocksClient } from 'socks';

const DEFAULT_PROXY_TIMEOUT_MS = 20 * 1000;

export type ConnectThroughProxyParams = {
  proxyUri: string;
  targetHost: string;
  targetPort: number;
  tlsOptions?: Record<string, unknown> | null;
  timeoutMs?: number;
};

const SOCKS_PROTOCOLS = new Set([
  'socks:',
  'socks4:',
  'socks4a:',
  'socks5:',
  'socks5h:'
]);

const basicProxyAuthHeader = (parsedProxy: URL): string | null => {
  if (!parsedProxy.username && !parsedProxy.password) {
    return null;
  }

  const username = decodeURIComponent(parsedProxy.username);
  const password = decodeURIComponent(parsedProxy.password);
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  return `Basic ${credentials}`;
};

const openSocketToProxy = (
  parsedProxy: URL,
  tlsOptions: Record<string, unknown> | null | undefined
): Promise<net.Socket> => {
  const host = parsedProxy.hostname;
  const isHttpsProxy = parsedProxy.protocol === 'https:';
  const port = Number(parsedProxy.port) || (isHttpsProxy ? 443 : 80);

  return new Promise((resolve, reject) => {
    if (isHttpsProxy) {
      const socket = tls.connect(
        { ...(tlsOptions || {}), host, port, servername: host },
        () => resolve(socket)
      );

      socket.once('error', reject);
      return;
    }

    const socket = net.connect({ host, port }, () => resolve(socket));
    socket.once('error', reject);
  });
};

/**
 * Send an HTTP CONNECT request to the proxy and wait for a successful response.
 * Any bytes received after the response headers are returned to the socket
 * so the TLS handshake can read them.
 */
const performConnect = (
  socket: net.Socket,
  targetHost: string,
  targetPort: number,
  authHeader: string | null
): Promise<net.Socket> => {
  const authority = `${targetHost}:${targetPort}`;
  const lines = [`CONNECT ${authority} HTTP/1.1`, `Host: ${authority}`];

  if (authHeader) {
    lines.push(`Proxy-Authorization: ${authHeader}`);
  }

  const request = lines.join('\r\n') + '\r\n\r\n';

  return new Promise((resolve, reject) => {
    let response = '';

    const onData = (chunk: Buffer): void => {
      response += chunk.toString('latin1');

      const headerEnd = response.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }

      socket.removeListener('data', onData);

      const statusLine = response.slice(0, response.indexOf('\r\n'));
      const statusCode = Number(statusLine.split(/\s+/)[1]);

      if (statusCode >= 200 && statusCode < 300) {
        const leftover = response.slice(headerEnd + 4);

        if (leftover.length > 0) {
          socket.unshift(Buffer.from(leftover, 'latin1'));
        }

        resolve(socket);
        return;
      }

      socket.destroy();
      reject(
        new Error(
          `Proxy CONNECT to ${authority} failed: ${statusLine.trim() || `status ${statusCode}`}`
        )
      );
    };

    socket.on('data', onData);
    socket.once('error', reject);
    socket.write(request);
  });
};

const connectThroughHttpProxy = async (
  parsedProxy: URL,
  targetHost: string,
  targetPort: number,
  tlsOptions: Record<string, unknown> | null | undefined
): Promise<net.Socket> => {
  const proxySocket = await openSocketToProxy(parsedProxy, tlsOptions);
  const authHeader = basicProxyAuthHeader(parsedProxy);

  return performConnect(proxySocket, targetHost, targetPort, authHeader);
};

const socksVersionFor = (protocol: string): 4 | 5 =>
  protocol === 'socks4:' || protocol === 'socks4a:' ? 4 : 5;

const connectThroughSocks = async (
  parsedProxy: URL,
  targetHost: string,
  targetPort: number,
  timeoutMs: number
): Promise<net.Socket> => {
  const type = socksVersionFor(parsedProxy.protocol);

  const proxy: {
    host: string;
    port: number;
    type: 4 | 5;
    userId?: string;
    password?: string;
  } = {
    host: parsedProxy.hostname,
    port: Number(parsedProxy.port) || 1080,
    type
  };

  if (parsedProxy.username) {
    proxy.userId = decodeURIComponent(parsedProxy.username);
  }

  // SOCKS4 only supports a user ID. SOCKS5 also supports passwords.
  if (type === 5 && parsedProxy.password) {
    proxy.password = decodeURIComponent(parsedProxy.password);
  }

  const { socket } = await SocksClient.createConnection({
    proxy,
    command: 'connect',
    destination: {
      host: targetHost,
      port: targetPort
    },
    timeout: timeoutMs
  });

  return socket;
};

/**
 * create a tunnel through an HTTP, HTTPS, or SOCKS proxy.
 * The returned socket is ready for the caller to do TLS and HTTP/2.
 */
export const connectThroughProxy = async (
  params: ConnectThroughProxyParams
): Promise<net.Socket> => {
  const {
    proxyUri,
    targetHost,
    targetPort,
    tlsOptions,
    timeoutMs = DEFAULT_PROXY_TIMEOUT_MS
  } = params;

  let parsedProxy: URL;

  try {
    parsedProxy = new URL(proxyUri);
  } catch {
    throw new Error(`Invalid proxy URL: ${proxyUri}`);
  }

  const protocol = parsedProxy.protocol;
  const isSocks = SOCKS_PROTOCOLS.has(protocol);

  if (protocol !== 'http:' && protocol !== 'https:' && !isSocks) {
    throw new Error(`Unsupported proxy protocol for HTTP/2: ${protocol}`);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `Proxy connection to ${parsedProxy.host} timed out after ${timeoutMs} ms`
        )
      );
    }, timeoutMs);

    timer.unref?.();
  });

  const establish = isSocks
    ? connectThroughSocks(parsedProxy, targetHost, targetPort, timeoutMs)
    : connectThroughHttpProxy(parsedProxy, targetHost, targetPort, tlsOptions);

  try {
    return await Promise.race([establish, timeout]);
  } finally {
    clearTimeout(timer);
  }
};
