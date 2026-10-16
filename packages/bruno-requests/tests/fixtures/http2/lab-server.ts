/**
 * In-process HTTP/2 lab servers for the http2 integration tests.
 *
 * `startLab()` boots every server on a dynamic port (`listen(0)`) so tests never collide in CI, and
 * returns the ports plus the TLS material a client needs. All servers share one request handler and
 * one self-signed test identity (see ./certs/README.md). Call `close()` in `afterAll`.
 */
import fs from 'node:fs';
import path from 'node:path';
import http2 from 'node:http2';
import https from 'node:https';
import zlib from 'node:zlib';
import type { AddressInfo, Socket } from 'node:net';
import type { Writable } from 'node:stream';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';

const certsDir = path.join(__dirname, 'certs');
const read = (name: string) => fs.readFileSync(path.join(certsDir, name));

export const labCerts = {
  ca: read('ca.pem'),
  serverCert: read('server.pem'),
  serverKey: read('server-key.pem'),
  clientCa: read('client-ca.pem'),
  clientCert: read('client.pem'),
  clientKey: read('client-key.pem'),
  client2Cert: read('client2.pem'),
  client2Key: read('client2-key.pem')
};

type Req = IncomingMessage | http2.Http2ServerRequest;
type Res = ServerResponse | http2.Http2ServerResponse;

/** Builds the shared handler; `sessionCounter` lets /echo report how many h2 sessions this server has seen. */
const createHandler = (sessionCounter: { count: number }) => async (req: Req, res: Res) => {
  const url = new URL(req.url || '/', 'https://lab.invalid');
  const ver = req.httpVersion; // '2.0' or '1.1'
  const readBody = () =>
    new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
  const json = (body: unknown, status = 200) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  switch (url.pathname) {
    case '/echo': {
      const body = await readBody();
      const sock = req.socket as unknown as { getPeerCertificate?: () => { subject?: { CN?: string }; issuer?: { CN?: string } }; authorized?: boolean };
      const peer = sock.getPeerCertificate ? sock.getPeerCertificate() : null;
      const clientCert = peer && peer.subject ? { cn: peer.subject.CN, issuer: peer.issuer?.CN, authorized: sock.authorized } : null;
      res.setHeader('set-cookie', ['a=1; Path=/', 'b=2; Path=/']);
      res.setHeader('x-mixed-case', 'yes');
      return json({ httpVersion: ver, method: req.method, headers: req.headers, bodyLen: body.length, sessions: sessionCounter.count, clientCert });
    }
    case '/upload': {
      let n = 0;
      req.on('data', (c: Buffer) => { n += c.length; });
      req.on('end', () => json({ received: n, contentType: req.headers['content-type'] || null }));
      return;
    }
    case '/gzip':
      res.setHeader('content-encoding', 'gzip');
      res.setHeader('content-type', 'application/json');
      return res.end(zlib.gzipSync(JSON.stringify({ ok: true, ver })));
    case '/br':
      res.setHeader('content-encoding', 'br');
      res.setHeader('content-type', 'application/json');
      return res.end(zlib.brotliCompressSync(JSON.stringify({ ok: true, ver })));
    case '/big': {
      const mb = Number(url.searchParams.get('mb') || 5);
      res.setHeader('content-type', 'application/octet-stream');
      const chunk = Buffer.alloc(1024 * 1024, 65);
      // `write` overloads differ between ServerResponse and Http2ServerResponse, so TS cannot call it on
      // the union (TS2349); both are Writable streams, which is all the backpressure loop needs.
      const out = res as unknown as Writable;
      let i = 0;
      const write = () => {
        while (i < mb) {
          i++;
          if (!out.write(chunk)) {
            res.once('drain', write); return;
          }
        }
        res.end();
      };
      return write();
    }
    case '/slow':
      return void setTimeout(() => res.end('slow done'), Number(url.searchParams.get('ms') || 3000));
    case '/goaway': {
      res.setHeader('content-type', 'text/plain');
      res.end('goaway sent');
      const session = (req as http2.Http2ServerRequest).stream?.session;
      if (session) setTimeout(() => session.goaway(), 20);
      return;
    }
    case '/dup-headers':
      res.setHeader('x-dup', ['one', 'two']);
      res.setHeader('set-cookie', ['a=1; Path=/', 'b=2; Path=/']);
      return res.end('dup');
    case '/basic': {
      const expected = 'Basic ' + Buffer.from('bruno:bruno').toString('base64');
      if (req.headers.authorization === expected) return json({ ok: true, ver });
      res.setHeader('www-authenticate', 'Basic realm="lab"');
      return json({ ok: false }, 401);
    }
    case '/redirect':
      res.statusCode = Number(url.searchParams.get('code') || 302);
      res.setHeader('location', url.searchParams.get('to') || '/echo');
      return res.end('redirecting');
    case '/status':
      res.statusCode = Number(url.searchParams.get('code') || 500);
      return res.end('status body');
    default:
      res.statusCode = 404;
      return res.end('not found');
  }
};

type LabServer = http2.Http2SecureServer | http2.Http2Server | https.Server | http.Server;

const listen = (server: LabServer) =>
  new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));

export type Lab = {
  ports: {
    h2: number;
    h1Only: number;
    mtls: number;
    maxStreams: number;
    idleClose: number;
    /** Cleartext HTTP/2 (h2c) — only reachable with prior knowledge. */
    h2c: number;
    /** Plain HTTP/1.1 over cleartext — proves prior knowledge against a non-h2 server fails. */
    h1Plain: number;
  };
  certs: typeof labCerts;
  close: () => Promise<void>;
};

export async function startLab(): Promise<Lab> {
  const tls = { key: labCerts.serverKey, cert: labCerts.serverCert };
  const servers: LabServer[] = [];
  const counters = { h2: { count: 0 }, mtls: { count: 0 }, maxStreams: { count: 0 }, idleClose: { count: 0 }, h2c: { count: 0 } };
  const countSessions = (s: http2.Http2SecureServer | http2.Http2Server, c: { count: number }) => s.on('session', () => { c.count++; });

  // h2 with h1 fallback — the main lab target.
  const h2 = http2.createSecureServer({ ...tls, allowHTTP1: true }, createHandler(counters.h2));
  countSessions(h2, counters.h2);
  // HTTP/1.1-only — for auto-fallback and "explicit h2 must error" cases.
  const h1Only = https.createServer(tls, createHandler({ count: 0 }));
  // mTLS — requires a client cert signed by client-ca.pem.
  const mtls = http2.createSecureServer({ ...tls, allowHTTP1: true, requestCert: true, rejectUnauthorized: true, ca: labCerts.clientCa }, createHandler(counters.mtls));
  countSessions(mtls, counters.mtls);
  // Tiny concurrency window — proves queueing beyond maxConcurrentStreams.
  const maxStreams = http2.createSecureServer({ ...tls, settings: { maxConcurrentStreams: 4 } }, createHandler(counters.maxStreams));
  countSessions(maxStreams, counters.maxStreams);
  // Server closes an idle session after ~500ms — proves the pool re-establishes.
  const idleClose = http2.createSecureServer(tls, createHandler(counters.idleClose));
  countSessions(idleClose, counters.idleClose);
  idleClose.on('session', (session) => session.setTimeout(500, () => session.close()));

  // Cleartext h2 — no TLS, so no ALPN; a client must send the h2 preface blind (prior knowledge).
  const h2c = http2.createServer(createHandler(counters.h2c));
  countSessions(h2c, counters.h2c);
  // Plain cleartext HTTP/1.1 — a prior-knowledge client must fail here, never silently downgrade.
  const h1Plain = http.createServer(createHandler({ count: 0 }));

  servers.push(h2, h1Only, mtls, maxStreams, idleClose, h2c, h1Plain);

  // server.close() waits for every connection to end; a client that was destroyed mid-handshake (or a
  // pooled session a test left open) can keep it waiting forever. Track raw sockets so close() can end them.
  const sockets = new Set<Socket>();
  for (const server of servers) {
    server.on('connection', (socket: Socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
  }

  const [p1, p2, p3, p4, p5, p6, p7] = await Promise.all(servers.map(listen));

  return {
    ports: { h2: p1, h1Only: p2, mtls: p3, maxStreams: p4, idleClose: p5, h2c: p6, h1Plain: p7 },
    certs: labCerts,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await Promise.all(servers.map((s) => new Promise<void>((r) => s.close(() => r()))));
    }
  };
}
