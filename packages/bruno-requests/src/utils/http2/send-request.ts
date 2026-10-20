import http2 from 'node:http2';
import type { LookupFunction } from 'node:net';
import { buildTlsConnectOptions } from './tls-connect-options';
import { buildHttp2RequestHeaders, parseHttp2ResponseHeaders, type Http1Headers } from './headers';

export type Http2RequestOptions = {
  method: string;
  url: string;
  headers?: Http1Headers;
  body?: string | Buffer | null;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
  timeout?: number;
};

export type Http2Response = {
  status: number;
  headers: Record<string, string | string[]>;
  data: Buffer;
  httpVersion: '2.0';
};

// send an http2 request using node's built-in http2 module. returns a promise that resolves with the response.
export const sendHttp2Request = (options: Http2RequestOptions): Promise<Http2Response> => {
  const { method, url, headers = {}, body, tlsOptions, lookup, timeout } = options;

  const parsedUrl = new URL(url);
  const port = Number(parsedUrl.port) || 443;
  const authority = `${parsedUrl.protocol}//${parsedUrl.host}`;

  return new Promise<Http2Response>((resolve, reject) => {
    const connectOptions = buildTlsConnectOptions({
      hostname: parsedUrl.hostname,
      port,
      tlsOptions,
      mode: 'http2',
      lookup
    });

    // create a new HTTP/2 session for the request.
    const session = http2.connect(authority, connectOptions);

    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      if (!session.closed && !session.destroyed) {
        session.close();
      }
    };
    const fail = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(err);
    };
    const succeed = (response: Http2Response) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(response);
    };

    const timer = timeout
      ? setTimeout(() => fail(new Error(`HTTP/2 request timed out after ${timeout} ms`)), timeout)
      : undefined;

    session.on('error', fail);
    const hasBody = body != null && body.length > 0;

    const stream = session.request(buildHttp2RequestHeaders(method, url, headers), { endStream: !hasBody });

    if (hasBody) {
      stream.end(body);
    }

    let status = 0;
    let responseHeaders: Record<string, string | string[]> = {};

    stream.on('response', (http2headers) => {
      const parsedHeaders = parseHttp2ResponseHeaders(http2headers as Record<string, string | string[] | undefined>);
      status = parsedHeaders.status;
      responseHeaders = parsedHeaders.headers;
    });

    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => succeed({ status, headers: responseHeaders, data: Buffer.concat(chunks), httpVersion: '2.0' }));

    stream.on('error', fail);

    stream.on('close', () => {
      if (settled) {
        return;
      }
      fail(new Error(`HTTP/2 stream closed before the response completed (rstCode ${stream.rstCode})`));
    });
  });
};
