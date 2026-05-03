import http from 'node:http';
import { fastLookup } from './fast-lookup';

/**
 * Shared agent configuration for HTTP/HTTPS agents across the application.
 *
 * - keepAlive: Reuse TCP connections to avoid repeated handshakes.
 * - maxSockets: 100 concurrent sockets per host — high enough for parallel
 *   collection runs, low enough to avoid file-descriptor exhaustion.
 * - maxFreeSockets: 10 idle sockets kept alive for reuse between bursts.
 * - scheduling: 'fifo' distributes requests across connections evenly,
 *   which avoids head-of-line blocking that 'lifo' (Node's default) can
 *   cause when one connection stalls.
 * - lookup: fastLookup uses async c-ares (dns.resolve4/6) to bypass the
 *   libuv thread pool bottleneck, falling back to dns.lookup for /etc/hosts
 *   and mDNS hostnames.
 */
export const defaultAgentOptions: http.AgentOptions = {
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  scheduling: 'fifo',
  lookup: fastLookup as http.AgentOptions['lookup']
};
