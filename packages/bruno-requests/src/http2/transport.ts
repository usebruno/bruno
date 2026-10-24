/**
 * Axios transport adapter for HTTP/2.
 *
 * Uses the raw HTTP/2 stream for both requests and responses.
 * We avoid http2-wrapper's ClientRequest because its socket event makes Axios
 * call setKeepAlive(), which HTTP/2 doesn't support.
 */
import { constants, type ClientHttp2Session, type ClientHttp2Stream, type IncomingHttpHeaders } from 'node:http2';
import { STATUS_CODES } from 'node:http';
import { buildHttp2Headers, type HeaderValue } from './headers';

const { HTTP2_HEADER_STATUS } = constants;

// RST_STREAM error codes → names, for a readable message when a stream is reset before responding.
const RST_CODE_NAMES: Record<number, string> = {
  0: 'NO_ERROR', 1: 'PROTOCOL_ERROR', 2: 'INTERNAL_ERROR', 3: 'FLOW_CONTROL_ERROR',
  4: 'SETTINGS_TIMEOUT', 5: 'STREAM_CLOSED', 6: 'FRAME_SIZE_ERROR', 7: 'REFUSED_STREAM',
  8: 'CANCEL', 9: 'COMPRESSION_ERROR', 10: 'CONNECT_ERROR', 11: 'ENHANCE_YOUR_CALM',
  12: 'INADEQUATE_SECURITY', 13: 'HTTP_1_1_REQUIRED'
};

export type Http2TransportRequestOptions = {
  method?: string;
  protocol?: string;
  hostname?: string;
  port?: number | string;
  path?: string;
  headers?: Record<string, HeaderValue>;
  auth?: string;
};

export type Http2Transport = {
  request: (options: Http2TransportRequestOptions, callback: (response: ClientHttp2Stream) => void) => ClientHttp2Stream;
};

// Wrap IPv6 addresses in brackets when building the URL.
const toUrl = (options: Http2TransportRequestOptions): string => {
  const protocol = options.protocol || 'https:';
  const rawHost = options.hostname || 'localhost';
  const host = rawHost.includes(':') && !rawHost.startsWith('[') ? `[${rawHost}]` : rawHost;
  const authority = options.port ? `${host}:${options.port}` : host;
  return `${protocol}//${authority}${options.path || '/'}`;
};

/**
 * Create an Axios transport using an existing HTTP/2 session.
 * Each request gets its own stream.
 */
export function createHttp2Transport({ session }: { session: ClientHttp2Session }): Http2Transport {
  return {
    request(options, callback) {
      const headers = buildHttp2Headers({
        method: options.method || 'GET',
        url: toUrl(options),
        headers: options.headers
      });

      // Axios passes Basic auth through options.auth instead of the Authorization header.
      if (options.auth && headers.authorization === undefined && headers[':authorization'] === undefined) {
        headers.authorization = `Basic ${Buffer.from(options.auth).toString('base64')}`;
      }

      // Keep the writable side open (endStream:false) so a body can be written for ANY method.
      // Node auto-closes it for GET/DELETE when endStream is unset, which makes axios' body write
      // throw ERR_STREAM_WRITE_AFTER_END; axios always calls end(), so bodyless requests still close.
      const stream = session.request(headers, { endStream: false });

      // Track settlement so a stream that closes before a response surfaces an error instead of
      // hanging. Node does NOT emit 'error' for an RST_STREAM(CANCEL)/RST_STREAM(NO_ERROR) received
      // before headers (it just emits 'close'), so without this the request never settles.
      let settled = false;
      stream.once('error', () => { settled = true; });
      stream.once('close', () => {
        if (settled) return;
        settled = true;
        const code = (stream as ClientHttp2Stream & { rstCode?: number }).rstCode ?? 0;
        const name = RST_CODE_NAMES[code] ?? String(code);
        const err = Object.assign(
          new Error(`HTTP/2 stream closed before a response was received (RST_STREAM ${name})`),
          { code: 'ERR_HTTP2_STREAM_CLOSED_EARLY', rstCode: code }
        );
        stream.emit('error', err);
      });

      stream.once('response', (responseHeaders: IncomingHttpHeaders) => {
        settled = true;
        const { [HTTP2_HEADER_STATUS]: status, ...rest } = responseHeaders;

        // Axios expects HTTP/1-style response properties, so add them to the stream.
        const response = stream as ClientHttp2Stream & {
          statusCode?: number;
          statusMessage?: string;
          headers?: IncomingHttpHeaders;
          httpVersion?: string;
          httpVersionMajor?: number;
          httpVersionMinor?: number;
          protocol?: string;
          host?: string;
          path?: string;
        };

        const statusCode = Number(status);
        response.statusCode = statusCode;
        // HTTP/2 has no reason phrase on the wire; fill the standard one from the status code
        // so res.getStatusText() and axios' statusText behave like HTTP/1.1.
        response.statusMessage = STATUS_CODES[statusCode] || '';
        response.headers = rest;
        response.httpVersion = '2.0';
        response.httpVersionMajor = 2;
        response.httpVersionMinor = 0;
        // Mirror the HTTP/1.1 ClientRequest fields so res.getUrl() (protocol + '//' + host + path)
        // works on h2; without these it reads 'undefined//undefinedundefined'.
        response.protocol = options.protocol || 'https:';
        response.host = options.hostname;
        response.path = options.path;

        callback(stream);
      });

      return stream;
    }
  };
}
