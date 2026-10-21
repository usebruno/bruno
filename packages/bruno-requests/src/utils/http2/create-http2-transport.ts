import http from 'node:http';
import http2 from 'node:http2';
import type { LookupFunction } from 'node:net';
import type { Duplex } from 'node:stream';
import { acquireSession, type TimelineEntry } from './session-pool';
import { buildHttp2RequestHeaders } from './headers';
import type { BrunoTlsOptions } from './tls-connect-options';

/**
 * Custom HTTP/2 transport for Axios.
 *
 * Uses our session pool instead of Axios's built-in HTTP/2 transport.
 * The HTTP version is selected before the request, so config.httpVersion
 * must remain unset for Axios to use config.transport.
 */

export type CreateHttp2TransportParams = {
  tlsOptions?: object;
  lookup?: LookupFunction;
  proxyUri?: string | null;
  /** Connected socket to use for the first session, such as a proxy tunnel. */
  socket?: Duplex | null;
  /** Time to keep a session open after its last stream closes. */
  idleMs?: number;
  timeline?: TimelineEntry[] | null;
};

type AxiosTransportOptions = {
  protocol: string;
  hostname: string;
  port?: number | string;
  method?: string;
  path?: string;
  headers?: Record<string, unknown>;
};

type Http2ResponseStream = http2.ClientHttp2Stream & {
  headers: http2.IncomingHttpHeaders;
  statusCode: number;
  statusMessage: string;
  httpVersion: string;
  httpVersionMajor: number;
  httpVersionMinor: number;
  protocol: string;
  host?: string;
  path?: string;
};

type ResponseCallback = (response: Http2ResponseStream) => void;

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

/**
 * Add the response fields Axios expects from an HTTP/1.1 IncomingMessage.
 */
const prepareHttp2Response = (
  stream: http2.ClientHttp2Stream,
  responseHeaders: http2.IncomingHttpHeaders,
  options: AxiosTransportOptions
): Http2ResponseStream => {
  const status = Number(responseHeaders[http2.constants.HTTP2_HEADER_STATUS]);

  const headers = { ...responseHeaders };
  delete headers[http2.constants.HTTP2_HEADER_STATUS];

  const response = stream as Http2ResponseStream;

  response.headers = headers;
  response.statusCode = status;
  response.statusMessage = http.STATUS_CODES[status] || '';
  response.httpVersion = '2.0';
  response.httpVersionMajor = 2;
  response.httpVersionMinor = 0;
  response.protocol = options.protocol;
  response.host = options.hostname;
  response.path = options.path;

  return response;
};

/**
 * Handle streams that close before receiving response headers.
 *
 * Some stream resets emit 'close' without an error. Convert these
 * into errors so Axios doesn't wait indefinitely for a response.
 */
const handleStreamEvents = (
  stream: http2.ClientHttp2Stream,
  options: AxiosTransportOptions,
  onResponse: ResponseCallback
): void => {
  let settled = false;

  stream.once('error', () => {
    settled = true;
  });

  stream.once('response', (headers) => {
    settled = true;
    onResponse(prepareHttp2Response(stream, headers, options));
  });

  stream.once('close', () => {
    if (settled) return;

    settled = true;

    const resetCode = stream.rstCode ?? 0;
    const error = Object.assign(
      new Error(
        `HTTP/2 stream closed before a response (RST_STREAM ${RST_CODE_NAMES[resetCode] ?? String(resetCode)})`
      ),
      {
        code: 'ERR_HTTP2_STREAM_CLOSED_EARLY',
        rstCode: resetCode
      }
    );

    stream.emit('error', error);
  });
};

/**
 * Create an Axios-compatible transport backed by the HTTP/2 session pool.
 */
export function createHttp2Transport(params: CreateHttp2TransportParams) {
  const {
    tlsOptions,
    lookup,
    proxyUri = null,
    idleMs,
    timeline
  } = params;

  // A handed-off socket can only be used when creating the first session.
  let pendingSocket = params.socket || null;

  const createConnection = pendingSocket
    ? () => {
        const socket = pendingSocket as Duplex;
        pendingSocket = null;
        return socket;
      }
    : undefined;

  return {
    request(
      options: AxiosTransportOptions,
      onResponse: ResponseCallback
    ): http2.ClientHttp2Stream {
      const port = Number(options.port) || (options.protocol === 'https:' ? 443 : 80);
      const origin = `${options.protocol}//${options.hostname}:${port}`;
      const url = `${origin}${options.path || '/'}`;

      const { headers } = buildHttp2RequestHeaders({
        method: options.method || 'GET',
        url,
        headers: options.headers
      });

      const { pooled, reused } = acquireSession({
        origin,
        tlsOptions: tlsOptions as BrunoTlsOptions,
        lookup,
        proxyUri,
        createConnection,
        idleMs,
        timeline
      });

      // If the pool reused a session, the handed-off tunnel/probe socket is never consumed by
      // createConnection, destroy it so it doesn't leak.
      if (reused && pendingSocket) {
        pendingSocket.destroy();
        pendingSocket = null;
      }

      // Keep the writable side open so Axios can send a body with any method.
      const stream = pooled.request(headers, { endStream: false });

      handleStreamEvents(stream, options, onResponse);

      return stream;
    }
  };
}
