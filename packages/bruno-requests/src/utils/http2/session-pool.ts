import http2 from 'node:http2';
import type { LookupFunction } from 'node:net';
import type { Duplex } from 'node:stream';
import { getAgentCacheKey } from '../agent-cache';
import { buildTlsConnectOptions, pickTlsFields, type HttpVersionMode } from './connect-tls';

/**
 * HTTP/2 session pool.
 *
 * Node's `http2` module has no Agent: `http2.connect()` returns one session and leaves
 * pooling, reuse, error handling and cleanup to the caller. This module is the HTTP/2
 * counterpart of the `https.Agent` + agent cache used on the HTTP/1.1 path.
 *
 * Invariants
 *  - One session per (TLS identity + origin + mode). The key reuses the agent cache's
 *    key function, so a different client certificate, CA, or proxy route never shares a
 *    session (client identity is fixed at the TLS handshake; RFC 9113 §9.2.1 forbids
 *    renegotiation). `origin` is always part of the key, unlike the h1 agent key, because
 *    a session is bound to one origin.
 *  - Session-level errors never reach the process as uncaught exceptions.
 *  - GOAWAY moves the session to DRAINING synchronously: no new streams, in-flight
 *    streams with id <= lastStreamID may finish, the rest are reported (not retried here).
 *  - Idle means "zero active streams", not "no bytes": a quiet long-lived stream (SSE)
 *    keeps the session alive. After the last stream closes an unref'd timer closes it.
 */

/**
 * CONNECTING → ACTIVE → DRAINING → CLOSED (CONNECTING/ACTIVE may jump straight to CLOSED
 * on error). Only CONNECTING and ACTIVE sessions are handed out or accept new streams.
 */
export type SessionState = 'CONNECTING' | 'ACTIVE' | 'DRAINING' | 'CLOSED';

/** Same shape as timeline-agent.ts, so the pool can write onto a request's timeline. */
export type TimelineEntry = { timestamp: Date; type: 'info' | 'tls' | 'error'; message: string };

/** A Node-style error carrying a `code`, so callers can switch on it alongside Node's own. */
export type CodedError = Error & { code?: string };

export type AcquireSessionParams = {
  /** `https://host:port` (scheme + host + port). Never bare `host:port`. */
  origin: string;
  /** Bruno's tlsOptions object as built by setupProxyAgents(); non-TLS fields are ignored. */
  tlsOptions?: object;
  /** Only `http2` or `http2-prior-knowledge` reach the pool; `auto` is resolved before. */
  mode?: Extract<HttpVersionMode, 'http2' | 'http2-prior-knowledge'>;
  /** Bruno's custom resolver (the `*.localhost` handling). */
  lookup?: LookupFunction;
  /** Proxy route, when any. Part of the key; the socket itself comes from `createConnection`. */
  proxyUri?: string | null;
  /** Supply an already-connected socket (proxy tunnel, or a probe socket being handed off). */
  createConnection?: (authority: URL, options: http2.SecureClientSessionOptions) => Duplex;
  /** Idle timeout after the last active stream closes. 0 = close immediately. */
  idleMs?: number;
  /** Timeline of the request that triggered this acquire; connection events go here. */
  timeline?: TimelineEntry[] | null;
};

/** Read-only view of a pooled session. Open streams through `request()`, not `session.request()`. */
export type PooledSession = {
  readonly sessionKey: string;
  readonly origin: string;
  readonly session: http2.ClientHttp2Session;
  readonly state: SessionState;
  readonly activeStreams: number;
  readonly totalStreams: number;
  /** Highest stream id the peer processed, from GOAWAY; null until then. */
  readonly goawayLastStreamId: number | null;
  readonly lastError: Error | null;
  /** Open a stream. Throws synchronously if the session cannot accept new streams. */
  request(headers: http2.OutgoingHttpHeaders, options?: http2.ClientSessionRequestOptions): http2.ClientHttp2Stream;
};

/** `reused` is returned, not logged, so the caller writes the timeline line for the current request. */
export type AcquireResult = { pooled: PooledSession; reused: boolean };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * getAgentCacheKey()'s first argument is an agent class id (a per-class counter on the h1
 * path). A fixed constant here means an h2 key can never equal an h1 agent key.
 */
const HTTP2_AGENT_CLASS_ID = 0x4832; // 'H2'

/** Longer than Node's 5 s h1 free-socket timeout, shorter than browsers' minutes. */
const DEFAULT_SESSION_IDLE_MS = 30_000;

// ---------------------------------------------------------------------------
// One pooled session
// ---------------------------------------------------------------------------

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
  /** Called once when the entry leaves the reusable set; the pool removes it from the map. */
  private onRetire: (entry: SessionEntry) => void;

  constructor(sessionKey: string, origin: string, session: http2.ClientHttp2Session, idleMs: number, onRetire: (e: SessionEntry) => void) {
    this.sessionKey = sessionKey;
    this.origin = origin;
    this.session = session;
    this.idleMs = idleMs;
    this.onRetire = onRetire;

    session.once('connect', () => {
      // `error` may have fired first and moved us to CLOSED; don't resurrect.
      if (this.state === 'CONNECTING') this.state = 'ACTIVE';
      // A stream opened while CONNECTING has already ref'd the session; leave it.
      if (this.activeStreams === 0) session.unref();
    });

    session.on('error', (err) => {
      // when a session-level failure occurs, node destroys the socket and every open stream throws.
      // we keep the last Error
      this.lastError = err;
      this.retire('CLOSED');
    });

    // Peer stops accepting streams. Ids <= lastStreamID may finish; higher ids were never
    // processed and are safe to retry at a higher layer (RFC 9113 §8.7). Retiring inside
    // the event keeps the map consistent before any other code runs (no caller can pick
    // up a draining session). Node closes the session gracefully after this event on its
    // own; we only stop handing it out and record where the peer stopped.
    session.on('goaway', (_errorCode: number, lastStreamID: number) => {
      this.goawayLastStreamId = lastStreamID;
      this.retire('DRAINING');
    });

    // The session is gone: server closed an idle connection on its side, our own close(),
    // or the tail of an error/GOAWAY. retire() is idempotent, so double-firing is fine.
    session.once('close', () => this.retire('CLOSED'));
  }

  request(headers: http2.OutgoingHttpHeaders, options?: http2.ClientSessionRequestOptions): http2.ClientHttp2Stream {
    // Our state covers what our listeners have seen; Node's flags cover the instant between
    // Node changing the session and our listener running. Throw a typed error so a caller
    // holding a reference from just before GOAWAY can re-acquire instead of getting a
    // stream the server will refuse.
    if (this.state === 'DRAINING' || this.state === 'CLOSED' || this.session.destroyed || this.session.closed) {
      const err: CodedError = new Error(`HTTP/2 session to ${this.origin} is ${this.state.toLowerCase()}; acquire a new one`);
      err.code = 'ERR_H2_SESSION_UNAVAILABLE';
      throw err;
    }

    this.clearIdle();

    const stream = this.session.request(headers, options);
    // First active stream re-takes the process hold released by the `connect` listener.
    if (this.activeStreams === 0 && this.state === 'ACTIVE') this.session.ref();
    this.activeStreams++;
    this.totalStreams++;

    // `close` is the one event every stream emits — completed, errored, or locally
    // cancelled (which never emits `end`). Counting on `end` would leak on every cancel.
    stream.once('close', () => {
      this.activeStreams = Math.max(0, this.activeStreams - 1);
      if (this.activeStreams === 0) {
        this.session.unref();
        this.startIdle();
      }
    });

    return stream;
  }

  /**
   * Move out of the reusable set. Idempotent, and the listeners may fire in any order:
   * CLOSED is terminal, DRAINING is not re-entered, DRAINING → CLOSED is allowed (a
   * draining session eventually closes). The pool's onRetire removes the map entry.
   */
  retire(state: 'DRAINING' | 'CLOSED'): void {
    this.clearIdle();
    if (this.state === 'CLOSED') return;
    if (this.state === 'DRAINING' && state === 'DRAINING') return;
    this.state = state;
    this.onRetire(this);
  }

  /** Retire, then ask Node to close gracefully (open streams finish) unless it already has. */
  close(): void {
    this.retire('CLOSED');
    if (!this.session.closed && !this.session.destroyed) this.session.close();
  }

  /**
   * Idle = zero active streams, not "no bytes on the wire" (session.setTimeout() would
   * kill a quiet SSE stream). Only an ACTIVE session schedules a close; idleMs <= 0 is
   * the omit-Connection case: close as soon as the last stream ends. The timer is
   * unref'd so a pending idle close never keeps the process alive.
   */
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

// ---------------------------------------------------------------------------
// The pool
// ---------------------------------------------------------------------------

/**
 * Process-global, like `agentCache`, and deliberately shared across collections: the same
 * TLS identity to the same origin is the same connection no matter which collection sent
 * the request, and a different identity gets a different key.
 */
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

/**
 * Same TLS identity/config + same origin + same proxy route + same mode → same session.
 * The h1 agent key carries identity and route; origin is appended unconditionally (the
 * h1 key drops hostname behind a proxy and never had port), and mode keeps an
 * ALPN-negotiated session apart from a prior-knowledge one.
 */
export function getSessionKey({
  origin,
  tlsOptions = {},
  mode = 'http2',
  proxyUri = null
}: Pick<AcquireSessionParams, 'origin' | 'tlsOptions' | 'mode' | 'proxyUri'>): string {
  const { url, port } = parseOrigin(origin);
  const base = getAgentCacheKey(HTTP2_AGENT_CLASS_ID, pickTlsFields(tlsOptions) as any, proxyUri, null);
  return `${base}|${url.protocol}//${url.hostname}:${port}|${mode}`;
}

/**
 * Get the reusable session for this origin + TLS identity + mode, or create one.
 * Never returns a DRAINING or CLOSED session.
 */
export function acquireSession(params: AcquireSessionParams): AcquireResult {
  const {
    origin,
    tlsOptions = {},
    mode = 'http2',
    lookup,
    proxyUri = null,
    createConnection,
    idleMs = DEFAULT_SESSION_IDLE_MS,
    timeline
  } = params;

  const sessionKey = getSessionKey({ origin, tlsOptions, mode, proxyUri });
  const { url, hostname, port } = parseOrigin(origin);

  // Hit: retire() removes entries from the map, but checking state as well guards any
  // future path that retires without removing.
  const existing = sessions.get(sessionKey);
  if (existing && (existing.state === 'CONNECTING' || existing.state === 'ACTIVE')) {
    timeline?.push({
      timestamp: new Date(),
      type: 'info',
      message: `Reusing HTTP/2 session to ${url.host} (${existing.totalStreams} streams so far)`
    });
    return { pooled: existing, reused: true };
  }

  // Miss: https gets Bruno's TLS options; plain http is h2c prior knowledge (no TLS at all).
  const options: http2.SecureClientSessionOptions = url.protocol === 'https:'
    ? buildTlsConnectOptions({ hostname, port, tlsOptions, mode, lookup })
    : {};
  // The seam for a proxy tunnel (P2b) or a probe socket being handed off (P3).
  if (createConnection) options.createConnection = createConnection;

  timeline?.push({
    timestamp: new Date(),
    type: 'info',
    message: `Opening HTTP/2 session to ${url.host}${mode === 'http2-prior-knowledge' ? ' (prior knowledge, no ALPN)' : ''}`
  });

  const session = http2.connect(origin, options);
  const entry = new SessionEntry(sessionKey, origin, session, idleMs, (e) => {
    // Identity check: if this entry was already replaced under the same key, retiring the
    // old one must not delete the new one.
    if (sessions.get(e.sessionKey) === e) sessions.delete(e.sessionKey);
  });
  sessions.set(sessionKey, entry);
  return { pooled: entry, reused: false };
}

/** Close every pooled session. Call alongside clearAgentCache() and on app quit. */
export function closeAllSessions(): void {
  for (const entry of Array.from(sessions.values())) entry.close();
  sessions.clear();
}

export function getSessionCount(): number {
  return sessions.size;
}

/** For probes and tests. */
export function getSessionEntries(): PooledSession[] {
  return Array.from(sessions.values());
}
