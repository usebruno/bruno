import http2 from 'node:http2';
import https from 'node:https';
import tls from 'node:tls';
import type { AddressInfo } from 'node:net';
import { key, cert } from './certs';

export type TestServer = {
  /** e.g. https://localhost:54321 */
  url: string;
  port: number;
  server: http2.Http2SecureServer | https.Server;
  /** Shut the server down; awaited so a spec leaves no open handles. */
  close: () => Promise<void>;
};

export type ClientResponse = {
  status: number;
  headers: Record<string, unknown>;
  body: string;
  /** The ALPN protocol the server selected ('h2' | 'http/1.1' | false). */
  alpn: string | false;
};

/** Default handler: echo enough of the request back as JSON to assert protocol + round-trip. */
const echo = (req: http2.Http2ServerRequest | import('http').IncomingMessage, res: any): void => {
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    const payload = JSON.stringify({
      protocol: req.httpVersion === '2.0' ? '2.0' : '1.1',
      method: req.method,
      path: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString()
    });
    res.setHeader('content-type', 'application/json');
    res.writeHead(200);
    res.end(payload);
  });
};

const toUrl = (server: http2.Http2SecureServer | https.Server): { url: string; port: number } => {
  const { port } = server.address() as AddressInfo;
  return { url: `https://localhost:${port}`, port };
};

const listen = (server: http2.Http2SecureServer | https.Server): Promise<void> =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const closer = (server: http2.Http2SecureServer | https.Server) => (): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()));

export type StartH2Options = {
  settings?: http2.Settings;
  onStream?: (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) => void;
  onRequest?: (req: http2.Http2ServerRequest, res: http2.Http2ServerResponse) => void;
};

export async function startH2Server(opts: StartH2Options = {}): Promise<TestServer> {
  // allowHTTP1 → the server answers an HTTP/1.1 client too, so one server covers the "dual" case.
  const server = http2.createSecureServer({ key, cert, allowHTTP1: true, settings: opts.settings });
  if (opts.onStream) {
    // Raw HTTP/2 control. Don't also attach 'request', or responses would be written twice.
    server.on('stream', opts.onStream);
  } else {
    server.on('request', opts.onRequest || (echo as any));
  }
  server.on('error', () => {}); // keep stray socket errors from crashing the test process
  await listen(server);
  return { ...toUrl(server), server, close: closer(server) };
}

export async function startH1Server(
  opts: { onRequest?: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void } = {}
): Promise<TestServer> {
  // ALPNProtocols restricted to http/1.1 → an h2 client gets NO_APPLICATION_PROTOCOL (proves no h2).
  const server = https.createServer(
    { key, cert, ALPNProtocols: ['http/1.1'] },
    (opts.onRequest || echo) as any
  );
  server.on('error', () => {});
  await listen(server);
  return { ...toUrl(server), server, close: closer(server) };
}

/** HTTP/2 client: connect, send one request, resolve the response (never hangs — rejects on error). */
export function h2Request(
  origin: string,
  path = '/',
  opts: { method?: string; headers?: Record<string, unknown>; body?: string; ca?: string | Buffer } = {}
): Promise<ClientResponse> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(origin, { ca: opts.ca ?? cert });
    client.once('error', reject);
    const req = client.request({
      ':method': opts.method || 'GET',
      ':path': path,
      ...(opts.headers as http2.OutgoingHttpHeaders)
    });
    const headers: Record<string, unknown> = {};
    let status = 0;
    let data = '';
    req.on('response', (h) => {
      status = Number(h[':status']);
      for (const [k, v] of Object.entries(h)) if (!k.startsWith(':')) headers[k] = v;
    });
    req.setEncoding('utf8');
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      const alpn = client.alpnProtocol ?? false;
      client.close();
      resolve({ status, headers, body: data, alpn });
    });
    req.on('error', (e) => {
      client.close();
      reject(e);
    });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/** HTTP/1.1 client (ALPN http/1.1 only) — used to exercise the h1 path / fallback. */
export function h1Request(
  origin: string,
  path = '/',
  opts: { method?: string; headers?: Record<string, string>; body?: string; ca?: string | Buffer } = {}
): Promise<ClientResponse & { httpVersion: string }> {
  const u = new URL(origin);
  return new Promise((resolve, reject) => {
    const r = https.request(
      {
        host: u.hostname,
        port: Number(u.port),
        path,
        method: opts.method || 'GET',
        ca: opts.ca ?? cert,
        ALPNProtocols: ['http/1.1'],
        headers: opts.headers
      },
      (res) => {
        // Capture ALPN now — res.socket can be null by the time 'end' fires on a closed connection.
        const sock = res.socket as tls.TLSSocket | null;
        const alpn = (sock && sock.alpnProtocol) || false;
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: data,
            alpn,
            httpVersion: res.httpVersion
          })
        );
      }
    );
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}
