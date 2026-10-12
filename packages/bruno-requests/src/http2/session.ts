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

/** Get an existing HTTP/2 session or create a new one. */
export function acquireH2Session({ origin, tlsOptions, lookup }: AcquireH2SessionParams): Promise<ClientHttp2Session> {
  return agent.getSession(origin, {
    ...pickTlsFields(tlsOptions),
    ...(lookup ? { lookup: wrapLookup(lookup) } : {})
  });
}

/** Close all pooled sessions, including proxy sessions. */
export function closeAllSessions(): void {
  agent.destroy();
  closeAllProxyAgents();
}
