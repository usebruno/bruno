import type { ClientHttp2Session } from 'node:http2';
import { acquireH2SessionViaProxy, closeAllProxyAgents } from '../../src/http2/proxy-session';
import type { ProxyInfo } from '../../src/http2/proxy-info';
import { startLab, type Lab } from '../fixtures/http2/lab-server';
import { startProxies, type ProxyLab } from '../fixtures/http2/proxy-servers';

let lab: Lab;
let proxies: ProxyLab;

beforeAll(async () => {
  [lab, proxies] = await Promise.all([startLab(), startProxies()]);
});
afterAll(async () => {
  closeAllProxyAgents();
  await Promise.all([lab.close(), proxies.close()]);
});
afterEach(() => closeAllProxyAgents());
// Tunnel counters accumulate across the suite; zero them in place (the servers hold these references)
// so each test asserts its own tunnel count.
beforeEach(() => {
  for (const counter of Object.values(proxies.counters)) counter.tunnels = 0;
});

const echo = (session: ClientHttp2Session, path = '/echo') =>
  new Promise<any>((resolve, reject) => {
    const req = session.request({ ':method': 'GET', ':path': path });
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(JSON.parse(data)));
    req.on('error', reject);
    req.end();
  });

const targetOrigin = (port = lab.ports.h2) => `https://localhost:${port}`;
const targetTls = () => ({ ca: lab.certs.ca });
const mtls = () => ({ ca: lab.certs.ca, cert: lab.certs.clientCert, key: lab.certs.clientKey });

const httpProxy = (): ProxyInfo => ({ kind: 'http', url: `http://localhost:${proxies.ports.http}`, key: 'http' });
const httpsProxy = (): ProxyInfo => ({ kind: 'https', url: `https://localhost:${proxies.ports.https}`, key: 'https', proxyTls: { ca: proxies.certs.ca } });
const socksProxy = (): ProxyInfo => ({ kind: 'socks', url: `socks5://localhost:${proxies.ports.socks}`, key: 'socks' });
const withCreds = (base: string) => `socks5://${proxies.creds.username}:${proxies.creds.password}@${base}`;

const acquire = (proxyInfo: ProxyInfo, origin = targetOrigin(), tlsOptions = targetTls()) =>
  acquireH2SessionViaProxy({ origin, proxyInfo, tlsOptions });

describe('h2 through each proxy kind', () => {
  test('HTTP CONNECT proxy tunnels to an h2 target', async () => {
    const r = await echo(await acquire(httpProxy()));
    expect(r.httpVersion).toBe('2.0');
    expect(proxies.counters.http.tunnels).toBe(1);
  });

  test('HTTPS CONNECT proxy (TLS to the proxy) tunnels to an h2 target', async () => {
    const r = await echo(await acquire(httpsProxy()));
    expect(r.httpVersion).toBe('2.0');
    expect(proxies.counters.https.tunnels).toBe(1);
  });

  test('SOCKS5 proxy tunnels to an h2 target', async () => {
    const r = await echo(await acquire(socksProxy()));
    expect(r.httpVersion).toBe('2.0');
    expect(proxies.counters.socks.tunnels).toBe(1);
  });
});

describe('proxy authentication', () => {
  test('HTTP proxy accepts correct Basic credentials', async () => {
    const info: ProxyInfo = { kind: 'http', url: `http://${proxies.creds.username}:${proxies.creds.password}@localhost:${proxies.ports.httpAuth}`, key: 'httpAuth' };
    const r = await echo(await acquire(info));
    expect(r.httpVersion).toBe('2.0');
    expect(proxies.counters.httpAuth.tunnels).toBe(1);
  });

  test('HTTP proxy rejects missing credentials (407)', async () => {
    const info: ProxyInfo = { kind: 'http', url: `http://localhost:${proxies.ports.httpAuth}`, key: 'httpAuth-noauth' };
    await expect(acquire(info)).rejects.toThrow();
  });

  test('SOCKS5 proxy accepts correct username/password', async () => {
    const info: ProxyInfo = { kind: 'socks', url: withCreds(`localhost:${proxies.ports.socksAuth}`), key: 'socksAuth' };
    const r = await echo(await acquire(info));
    expect(r.httpVersion).toBe('2.0');
    expect(proxies.counters.socksAuth.tunnels).toBe(1);
  });

  test('SOCKS5 proxy rejects wrong password', async () => {
    const info: ProxyInfo = { kind: 'socks', url: `socks5://${proxies.creds.username}:wrong@localhost:${proxies.ports.socksAuth}`, key: 'socksAuth-bad' };
    await expect(acquire(info)).rejects.toThrow();
  });
});

describe('pooling and lifecycle', () => {
  test('reuses one session (and one tunnel) per proxy for repeat requests', async () => {
    const a = await acquire(httpProxy());
    const b = await acquire(httpProxy());
    expect(b).toBe(a);
    expect(proxies.counters.http.tunnels).toBe(1); // no second CONNECT
  });

  test('mTLS target over a proxy presents the client cert (socket guard path)', async () => {
    const session = await acquire(socksProxy(), targetOrigin(lab.ports.mtls), mtls());
    const r = await echo(session);
    expect(r.clientCert).toMatchObject({ cn: 'bruno-test-client', authorized: true });
  });

  test('closeAllProxyAgents destroys pooled sessions; next acquire reopens a tunnel', async () => {
    const a = await acquire(httpProxy());
    expect(proxies.counters.http.tunnels).toBe(1);
    closeAllProxyAgents();
    expect(a.destroyed).toBe(true);
    const b = await acquire(httpProxy());
    expect(b).not.toBe(a);
    expect(proxies.counters.http.tunnels).toBe(2);
    expect((await echo(b)).httpVersion).toBe('2.0');
  });
});

describe('failures', () => {
  test('rejects when the target does not speak h2 over the proxy', async () => {
    await expect(acquire(httpProxy(), targetOrigin(lab.ports.h1Only))).rejects.toThrow();
  });

  test('rejects when the proxy cannot reach the target', async () => {
    await expect(acquire(httpProxy(), 'https://localhost:1')).rejects.toThrow();
  });
});
