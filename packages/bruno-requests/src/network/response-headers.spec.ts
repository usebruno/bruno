import http from 'node:http';
import zlib from 'node:zlib';
import { AddressInfo } from 'node:net';
import { makeAxiosInstance } from './axios-instance';
import { restoreContentEncodingHeader } from './response-headers';

const responseWith = (headers: Record<string, unknown>, rawHeaders?: string[]) => ({
  headers,
  request: { res: rawHeaders ? { rawHeaders } : undefined }
});

describe('restoreContentEncodingHeader', () => {
  it('restores the header axios deleted after decompressing', () => {
    const response = responseWith({ 'content-type': 'application/json' }, ['Content-Type', 'application/json', 'Content-Encoding', 'gzip']);
    restoreContentEncodingHeader(response);
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('keeps a content-encoding value that is still present', () => {
    const response = responseWith({ 'content-encoding': 'identity' }, ['Content-Encoding', 'gzip']);
    restoreContentEncodingHeader(response);
    expect(response.headers['content-encoding']).toBe('identity');
  });

  it('does not add the header when the server did not send it', () => {
    const response = responseWith({}, ['Content-Type', 'text/plain']);
    restoreContentEncodingHeader(response);
    expect(response.headers).not.toHaveProperty('content-encoding');
  });

  it('does nothing when the raw response is not available', () => {
    const response = responseWith({});
    restoreContentEncodingHeader(response);
    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(() => restoreContentEncodingHeader(undefined)).not.toThrow();
  });
});

describe('makeAxiosInstance: content-encoding response header (GitHub #8233)', () => {
  const withGzipServer = async (status: number, run: (url: string) => Promise<void>) => {
    const server = http.createServer((_req, res) => {
      const body = zlib.gzipSync(JSON.stringify({ ok: true }));
      res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Content-Length': body.length });
      res.end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };

  it('keeps content-encoding after axios decompresses the body', async () => {
    await withGzipServer(200, async (url) => {
      const response = await makeAxiosInstance()({ url, method: 'get' });
      expect(response.data).toEqual({ ok: true });
      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });

  it('keeps content-encoding on an error response', async () => {
    await withGzipServer(404, async (url) => {
      const error = await makeAxiosInstance()({ url, method: 'get' }).catch((err) => err);
      expect(error.response.status).toBe(404);
      expect(error.response.headers['content-encoding']).toBe('gzip');
    });
  });
});
