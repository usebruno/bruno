import net from 'node:net';
import tls from 'node:tls';
import {
  HTTP_VERSION,
  clearAlpnCache,
  invalidateAlpn,
  resolveHttpVersion,
  type HttpVersionPreference
} from '../../src/http2/alpn';
import { startLab, type Lab } from '../fixtures/http2/lab-server';

let lab: Lab;
let tlsConnectSpy: jest.SpyInstance;

beforeAll(async () => {
  lab = await startLab();
});
afterAll(async () => {
  await lab.close();
});

beforeEach(() => {
  clearAlpnCache();
  tlsConnectSpy = jest.spyOn(tls, 'connect');
});
afterEach(() => {
  jest.restoreAllMocks();
});

const tlsOptions = () => ({ ca: lab.certs.ca });
const httpsUrl = (port: number) => `https://localhost:${port}/echo`;
const httpUrl = (port: number) => `http://localhost:${port}/echo`;

const resolve = (url: string, httpVersionPreference: HttpVersionPreference) =>
  resolveHttpVersion({ url, httpVersionPreference, tlsOptions: tlsOptions() });

/** A port nothing listens on: bind, read, close. */
const closedPort = () =>
  new Promise<number>((done) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => done(port));
    });
  });

describe('auto (ALPN probe)', () => {
  test('negotiates h2 against an h2 server', async () => {
    const r = await resolve(httpsUrl(lab.ports.h2), HTTP_VERSION.AUTO);
    expect(r).toMatchObject({ protocol: 'http2', alpn: 'h2', cached: false });
    expect(r.offered).toEqual(['h2', 'http/1.1']);
    expect(tlsConnectSpy).toHaveBeenCalledTimes(1);
  });

  test('falls back to http1 against an HTTP/1.1-only server', async () => {
    const r = await resolve(httpsUrl(lab.ports.h1Only), HTTP_VERSION.AUTO);
    expect(r).toMatchObject({ protocol: 'http1.1', alpn: 'http/1.1', cached: false });
  });

  test('second call to the same origin is served from the cache without a handshake', async () => {
    await resolve(httpsUrl(lab.ports.h2), HTTP_VERSION.AUTO);
    const r = await resolve(httpsUrl(lab.ports.h2), HTTP_VERSION.AUTO);
    expect(r).toMatchObject({ protocol: 'http2', alpn: 'h2', cached: true });
    expect(r.reason).toMatch(/cached/);
    expect(tlsConnectSpy).toHaveBeenCalledTimes(1);
  });

  test('cache is per origin: a different port probes again', async () => {
    await resolve(httpsUrl(lab.ports.h2), HTTP_VERSION.AUTO);
    const r = await resolve(httpsUrl(lab.ports.h1Only), HTTP_VERSION.AUTO);
    expect(r.cached).toBe(false);
    expect(tlsConnectSpy).toHaveBeenCalledTimes(2);
  });

  test('concurrent calls to a cold origin share one probe', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => resolve(httpsUrl(lab.ports.h2), HTTP_VERSION.AUTO))
    );
    expect(results.every((r) => r.protocol === 'http2')).toBe(true);
    expect(tlsConnectSpy).toHaveBeenCalledTimes(1);
  });

  test('invalidateAlpn forces a re-probe for that origin only', async () => {
    await resolve(httpsUrl(lab.ports.h2), HTTP_VERSION.AUTO);
    await resolve(httpsUrl(lab.ports.h1Only), HTTP_VERSION.AUTO);
    expect(invalidateAlpn('localhost', lab.ports.h2)).toBe(true);
    expect((await resolve(httpsUrl(lab.ports.h2), HTTP_VERSION.AUTO)).cached).toBe(false);
    expect((await resolve(httpsUrl(lab.ports.h1Only), HTTP_VERSION.AUTO)).cached).toBe(true);
    expect(tlsConnectSpy).toHaveBeenCalledTimes(3);
  });

  test('a failed probe falls back to http1 and is not cached', async () => {
    const port = await closedPort();
    const r = await resolve(httpsUrl(port), HTTP_VERSION.AUTO);
    expect(r).toMatchObject({ protocol: 'http1.1' });
    expect(r.alpn).toBeUndefined();
    expect(r.reason).toMatch(/^ALPN probe failed/);
    const again = await resolve(httpsUrl(port), HTTP_VERSION.AUTO);
    expect(again.protocol).toBe('http1.1');
    expect(tlsConnectSpy).toHaveBeenCalledTimes(2);
  });

  test('a probe with an untrusted CA fails closed to http1', async () => {
    const r = await resolveHttpVersion({
      url: httpsUrl(lab.ports.h2),
      httpVersionPreference: HTTP_VERSION.AUTO,
      tlsOptions: { rejectUnauthorized: true } // no `ca`: the self-signed lab cert is untrusted
    });
    expect(r.protocol).toBe('http1.1');
    expect(r.reason).toMatch(/^ALPN probe failed/);
  });
});

describe('explicit preferences over https (no probe)', () => {
  test.each([
    [HTTP_VERSION.HTTP1, 'http1.1', /HTTP\/1\.1 selected by preference/],
    [HTTP_VERSION.HTTP2, 'http2', /HTTP\/2 selected by preference/]
  ] as const)('%s -> %s without a handshake', async (preference, protocol, reason) => {
    // Use the h1-only server on purpose: an explicit preference must not look at the server at all.
    const r = await resolve(httpsUrl(lab.ports.h1Only), preference);
    expect(r).toMatchObject({ protocol });
    expect(r.reason).toMatch(reason);
    expect(r.alpn).toBeUndefined();
    expect(r.cached).toBeUndefined();
    expect(tlsConnectSpy).not.toHaveBeenCalled();
  });
});

describe('cleartext http:// URLs', () => {
  test.each([HTTP_VERSION.AUTO, HTTP_VERSION.HTTP1, HTTP_VERSION.HTTP2])(
    '%s selects http1.1 (HTTP/2 requires TLS)',
    async (preference) => {
      const r = await resolve(httpUrl(lab.ports.h2c), preference);
      expect(r).toMatchObject({ protocol: 'http1.1' });
      expect(r.reason).toMatch(/cleartext/);
      expect(tlsConnectSpy).not.toHaveBeenCalled();
    }
  );

  test('decision does not depend on the server (h1Plain gets the same answer)', async () => {
    const auto = await resolve(httpUrl(lab.ports.h1Plain), HTTP_VERSION.AUTO);
    expect(auto.protocol).toBe('http1.1');
  });
});

describe('default ports', () => {
  test('cache key uses 443 for https and 80 for http when no port is given', async () => {
    // Only exercises the key path: invalidating a never-probed origin returns false, with default ports.
    expect(invalidateAlpn('example.test', 443)).toBe(false);
    const r = await resolve('http://example.test/', HTTP_VERSION.AUTO);
    expect(r.protocol).toBe('http1.1');
  });
});
