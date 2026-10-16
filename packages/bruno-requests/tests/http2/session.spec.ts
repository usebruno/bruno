/**
 * acquireH2Session: pooled HTTP/2 sessions over TLS via http2-wrapper's Agent, against the lab servers.
 */
import type { ClientHttp2Session } from 'node:http2';
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

const origin = (port: number) => `https://localhost:${port}`;
const ca = () => ({ ca: lab.certs.ca });
const mtls = () => ({ ca: lab.certs.ca, cert: lab.certs.clientCert, key: lab.certs.clientKey });

/** GET /echo on an acquired session; returns the parsed JSON body. */
const echo = (session: ClientHttp2Session, path = '/echo') =>
  new Promise<any>((resolve, reject) => {
    const req = session.request({ ':method': 'GET', ':path': path });
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(data); // non-JSON endpoints such as /goaway
      }
    });
    req.on('error', reject);
    req.end();
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('acquireH2Session (TLS, http2-wrapper Agent)', () => {
  test('connects and speaks HTTP/2', async () => {
    const session = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    expect(session.destroyed).toBe(false);
    expect((await echo(session)).httpVersion).toBe('2.0');
  });

  test('reuses the session for the same origin and TLS material', async () => {
    const a = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    const first = await echo(a);
    const b = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    const second = await echo(b);
    expect(b).toBe(a);
    expect(second.sessions).toBe(first.sessions); // server saw no new session
  });

  test('concurrent cold acquires share one connect', async () => {
    const before = (await echo(await acquireH2Session({ origin: origin(lab.ports.maxStreams), tlsOptions: ca() }))).sessions;
    closeAllSessions();
    const sessions = await Promise.all(
      Array.from({ length: 5 }, () => acquireH2Session({ origin: origin(lab.ports.maxStreams), tlsOptions: ca() }))
    );
    expect(new Set(sessions).size).toBe(1);
    expect((await echo(sessions[0])).sessions).toBe(before + 1);
  });

  test('keys sessions by client cert: mTLS and no-cert to the same origin do not share', async () => {
    const plain = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    const before = (await echo(plain)).sessions;
    const withCert = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: mtls() });
    expect(withCert).not.toBe(plain);
    expect((await echo(withCert)).sessions).toBe(before + 1); // the server saw a second session
  });

  test('presents the client cert to an mTLS server', async () => {
    const session = await acquireH2Session({ origin: origin(lab.ports.mtls), tlsOptions: mtls() });
    expect((await echo(session)).clientCert.authorized).toBe(true);
  });

  test('rejects (does not hang) when the server requires a client cert and none is given', async () => {
    // Node leaves the session silently destroyed after the post-handshake alert; SessionAgent turns that into
    // a rejection. Without it this call never settles and later calls to the origin queue behind it.
    await expect(acquireH2Session({ origin: origin(lab.ports.mtls), tlsOptions: ca() })).rejects.toThrow(/CERTIFICATE_REQUIRED|alert/i);
    // The origin is not wedged: the next attempt fails fast too, and a valid cert still works.
    await expect(acquireH2Session({ origin: origin(lab.ports.mtls), tlsOptions: ca() })).rejects.toThrow();
    const ok = await acquireH2Session({ origin: origin(lab.ports.mtls), tlsOptions: mtls() });
    expect((await echo(ok)).clientCert.authorized).toBe(true);
  });

  test('rejects against an HTTP/1.1-only server instead of downgrading', async () => {
    await expect(acquireH2Session({ origin: origin(lab.ports.h1Only), tlsOptions: ca() })).rejects.toThrow();
  });

  test('rejects when the CA is not trusted', async () => {
    await expect(
      acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: { rejectUnauthorized: true } })
    ).rejects.toThrow();
  });

  test('multiplexes beyond the server maxConcurrentStreams on one session', async () => {
    const session = await acquireH2Session({ origin: origin(lab.ports.maxStreams), tlsOptions: ca() });
    const results = await Promise.all(Array.from({ length: 10 }, () => echo(session)));
    expect(results.every((r) => r.httpVersion === '2.0')).toBe(true);
    expect(new Set(results.map((r) => r.sessions)).size).toBe(1);
  });

  test('re-establishes after the server closes an idle session', async () => {
    const a = await acquireH2Session({ origin: origin(lab.ports.idleClose), tlsOptions: ca() });
    const first = await echo(a);
    await sleep(700); // idleClose server closes after 500ms
    const b = await acquireH2Session({ origin: origin(lab.ports.idleClose), tlsOptions: ca() });
    expect(b).not.toBe(a);
    expect((await echo(b)).sessions).toBe(first.sessions + 1);
  });

  test('opens a new session after GOAWAY', async () => {
    const a = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    await echo(a, '/goaway');
    await sleep(100);
    const b = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    expect(b).not.toBe(a);
    expect((await echo(b)).httpVersion).toBe('2.0');
  });

  test('closeAllSessions destroys pooled sessions and the next acquire reconnects', async () => {
    const a = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    closeAllSessions();
    expect(a.destroyed).toBe(true);
    const b = await acquireH2Session({ origin: origin(lab.ports.h2), tlsOptions: ca() });
    expect(b).not.toBe(a);
    expect((await echo(b)).httpVersion).toBe('2.0');
  });
});
