import type { LookupFunction } from 'node:net';
import { acquireSession } from './session-pool';
import { buildHttp2RequestHeaders, parseHttp2ResponseHeaders, type Http1Headers } from './headers';

export type Http2RequestOptions = {
  method: string;
  url: string;
  headers?: Http1Headers;
  body?: string | Buffer | null;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
  proxyUri?: string | null;
  timeout?: number;
};

export type Http2Response = {
  status: number;
  headers: Record<string, string | string[]>;
  data: Buffer;
  httpVersion: '2.0';
};

export const sendHttp2Request = (options: Http2RequestOptions): Promise<Http2Response> => {
  const { method, url, headers = {}, body, tlsOptions, lookup, proxyUri, timeout } = options;

  return new Promise((resolve, reject) => {
    let acquiredSession;
    try {
      acquiredSession = acquireSession({ url, tlsOptions, lookup, proxyUri });
    } catch (err) {
      reject(err);
      return;
    }

    const { session, releaseStream } = acquiredSession;
    const hasBody = body !== null && body !== undefined && body.length > 0;

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      clearTimeout(timer);
      releaseStream();
    };

    const rejectRequest = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const resolveRequest = (response: Http2Response) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(response);
    };

    let stream;
    try {
      stream = session.request(
        buildHttp2RequestHeaders(method, url, headers),
        { endStream: !hasBody }
      );
    } catch (err) {
      rejectRequest(err as Error);
      return;
    }

    let status = 0;
    let responseHeaders: Record<string, string | string[]> = {};
    const chunks: Buffer[] = [];

    stream.on('response', (h2Headers) => {
      const parsed = parseHttp2ResponseHeaders(
        h2Headers as Record<string, string | string[] | undefined>
      );

      status = parsed.status;
      responseHeaders = parsed.headers;
    });

    stream.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });

    stream.on('end', () => {
      resolveRequest({
        status,
        headers: responseHeaders,
        data: Buffer.concat(chunks),
        httpVersion: '2.0'
      });
    });

    stream.on('error', rejectRequest);

    stream.on('close', () => {
      if (!settled) {
        rejectRequest(new Error(`HTTP/2 stream closed before the response completed (rstCode ${stream.rstCode})`));
      }
    });

    if (timeout) {
      timer = setTimeout(() => {
        rejectRequest(new Error(`HTTP/2 request timed out after ${timeout} ms`));
        stream.close();
      }, timeout);
    }

    if (hasBody) {
      stream.end(body);
    }
  });
};
