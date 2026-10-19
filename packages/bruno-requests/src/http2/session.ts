/**
 * Manage pooled HTTP/2 sessions for reuse across requests.
 */
import { type ClientHttp2Session } from 'node:http2';
import * as http2wrapper from 'http2-wrapper';
import type { LookupFunction } from 'node:net';
import { pickTlsFields, wrapLookup, withSocketGuard } from './tls-options';
import { closeAllProxyAgents } from './proxy-session';

export type AcquireH2SessionParams = {
  origin: string;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
};

export const H2_IDLE_TIMEOUT_MS = 60_000;

const SessionAgent = withSocketGuard(http2wrapper.Agent);
const agent = new SessionAgent({ timeout: H2_IDLE_TIMEOUT_MS });

type PooledAgent = {
  getSession(origin: string, options: Record<string, unknown>): Promise<ClientHttp2Session>;
};

const GOAWAY_HOOKED = Symbol('brunoGoawayHooked');
const GOAWAY_POISONED = Symbol('brunoGoawayPoisoned');

type TrackedSession = ClientHttp2Session & {
  [GOAWAY_HOOKED]?: boolean;
  [GOAWAY_POISONED]?: boolean;
};

/**
 * Attach GOAWAY handling to a freshly selected session.
 *
 * http2-wrapper's pool only skips sessions whose `destroyed` flag is set, so a session that has
 * received a GOAWAY (but isn't destroyed yet) keeps being handed to new requests, which then throw
 * "New streams cannot be created after receiving a GOAWAY". We can't destroy it synchronously in
 * the handler: a GOAWAY that refuses the in-flight stream (e.g. REFUSED_STREAM) still needs that
 * stream to deliver its own error, and a synchronous destroy swallows it and hangs the request.
 *
 * So we split the two concerns: mark the session poisoned synchronously (checked at acquire time,
 * below, so the very next request never reuses it) and defer the actual destroy to the next tick,
 * after the triggering stream has settled.
 */
function hookGoaway(session: ClientHttp2Session): ClientHttp2Session {
  const s = session as TrackedSession;
  if (s[GOAWAY_HOOKED]) {
    return session;
  }
  s[GOAWAY_HOOKED] = true;
  session.once('goaway', () => {
    s[GOAWAY_POISONED] = true;
    setImmediate(() => {
      try {
        if (!session.destroyed) {
          session.destroy();
        }
      } catch {
        /* already gone */
      }
    });
  });
  return session;
}

/**
 * Get a usable HTTP/2 session from the pool, never a GOAWAY'd one.
 * If the pool hands back a session already poisoned by a GOAWAY, destroy it (so the pool drops it)
 * and ask again; the depth guard bounds the retry.
 */
export function acquireFreshH2Session(
  poolAgent: PooledAgent,
  origin: string,
  options: Record<string, unknown>,
  depth = 0
): Promise<ClientHttp2Session> {
  return poolAgent.getSession(origin, options).then((session) => {
    const s = session as TrackedSession;
    if (s[GOAWAY_POISONED] && depth < 5) {
      try {
        if (!session.destroyed) {
          session.destroy();
        }
      } catch {
        /* already gone */
      }
      return acquireFreshH2Session(poolAgent, origin, options, depth + 1);
    }
    return hookGoaway(session);
  });
}

/** Get an existing HTTP/2 session or create a new one. */
export function acquireH2Session({ origin, tlsOptions, lookup }: AcquireH2SessionParams): Promise<ClientHttp2Session> {
  return acquireFreshH2Session(agent as unknown as PooledAgent, origin, {
    ...pickTlsFields(tlsOptions),
    ...(lookup ? { lookup: wrapLookup(lookup) } : {})
  });
}

/** Close all pooled sessions, including proxy sessions. */
export function closeAllSessions(): void {
  agent.destroy();
  closeAllProxyAgents();
}
