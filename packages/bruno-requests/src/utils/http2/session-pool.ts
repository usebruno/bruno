import http2 from 'node:http2';
import type { LookupFunction } from 'node:net';
import { buildTlsConnectOptions } from './tls-connect-options';
import { buildConnectionKey } from './cache-key';

const IDLE_TIMEOUT_MS = 60 * 1000;

type SessionState = 'connecting' | 'active' | 'draining';

type PooledSession = {
  session: http2.ClientHttp2Session;
  state: SessionState;
  activeStreams: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

export type AcquiredSession = {
  session: http2.ClientHttp2Session;
  releaseStream: () => void;
};

export type AcquireSessionParams = {
  url: string;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
  proxyUri?: string | null;
};

const pool = new Map<string, PooledSession>();

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

const createPooledSession = (key: string, params: AcquireSessionParams): PooledSession => {
  const parsed = new URL(params.url);
  const port = Number(parsed.port) || 443;
  const authority = `${parsed.protocol}//${parsed.host}`;
  const connectOptions = buildTlsConnectOptions({
    hostname: parsed.hostname,
    port,
    tlsOptions: params.tlsOptions,
    mode: 'http2',
    lookup: params.lookup
  });

  const session = http2.connect(authority, connectOptions);
  const pooledSession: PooledSession = { session, state: 'connecting', activeStreams: 0, idleTimer: null };

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
 * Get an HTTP/2 session, reusing an existing one or creating a new one.
 * releaseStream() frees the stream slot and starts the idle timer when no streams remain.
 */
export const acquireSession = (params: AcquireSessionParams): AcquiredSession => {
  const parsed = new URL(params.url);
  const port = Number(parsed.port) || 443;
  const origin = `${parsed.hostname}:${port}`;
  const key = buildConnectionKey(origin, params.tlsOptions || {}, params.proxyUri);

  let pooledSession = pool.get(key);

  // create a new session if none exists or the existing one is no longer reusable (closed/destroyed).
  if (!pooledSession || !isReusable(pooledSession.session)) {
    pooledSession = createPooledSession(key, params);
    pool.set(key, pooledSession);
  }

  pooledSession.activeStreams += 1;
  clearIdleTimer(pooledSession);

  let released = false;
  const releaseStream = (): void => {
    if (released) return;
    released = true;

    pooledSession.activeStreams = Math.max(0, pooledSession.activeStreams - 1);

    // Keep the session open while other streams are active.
    if (pooledSession.activeStreams > 0) return;

    // Close a draining session once all streams have finished.
    if (pooledSession.state === 'draining') {
      if (isReusable(pooledSession.session)) {
        pooledSession.session.close();
      }
      return;
    }

    startIdleTimer(key, pooledSession);
  };

  return { session: pooledSession.session, releaseStream };
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
