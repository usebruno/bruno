/**
 * Axios transport adapter for HTTP/2.
 *
 * Uses the raw HTTP/2 stream for both requests and responses.
 * We avoid http2-wrapper's ClientRequest because its socket event makes Axios
 * call setKeepAlive(), which HTTP/2 doesn't support.
 */
import { constants, type ClientHttp2Session, type ClientHttp2Stream, type IncomingHttpHeaders } from 'node:http2';
import { buildHttp2Headers, type HeaderValue } from './headers';

const { HTTP2_HEADER_STATUS } = constants;

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

      const stream = session.request(headers);

      stream.once('response', (responseHeaders: IncomingHttpHeaders) => {
        const { [HTTP2_HEADER_STATUS]: status, ...rest } = responseHeaders;

        // Axios expects HTTP/1-style response properties, so add them to the stream.
        const response = stream as ClientHttp2Stream & {
          statusCode?: number;
          statusMessage?: string;
          headers?: IncomingHttpHeaders;
          httpVersion?: string;
          httpVersionMajor?: number;
          httpVersionMinor?: number;
        };

        response.statusCode = Number(status);
        response.statusMessage = '';
        response.headers = rest;
        response.httpVersion = '2.0';
        response.httpVersionMajor = 2;
        response.httpVersionMinor = 0;

        callback(stream);
      });

      return stream;
    }
  };
}
