/**
 * axios transport (`config.transport`) that sends the request over Bruno's own HTTP/2
 * session pool instead of axios's built-in HTTP/2.
 *
 * axios honours `config.transport` only when `httpVersion` is unset (lib/adapters/http.js:
 * `if (isHttp2) { … } else if (config.transport)`), so the interceptor sets `config.transport`
 * and leaves `httpVersion` alone — the mirror of the native path. axios calls
 * `transport.request(options, cb)`, writes the body to the returned stream and ends it, and
 * consumes the object passed to `cb(res)` as the readable response. Returning the
 * ClientHttp2Stream for both (as axios's own http2Transport does) means every downstream axios
 * behaviour — decompression, streaming, timeout via setTimeout, cancellation via destroy —
 * works unchanged.
 */
import http2 from 'node:http2';
import type { LookupFunction } from 'node:net';
import type { Duplex } from 'node:stream';
import { acquireSession } from './session-pool';
import { buildHttp2RequestHeaders } from './headers';
import type { HttpVersionMode, BrunoTlsOptions } from './connect-tls';
import type { TimelineEntry } from './session-pool';

export type CreateHttp2TransportParams = {
  /** Bruno's tlsOptions (as built by setupProxyAgents); non-TLS fields are ignored by the pool. */
  tlsOptions?: object;
  /** Only `http2` (https) or `http2-prior-knowledge` (h2c) reach the pool; `auto` is resolved before. */
  mode?: Extract<HttpVersionMode, 'http2' | 'http2-prior-knowledge'>;
  /** Bruno's custom DNS resolver (the *.localhost handling), forwarded to the TLS connect. */
  lookup?: LookupFunction;
  /** Proxy route, when any — part of the pool key so proxied and direct sessions never cross. */
  proxyUri?: string | null;
  /**
   * A ready connected socket for the first session to this origin (a proxy tunnel opened by the
   * interceptor). Consumed once; the pool reuses the resulting session for later requests.
   */
  socket?: Duplex | null;
  /** Idle timeout after the last active stream closes; forwarded to the pool. */
  idleMs?: number;
  /** The current request's timeline; connection/reuse lines are written onto it. */
  timeline?: TimelineEntry[] | null;
};

/** Minimal shape of the axios options object this transport reads. */
type AxiosTransportOptions = {
  protocol: string; // 'https:' | 'http:'
  hostname: string;
  port?: number | string;
  method?: string;
  path?: string; // pathname + search, as axios builds it
  headers?: Record<string, unknown>;
};

type ResponseCallback = (res: http2.ClientHttp2Stream) => void;

export function createHttp2Transport(params: CreateHttp2TransportParams) {
  const { tlsOptions, mode = 'http2', lookup, proxyUri = null, idleMs, timeline } = params;

  // The handed-off tunnel socket is single-use: only the first acquire for this origin dials.
  // Later requests reuse the pooled session and never call createConnection.
  let pendingSocket = params.socket || null;
  const createConnection = pendingSocket
    ? () => {
        const s = pendingSocket as Duplex;
        pendingSocket = null;
        return s;
      }
    : undefined;

  return {
    request(options: AxiosTransportOptions, cb: ResponseCallback): http2.ClientHttp2Stream {
      const port = Number(options.port) || (options.protocol === 'https:' ? 443 : 80);
      const origin = `${options.protocol}//${options.hostname}:${port}`;
      const url = `${origin}${options.path || '/'}`;

      const { headers } = buildHttp2RequestHeaders({
        method: options.method || 'GET',
        url,
        headers: options.headers
      });

      const { pooled } = acquireSession({
        origin,
        tlsOptions: tlsOptions as BrunoTlsOptions,
        mode,
        lookup,
        proxyUri,
        createConnection,
        idleMs,
        timeline
      });

      // Throws ERR_H2_SESSION_UNAVAILABLE if the session went away between acquire and here;
      // axios's req 'error' handler rejects the request, same as any connection failure.
      const stream = pooled.request(headers);

      stream.once('response', (responseHeaders: http2.IncomingHttpHeaders) => {
        const status = responseHeaders[http2.constants.HTTP2_HEADER_STATUS];
        const responseObj = stream as http2.ClientHttp2Stream & {
          headers: http2.IncomingHttpHeaders;
          statusCode: number;
        };
        const cleaned: http2.IncomingHttpHeaders = { ...responseHeaders };
        delete cleaned[http2.constants.HTTP2_HEADER_STATUS];
        responseObj.headers = cleaned;
        responseObj.statusCode = Number(status);
        cb(responseObj);
      });

      return stream;
    }
  };
}
