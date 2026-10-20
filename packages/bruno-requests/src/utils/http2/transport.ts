import http2 from 'node:http2';
import type { LookupFunction } from 'node:net';
import { buildTlsConnectOptions } from './tls-connect-options';
import { toHttp2Headers, fromHttp2Headers, type Http1Headers } from './headers';

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

export const sendHttp2Request = (options: Http2RequestOptions): Promise<Http2Response> => {
  const { method, url, headers = {}, body, tlsOptions, lookup, timeout } = options;

  const parsed = new URL(url);
  const port = Number(parsed.port) || 443;
  const authority = `${parsed.protocol}//${parsed.host}`;

  return new Promise<Http2Response>((resolve, reject) => {
    const connectOptions = buildTlsConnectOptions({
      hostname: parsed.hostname,
      port,
      tlsOptions,
      mode: 'http2',
      lookup
    });

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

    const stream = session.request(toHttp2Headers(method, url, headers), { endStream: !hasBody });

    if (hasBody) {
      stream.end(body);
    }

    let status = 0;
    let responseHeaders: Record<string, string | string[]> = {};

    stream.on('response', (h2headers) => {
      const parsedHeaders = fromHttp2Headers(h2headers as Record<string, string | string[] | undefined>);
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
