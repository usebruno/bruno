/**
 * createHttp2Transport driven through REAL axios (config.transport), over a TLS session, against the lab servers. This is the end-to-end proof that the stream we hand axios behaves
 * like the http/https transport it replaces.
 */
import axios from 'axios';
import { createHttp2Transport } from '../../src/http2/transport';
import { acquireH2Session, closeAllSessions } from '../../src/http2/session';
import { startLab, type Lab } from '../fixtures/http2/lab-server';

let lab: Lab;
beforeAll(async () => {
  lab = await startLab();
});
afterAll(async () => {
  closeAllSessions();
  await lab.close();
});
afterEach(() => closeAllSessions());

/** Acquire a TLS session and run one axios request through the h2 transport. */
const request = async (config: Record<string, unknown>) => {
  const { url: path = '/echo', ...rest } = config;
  const base = `https://localhost:${lab.ports.h2}`;
  const session = await acquireH2Session({ origin: base, tlsOptions: { ca: lab.certs.ca } });
  return axios.request({
    ...rest,
    url: base + path,
    transport: createHttp2Transport({ session })
  });
};

describe('createHttp2Transport over tls', () => {
  test('GET returns status, headers and a parsed body', async () => {
    const res = await request({ url: '/echo' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.data.httpVersion).toBe('2.0');
    expect(res.data.method).toBe('GET');
  });

  test('POST streams the request body', async () => {
    const res = await request({ url: '/upload', method: 'post', data: 'x'.repeat(5000) });
    expect(res.data.received).toBe(5000);
  });

  test('gzip response is transparently decompressed', async () => {
    const res = await request({ url: '/gzip' });
    expect(res.data).toMatchObject({ ok: true });
  });

  test('brotli response is transparently decompressed', async () => {
    const res = await request({ url: '/br' });
    expect(res.data).toMatchObject({ ok: true });
  });

  test('5MB body arrives intact', async () => {
    const res = await request({ url: '/big?mb=5', responseType: 'arraybuffer' });
    expect(res.data.byteLength).toBe(5 * 1024 * 1024);
  });

  test('duplicate set-cookie headers are preserved as an array', async () => {
    const res = await request({ url: '/echo' });
    expect(Array.isArray(res.headers['set-cookie'])).toBe(true);
    expect(res.headers['set-cookie']).toHaveLength(2);
  });

  test('Host header overrides :authority', async () => {
    const res = await request({ url: '/echo', headers: { Host: 'virtual.example.test' } });
    expect(res.data.headers[':authority']).toBe('virtual.example.test');
  });

  test('connection-specific request headers are stripped', async () => {
    const res = await request({ url: '/echo', headers: { 'Connection': 'keep-alive', 'X-Keep': '1' } });
    expect(res.data.headers.connection).toBeUndefined();
    expect(res.data.headers['x-keep']).toBe('1');
  });

  test('a non-2xx status is surfaced, not thrown as a transport error', async () => {
    const res = await request({ url: '/status?code=503', validateStatus: () => true });
    expect(res.status).toBe(503);
  });

  test('cancellation via AbortController aborts the stream', async () => {
    const controller = new AbortController();
    const p = request({ url: '/slow?ms=3000', signal: controller.signal });
    setTimeout(() => controller.abort(), 150);
    await expect(p).rejects.toThrow(/canceled|abort/i);
  });
});

describe('createHttp2Transport Basic auth (axios drops it on h2 without this)', () => {
  const run = async (cfg: Record<string, unknown>) => {
    const session = await acquireH2Session({ origin: `https://localhost:${lab.ports.h2}`, tlsOptions: { ca: lab.certs.ca } });
    return axios.request({ url: `https://localhost:${lab.ports.h2}/basic`, transport: createHttp2Transport({ session }), validateStatus: () => true, ...cfg });
  };
  test('config.auth becomes the Authorization header', async () => {
    const res = await run({ auth: { username: 'bruno', password: 'bruno' } });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
  });
  test('URL credentials become the Authorization header', async () => {
    const session = await acquireH2Session({ origin: `https://localhost:${lab.ports.h2}`, tlsOptions: { ca: lab.certs.ca } });
    const res = await axios.request({ url: `https://bruno:bruno@localhost:${lab.ports.h2}/basic`, transport: createHttp2Transport({ session }), validateStatus: () => true });
    expect(res.data.ok).toBe(true);
  });
  test('wrong credentials are rejected by the server (401)', async () => {
    const res = await run({ auth: { username: 'bruno', password: 'wrong' } });
    expect(res.status).toBe(401);
  });
});
