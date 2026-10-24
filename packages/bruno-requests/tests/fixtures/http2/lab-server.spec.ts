/**
 * Smoke test for the lab fixture itself: certs are trusted, every server boots on a dynamic port,
 * h2 / h1-only / mTLS behave as labelled, and close() releases all handles. The real http2 transport
 * tests (Phase 1+) build on this.
 */
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import { startLab, type Lab } from './lab-server';

let lab: Lab;
beforeAll(async () => { lab = await startLab(); });
afterAll(async () => { await lab.close(); });

/** GET over a raw Node http2 session (TLS, or cleartext h2c when `scheme` is http); returns { status, body }. */
const h2Get = (port: number, path: string, extraTls: Record<string, unknown> = {}, scheme: 'https' | 'http' = 'https') =>
  new Promise<{ status: number; body: any }>((resolve, reject) => {
    const session = http2.connect(`${scheme}://localhost:${port}`, scheme === 'https' ? { ca: lab.certs.ca, ...extraTls } : {});
    // A rejected handshake may surface as 'error' OR as a silent 'close'; settle once on whichever comes first.
    let settled = false;
    const fail = (e: Error) => {
      if (settled) return; settled = true; session.destroy(); reject(e);
    };
    session.once('error', fail);
    session.once('close', () => fail(new Error('session closed before a response')));
    const req = session.request({ ':method': 'GET', ':path': path });
    let status = 0; let data = '';
    req.on('response', (h) => { status = Number(h[':status']); });
    req.setEncoding('utf8');
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      settled = true; session.close(); resolve({ status, body: JSON.parse(data) });
    });
    req.on('error', fail);
    req.end();
  });

/** GET over plain https (HTTP/1.1). */
const h1Get = (port: number, path: string) =>
  new Promise<{ status: number; body: any }>((resolve, reject) => {
    https.get({ host: 'localhost', port, path, ca: lab.certs.ca }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode || 0, body: JSON.parse(data) }));
    }).on('error', reject);
  });

/** GET over plain cleartext http (HTTP/1.1). */
const h1PlainGet = (port: number, path: string) =>
  new Promise<{ status: number; body: any }>((resolve, reject) => {
    http.get({ host: 'localhost', port, path }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode || 0, body: JSON.parse(data) }));
    }).on('error', reject);
  });

describe('lab fixture', () => {
  test('boots every server on a distinct dynamic port', () => {
    const ports = Object.values(lab.ports);
    expect(ports.every((p) => p > 0)).toBe(true);
    expect(new Set(ports).size).toBe(ports.length);
  });

  test('h2 server speaks HTTP/2 and the test CA is trusted', async () => {
    const r = await h2Get(lab.ports.h2, '/echo');
    expect(r.status).toBe(200);
    expect(r.body.httpVersion).toBe('2.0');
  });

  test('h2 server also accepts HTTP/1.1 (allowHTTP1)', async () => {
    const r = await h1Get(lab.ports.h2, '/echo');
    expect(r.body.httpVersion).toBe('1.1');
  });

  test('h1-only server is HTTP/1.1', async () => {
    const r = await h1Get(lab.ports.h1Only, '/echo');
    expect(r.body.httpVersion).toBe('1.1');
  });

  test('mTLS server authorizes the test client cert', async () => {
    const r = await h2Get(lab.ports.mtls, '/echo', { cert: lab.certs.clientCert, key: lab.certs.clientKey });
    expect(r.body.httpVersion).toBe('2.0');
    expect(r.body.clientCert).toMatchObject({ cn: 'bruno-test-client', authorized: true });
  });

  test('mTLS server rejects a connection with no client cert', async () => {
    await expect(h2Get(lab.ports.mtls, '/echo')).rejects.toThrow();
  });

  test('/echo reports the h2 session count (basis for reuse assertions)', async () => {
    const r = await h2Get(lab.ports.h2, '/echo');
    expect(typeof r.body.sessions).toBe('number');
    expect(r.body.sessions).toBeGreaterThan(0);
  });

  test('h2c server speaks cleartext HTTP/2 with prior knowledge', async () => {
    const r = await h2Get(lab.ports.h2c, '/echo', {}, 'http');
    expect(r.status).toBe(200);
    expect(r.body.httpVersion).toBe('2.0');
  });

  test('plain h1 server is cleartext HTTP/1.1 and rejects an h2 preface', async () => {
    const r = await h1PlainGet(lab.ports.h1Plain, '/echo');
    expect(r.body.httpVersion).toBe('1.1');
    await expect(h2Get(lab.ports.h1Plain, '/echo', {}, 'http')).rejects.toThrow();
  });
});
