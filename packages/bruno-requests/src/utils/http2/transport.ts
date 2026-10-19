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

// RST_STREAM error codes -> names, for a readable error when a stream is reset before responding.
const RST_CODE_NAMES: Record<number, string> = {
  0: 'NO_ERROR',
  1: 'PROTOCOL_ERROR',
  2: 'INTERNAL_ERROR',
  3: 'FLOW_CONTROL_ERROR',
  4: 'SETTINGS_TIMEOUT',
  5: 'STREAM_CLOSED',
  6: 'FRAME_SIZE_ERROR',
  7: 'REFUSED_STREAM',
  8: 'CANCEL',
  9: 'COMPRESSION_ERROR',
  10: 'CONNECT_ERROR',
  11: 'ENHANCE_YOUR_CALM',
  12: 'INADEQUATE_SECURITY',
  13: 'HTTP_1_1_REQUIRED'
};

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
      // Bracket an IPv6 literal so the origin is a valid URL ("https://[::1]:8443", not
      // "https://::1:8443" which throws Invalid URL). parseOrigin / connect-tls strip the brackets
      // back off for the actual TLS connect and the cert's IP-SAN check.
      const rawHost = options.hostname;
      const host = rawHost.includes(':') && !rawHost.startsWith('[') ? `[${rawHost}]` : rawHost;
      const origin = `${options.protocol}//${host}:${port}`;
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
      // endStream:false keeps the writable side open so a body can be written for ANY method; Node
      // auto-closes it for GET/DELETE otherwise, making axios' body write throw write-after-end.
      const stream = pooled.request(headers, { endStream: false });

      // Node does NOT emit 'error' for an RST_STREAM(CANCEL) / RST_STREAM(NO_ERROR) received before
      // response headers — it just emits 'close'. Without a 'response' or an 'error', axios never
      // settles and the request hangs. Track settlement and, on a close before any response, surface
      // an error so axios rejects. Codes that do emit 'error' (REFUSED_STREAM, INTERNAL_ERROR, ...)
      // settle through that path and the close guard is a no-op.
      let settled = false;
      stream.once('error', () => {
        settled = true;
      });
      stream.once('close', () => {
        if (settled) return;
        settled = true;
        const code = (stream as http2.ClientHttp2Stream & { rstCode?: number }).rstCode ?? 0;
        const name = RST_CODE_NAMES[code] ?? String(code);
        const err = Object.assign(
          new Error(`HTTP/2 stream closed before a response was received (RST_STREAM ${name})`),
          { code: 'ERR_HTTP2_STREAM_CLOSED_EARLY', rstCode: code }
        );
        stream.emit('error', err);
      });

      stream.once('response', (responseHeaders: http2.IncomingHttpHeaders) => {
        settled = true;
        const status = responseHeaders[http2.constants.HTTP2_HEADER_STATUS];
        const responseObj = stream as http2.ClientHttp2Stream & {
          headers: http2.IncomingHttpHeaders;
          statusCode: number;
        };
        const cleaned: http2.IncomingHttpHeaders = { ...responseHeaders };
        delete cleaned[http2.constants.HTTP2_HEADER_STATUS];
        responseObj.headers = cleaned;
        responseObj.statusCode = Number(status);
        // Mirror HTTP/1.1 ClientRequest fields so res.getUrl() (protocol + '//' + host + path) works
        // on h2 instead of reading 'undefined//undefinedundefined'.
        const reqLike = responseObj as http2.ClientHttp2Stream & {
          protocol?: string;
          host?: string;
          path?: string;
        };
        reqLike.protocol = options.protocol;
        reqLike.host = options.hostname;
        reqLike.path = options.path;
        cb(responseObj);
      });

      return stream;
    }
  };
}
