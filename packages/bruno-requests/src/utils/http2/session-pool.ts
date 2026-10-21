import http2 from 'node:http2';
import tls from 'node:tls';
import type { LookupFunction } from 'node:net';
import { buildTlsConnectOptions } from './tls-connect-options';
import { buildConnectionKey } from './cache-key';
import { connectThroughProxy } from './http2-proxy';

const IDLE_TIMEOUT_MS = 60 * 1000;
// Node's default (128) rejects large response header lists with ENHANCE_YOUR_CALM.
// raise it.
const MAX_HEADER_LIST_PAIRS = 512;

type SessionState = 'connecting' | 'active' | 'draining';

type PooledSession = {
  session: http2.ClientHttp2Session;
  state: SessionState;
  activeStreams: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
  serverSettingsReceived: Promise<void>;
  connectionError?: Error;
};

export type AcquiredSession = {
  session: http2.ClientHttp2Session;
  releaseStream: () => void;
  serverSettingsReceived: Promise<void>;
  getConnectionError: () => Error | undefined;
};

export type AcquireSessionParams = {
  url: string;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
  proxyUri?: string | null;
};

const pool = new Map<string, PooledSession>();

// track the sessions currently being opened, so that concurrent requests to the same origin share the same connection attempt.
const connecting = new Map<string, Promise<PooledSession>>();

// skip only sessions Node has already closed/destroyed.
const isReusable = (session: http2.ClientHttp2Session): boolean => !session.closed && !session.destroyed;

const clearIdleTimer = (pooledSession: PooledSession): void => {
  if (pooledSession.idleTimer) {
    clearTimeout(pooledSession.idleTimer);
    pooledSession.idleTimer = null;
  }
};

const startIdleTimer = (key: string, pooledSession: PooledSession): void => {
  clearIdleTimer(pooledSession);
  pooledSession.idleTimer = setTimeout(() => {
    if (pooledSession.activeStreams === 0 && pool.get(key) === pooledSession) {
      pool.delete(key);
      if (isReusable(pooledSession.session)) {
        pooledSession.session.close();
      }
    }
  }, IDLE_TIMEOUT_MS);
  // pooled but idle session must not keep the process alive.
  pooledSession.idleTimer.unref?.();
};

// GOAWAY: the server is draining. Stop handing streams to this session and close it
// once its in-flight streams finish (or immediately if it is already idle).
const drainSession = (key: string, pooledSession: PooledSession): void => {
  pooledSession.state = 'draining';
  clearIdleTimer(pooledSession);
  if (pool.get(key) === pooledSession) {
    pool.delete(key);
  }
  if (pooledSession.activeStreams === 0 && isReusable(pooledSession.session)) {
    pooledSession.session.close();
  }
};

/**
 * Create an HTTP/2 session, connecting directly or through a proxy tunnel.
 * Proxied connections establish TLS to the origin over the tunnel.
 */
const connectHttp2Session = async (params: AcquireSessionParams): Promise<http2.ClientHttp2Session> => {
  const parsedUrl = new URL(params.url);
  const port = Number(parsedUrl.port) || 443;
  const authority = `${parsedUrl.protocol}//${parsedUrl.host}`;

  const connectOptions = buildTlsConnectOptions({
    hostname: parsedUrl.hostname,
    port,
    tlsOptions: params.tlsOptions,
    mode: 'http2',
    lookup: params.lookup
  });

  if (!params.proxyUri) {
    return http2.connect(authority, {
      ...connectOptions,
      maxHeaderListPairs: MAX_HEADER_LIST_PAIRS
    });
  }

  const tunnel = await connectThroughProxy({
    proxyUri: params.proxyUri,
    targetHost: parsedUrl.hostname,
    targetPort: port,
    tlsOptions: params.tlsOptions
  });

  // Use the proxy tunnel for TLS while keeping the origin's TLS settings.
  const originTlsSocket = tls.connect({
    ...connectOptions,
    socket: tunnel
  } as tls.ConnectionOptions);

  originTlsSocket.once('error', () => tunnel.destroy());

  return http2.connect(authority, {
    createConnection: () => originTlsSocket,
    maxHeaderListPairs: MAX_HEADER_LIST_PAIRS
  });
};

const createPooledSession = async (key: string, params: AcquireSessionParams): Promise<PooledSession> => {
  const session = await connectHttp2Session(params);

  // Wait for the server's SETTINGS, but also unblock if the session fails or closes.
  const serverSettingsReceived = new Promise<void>((resolve) => {
    const finishWaiting = (): void => resolve();
    session.once('remoteSettings', finishWaiting);
    session.once('error', finishWaiting);
    session.once('close', finishWaiting);
  });

  const pooledSession: PooledSession = { session, state: 'connecting', activeStreams: 0, idleTimer: null, serverSettingsReceived };

  session.once('error', (err: Error) => {
    pooledSession.connectionError = err;
  });

  session.once('connect', () => {
    pooledSession.state = 'active';
  });

  const removeSessionFromPool = (): void => {
    clearIdleTimer(pooledSession);
    if (pool.get(key) === pooledSession) {
      pool.delete(key);
    }
  };
  session.once('close', removeSessionFromPool);
  session.once('error', removeSessionFromPool);
  session.once('goaway', () => {
    drainSession(key, pooledSession);
  });

  return pooledSession;
};

/**
 * Reuse an existing HTTP/2 session or create a new one.
 * releaseStream() tracks active streams and handles idle sessions.
 */
export const acquireSession = async (params: AcquireSessionParams): Promise<AcquiredSession> => {
  const parsedUrl = new URL(params.url);
  const port = Number(parsedUrl.port) || 443;
  const origin = `${parsedUrl.hostname}:${port}`;
  const connectionKey = buildConnectionKey(origin, params.tlsOptions || {}, params.proxyUri);

  let pooledSession = pool.get(connectionKey);

  if (!pooledSession || !isReusable(pooledSession.session)) {
    let pendingSession = connecting.get(connectionKey);

    // Share the same connection attempt across concurrent requests.
    if (!pendingSession) {
      pendingSession = createPooledSession(connectionKey, params)
        .then((createdSession) => {
          pool.set(connectionKey, createdSession);
          return createdSession;
        })
        .finally(() => {
          connecting.delete(connectionKey);
        });

      connecting.set(connectionKey, pendingSession);
    }

    pooledSession = await pendingSession;
  }

  pooledSession.activeStreams += 1;
  clearIdleTimer(pooledSession);

  let released = false;

  const releaseStream = (): void => {
    if (released) return;
    released = true;

    pooledSession.activeStreams = Math.max(0, pooledSession.activeStreams - 1);

    if (pooledSession.activeStreams > 0) {
      return;
    }

    // Close draining sessions; otherwise start the idle timer.
    if (pooledSession.state === 'draining') {
      if (isReusable(pooledSession.session)) {
        pooledSession.session.close();
      }
      return;
    }

    startIdleTimer(connectionKey, pooledSession);
  };

  return {
    session: pooledSession.session,
    releaseStream,
    serverSettingsReceived: pooledSession.serverSettingsReceived,
    getConnectionError: () => pooledSession.connectionError
  };
};

// Close every pooled session and empty the pool (shutdown / preference change).
export const closeAllSessions = (): void => {
  for (const [key, pooledSession] of pool) {
    clearIdleTimer(pooledSession);
    if (isReusable(pooledSession.session)) {
      pooledSession.session.close();
    }
    pool.delete(key);
  }
};

export const __poolSize = (): number => pool.size;
