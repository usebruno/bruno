import type { LookupFunction } from 'node:net';
import type { ClientHttp2Stream } from 'node:http2';
import type { Readable } from 'node:stream';
import { acquireSession } from './session-pool';
import { buildHttp2RequestHeaders, parseHttp2ResponseHeaders, type Http1Headers } from './headers';
import { rstCodeLabel } from './rst-codes';

export type Http2RequestOptions = {
  method: string;
  url: string;
  headers?: Http1Headers;
  body?: string | Buffer | Readable | null;
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
    let acquired;
    try {
      acquired = acquireSession({ url, tlsOptions, lookup, proxyUri });
    } catch (err) {
      reject(err);
      return;
    }

    const { session, releaseStream, serverSettingsReceived } = acquired;
    const isStreamBody = body !== null && body !== undefined && typeof (body as Readable).pipe === 'function';
    const hasBufferBody
      = !isStreamBody && body !== null && body !== undefined && (body as string | Buffer).length > 0;
    const hasBody = isStreamBody || hasBufferBody;

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stream: ClientHttp2Stream | undefined;

    const cleanup = () => {
      clearTimeout(timer);
      // Stop reading a request body stream (e.g. a file upload) if we bailed early.
      if (isStreamBody) {
        (body as Readable).destroy?.();
      }
      releaseStream();
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = (response: Http2Response) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(response);
    };

    // Start the timeout up-front so a session that never becomes ready still fails.
    if (timeout) {
      timer = setTimeout(() => {
        fail(new Error(`HTTP/2 request timed out after ${timeout} ms`));
        stream?.close();
      }, timeout);
    }

    // Wait for the server's SETTINGS before creating streams to avoid
    // requests being refused before the concurrency limit is known.
    serverSettingsReceived.then(() => {
      if (settled) {
        return;
      }

      try {
        stream = session.request(buildHttp2RequestHeaders(method, url, headers), { endStream: !hasBody });
      } catch (err) {
        fail(err as Error);
        return;
      }

      let status = 0;
      let responseHeaders: Record<string, string | string[]> = {};
      const chunks: Buffer[] = [];

      stream.on('response', (h2Headers) => {
        const parsed = parseHttp2ResponseHeaders(h2Headers as Record<string, string | string[] | undefined>);
        status = parsed.status;
        responseHeaders = parsed.headers;
      });

      stream.on('data', (chunk: Buffer) => {
        chunks.push(Buffer.from(chunk));
      });

      stream.on('end', () => {
        succeed({ status, headers: responseHeaders, data: Buffer.concat(chunks), httpVersion: '2.0' });
      });

      stream.on('error', fail);

      stream.on('close', () => {
        if (!settled) {
          const code = stream ? rstCodeLabel(stream.rstCode) : 'unknown';
          fail(new Error(`HTTP/2 stream closed before the response completed (${code})`));
        }
      });

      // Send the request body: pipe a stream (e.g. multipart/FormData or a file
      // upload), or write a string/Buffer.
      if (isStreamBody) {
        (body as Readable).on('error', fail);
        (body as Readable).pipe(stream);
      } else if (hasBufferBody) {
        stream.end(body as string | Buffer);
      }
    });
  });
};
