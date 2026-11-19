/**
 * HTTP/2 session pool.
 *
 * Node's `http2` module has no Agent: `http2.connect()` returns one session and leaves
 * pooling, reuse, error handling and cleanup to us.
 */

import http2 from 'node:http2';
import { HttpVersionMode } from '@usebruno/common';
import type { LookupFunction } from 'node:net';
import type { Duplex } from 'node:stream';
import { getAgentCacheKey } from '../agent-cache';
import { buildTlsConnectOptions, pickTlsFields } from './tls-connect-options';

export type SessionState = 'CONNECTING' | 'ACTIVE' | 'DRAINING' | 'CLOSED';

export type TimelineEntry = { timestamp: Date; type: 'info' | 'tls' | 'error'; message: string };

export type CodedError = Error & { code?: string };

export type AcquireSessionParams = {
  origin: string;
  tlsOptions?: object;
  lookup?: LookupFunction;
  proxyUri?: string | null;
  createConnection?: (authority: URL, options: http2.SecureClientSessionOptions) => Duplex;
  idleMs?: number;
  timeline?: TimelineEntry[] | null;
};

export type PooledSession = {
  readonly sessionKey: string;
  readonly origin: string;
  readonly session: http2.ClientHttp2Session;
  readonly state: SessionState;
  readonly activeStreams: number;
  readonly totalStreams: number;
  readonly goawayLastStreamId: number | null;
  readonly lastError: Error | null;
  request(headers: http2.OutgoingHttpHeaders, options?: http2.ClientSessionRequestOptions): http2.ClientHttp2Stream;
};

export type AcquireResult = { pooled: PooledSession; reused: boolean };

// Fixed agent-class id for getAgentCacheKey,
const HTTP2_AGENT_CLASS_ID = 0x4832; // 'H2'

const DEFAULT_SESSION_IDLE_MS = 30_000;

// Node accepts only 128 response header pairs by default
const MAX_HEADER_LIST_PAIRS = 512;

/**
 * A secureContext contains TLS credentials that can't be used directly
 * in a cache key. Assign each context a unique ID to prevent sessions
 * with different TLS identities from being reused.
 */
const secureContextIds = new WeakMap<object, number>();
let nextSecureContextId = 0;
const secureContextToken = (secureContext: unknown): string => {
  if (!secureContext || typeof secureContext !== 'object') return '';
  let id = secureContextIds.get(secureContext as object);
  if (id === undefined) {
    id = ++nextSecureContextId;
    secureContextIds.set(secureContext as object, id);
  }
  return `sc${id}`;
};

class SessionEntry implements PooledSession {
  readonly sessionKey: string;
  readonly origin: string;
  readonly session: http2.ClientHttp2Session;
  state: SessionState = 'CONNECTING';
  activeStreams = 0;
  totalStreams = 0;
  goawayLastStreamId: number | null = null;
  lastError: Error | null = null;

  private idleMs: number;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private onRemoveFromPool: (entry: SessionEntry) => void;

  constructor(sessionKey: string, origin: string, session: http2.ClientHttp2Session, idleMs: number, onRemoveFromPool: (e: SessionEntry) => void) {
    this.sessionKey = sessionKey;
    this.origin = origin;
    this.session = session;
    this.idleMs = idleMs;
    this.onRemoveFromPool = onRemoveFromPool;

    session.once('connect', () => {
      if (this.state === 'CONNECTING') this.state = 'ACTIVE';
      // stop the open socket from keeping the process alive on its own (the CLI
      // would hang after finishing otherwise). A later stream re-refs the session in request().
      if (this.activeStreams === 0) session.unref();
    });

    session.on('error', (err) => {
      this.lastError = err;
      this.removeFromPool('CLOSED');
    });

    // mark the session as draining so no new streams are created, but let existing streams finish.
    session.on('goaway', (_errorCode: number, lastStreamID: number) => {
      this.goawayLastStreamId = lastStreamID;
      this.removeFromPool('DRAINING');
    });

    session.once('close', () => this.removeFromPool('CLOSED'));
  }

  // Open a new stream on the session.
  request(headers: http2.OutgoingHttpHeaders, options?: http2.ClientSessionRequestOptions): http2.ClientHttp2Stream {
    this.clearIdle();

    // open a new stream on the session.
    const stream = this.session.request(headers, options);

    if (this.activeStreams === 0 && this.state === 'ACTIVE') {
      this.session.ref();
    }
    this.activeStreams++;
    this.totalStreams++;

    stream.once('close', () => {
      this.activeStreams = Math.max(0, this.activeStreams - 1);
      if (this.activeStreams === 0) {
        this.session.unref();
        this.startIdle();
      }
    });

    return stream;
  }

  removeFromPool(state: 'DRAINING' | 'CLOSED'): void {
    this.clearIdle();
    if (this.state === 'CLOSED') return;
    if (this.state === 'DRAINING' && state === 'DRAINING') return;
    this.state = state;
    this.onRemoveFromPool(this);
  }

  // Remove from the pool, then ask Node to close gracefully (open streams finish) unless it already has
  close(): void {
    this.removeFromPool('CLOSED');
    if (!this.session.closed && !this.session.destroyed) {
      this.session.close();
    }
  }

  private startIdle(): void {
    this.clearIdle();
    if (this.state !== 'ACTIVE') return;
    if (this.idleMs <= 0) {
      this.close();
      return;
    }
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.activeStreams === 0) this.close();
    }, this.idleMs);
    this.idleTimer.unref();
  }

  private clearIdle(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}

const sessions = new Map<string, SessionEntry>();

function parseOrigin(origin: string): { url: URL; hostname: string; port: number } {
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError(`acquireSession: origin must be https:// or http://, got '${origin}'`);
  }
  // Normalise so `https://host` and `https://host:443` share a key.
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  return { url, hostname: url.hostname, port };
}

export function getSessionKey({
  origin,
  tlsOptions = {},
  proxyUri = null
}: Pick<AcquireSessionParams, 'origin' | 'tlsOptions' | 'proxyUri'>): string {
  const { url, port } = parseOrigin(origin);
  const picked = pickTlsFields(tlsOptions);
  const base = getAgentCacheKey(HTTP2_AGENT_CLASS_ID, picked as any, proxyUri, null);
  // The scheme is in the origin, so an http:// (h2c) session and an https:// (h2) session to the
  // same host:port never share a key.
  return `${base}|${url.protocol}//${url.hostname}:${port}|${secureContextToken((picked as any).secureContext)}`;
}

/**
 * Get the reusable session for this origin + TLS identity, or create one.
 * Never returns a DRAINING or CLOSED session.
 */
const isUsable = (entry: SessionEntry): boolean =>
  (entry.state === 'CONNECTING' || entry.state === 'ACTIVE')
  && !entry.session.destroyed
  && !entry.session.closed;

export function acquireSession(params: AcquireSessionParams): AcquireResult {
  const {
    origin,
    tlsOptions = {},
    lookup,
    proxyUri = null,
    createConnection,
    idleMs = DEFAULT_SESSION_IDLE_MS,
    timeline
  } = params;

  const sessionKey = getSessionKey({ origin, tlsOptions, proxyUri });
  const { url, hostname, port } = parseOrigin(origin);

  const existing = sessions.get(sessionKey);
  if (existing && isUsable(existing)) {
    timeline?.push({
      timestamp: new Date(),
      type: 'info',
      message: `Reusing HTTP/2 session to ${url.host} (${existing.totalStreams} streams so far)`
    });
    return { pooled: existing, reused: true };
  }

  // A pooled entry that is no longer usable (its Node session died)
  // is dropped here so we open a fresh session instead of reusing a dead one.
  if (existing) {
    sessions.delete(sessionKey);
  }

  // Proxied HTTP/2 connections must use a tunnel. If the pooled session is gone
  // and no tunnel socket is available, fail rather than connect directly and
  // risk sending credentials outside the proxy.
  if (proxyUri && !createConnection) {
    const error: CodedError = new Error(
      `HTTP/2 session to ${url.host} via proxy is unavailable (pooled session was lost); refusing to bypass the proxy`
    );

    error.code = 'ERR_H2_PROXY_SESSION_UNAVAILABLE';
    throw error;
  }

  const options: http2.SecureClientSessionOptions = url.protocol === 'https:'
    ? buildTlsConnectOptions({ hostname, port, tlsOptions, mode: HttpVersionMode.Http2, lookup })
    : {};

  // tell node to use an existing socket from a proxy tunnel
  // instead of opening a new connection.
  if (createConnection) {
    options.createConnection = createConnection;
  }

  timeline?.push({
    timestamp: new Date(),
    type: 'info',
    message: `Opening HTTP/2 session to ${url.host}${url.protocol === 'http:' ? ' (prior knowledge, no ALPN)' : ''}`
  });

  const session = http2.connect(origin, { ...options, maxHeaderListPairs: MAX_HEADER_LIST_PAIRS });
  const entry = new SessionEntry(sessionKey, origin, session, idleMs, (removed) => {
    // GOAWAY retires the session, and close triggers this again.
    // Only remove this session if it hasn't been replaced by a newer one.
    if (sessions.get(removed.sessionKey) === removed) {
      sessions.delete(removed.sessionKey);
    }
  });

  sessions.set(sessionKey, entry);
  return { pooled: entry, reused: false };
}

export function closeAllSessions(): void {
  for (const entry of Array.from(sessions.values())) entry.close();
  sessions.clear();
}

export function hasLiveSession(
  params: Pick<AcquireSessionParams, 'origin' | 'tlsOptions' | 'proxyUri'>
): boolean {
  const existing = sessions.get(getSessionKey(params));
  return !!existing && isUsable(existing);
}

export function getSessionCount(): number {
  return sessions.size;
}

export function getSessionEntries(): PooledSession[] {
  return Array.from(sessions.values());
}
