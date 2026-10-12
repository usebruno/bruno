import axios from 'axios';
import https from 'node:https';
import { applyHttp2Transport, type Http2TimelineEntry } from '../../src/http2/select-transport';
import { closeAllSessions } from '../../src/http2/session';
import { closeAllProxyAgents } from '../../src/http2/proxy-session';
import type { ProxyInfo } from '../../src/http2/proxy-info';
import { clearAlpnCache, HTTP_VERSION, type HttpVersionPreference } from '../../src/http2/alpn';
import { startLab, type Lab } from '../fixtures/http2/lab-server';
import { startProxies, type ProxyLab } from '../fixtures/http2/proxy-servers';

let lab: Lab;
let proxies: ProxyLab;

beforeAll(async () => {
  [lab, proxies] = await Promise.all([startLab(), startProxies()]);
});
afterAll(async () => {
  closeAllSessions();
  await Promise.all([lab.close(), proxies.close()]);
});
afterEach(() => {
  closeAllSessions();
  clearAlpnCache();
});

const tls = () => ({ ca: lab.certs.ca });

/** Run one request through the glue exactly like the interceptor: applyHttp2Transport, then axios. */
const run = async (opts: {
  url: string;
  preference?: HttpVersionPreference;
  proxyInfo?: ProxyInfo | null;
  tlsOptions?: Record<string, unknown>;
  config?: Record<string, unknown>;
}) => {
  const timeline: Http2TimelineEntry[] = [];
  // Bruno always sets config.httpsAgent (with the CA) via setupProxyAgents; mirror that so an h1 fallback
  // can verify the self-signed lab cert. The h2 transport ignores httpsAgent (it uses the pooled session).
  const config: Record<string, unknown> = {
    url: opts.url,
    httpsAgent: new https.Agent(tls()),
    validateStatus: () => true,
    ...opts.config
  };
  await applyHttp2Transport({
    config: config as { url: string },
    httpVersionPreference: opts.preference ?? HTTP_VERSION.AUTO,
    tlsOptions: opts.tlsOptions ?? tls(),
    proxyInfo: opts.proxyInfo ?? null,
    timeline
  });
  const res = await axios.request(config);
  return { res, config, timeline };
};

const httpsUrl = (port: number, path = '/echo') => `https://localhost:${port}${path}`;
const httpUrl = (port: number, path = '/echo') => `http://localhost:${port}${path}`;
const socksProxy = (): ProxyInfo => ({ kind: 'socks', url: `socks5://localhost:${proxies.ports.socks}`, key: 'socks' });

describe('direct', () => {
  test('auto negotiates h2 and attaches the transport', async () => {
    const { res, config } = await run({ url: httpsUrl(lab.ports.h2) });
    expect(res.data.httpVersion).toBe('2.0');
    expect(config.transport).toBeDefined();
  });

  test('auto falls back to HTTP/1.1 against an h1-only server (no transport)', async () => {
    const { res, config } = await run({ url: httpsUrl(lab.ports.h1Only) });
    expect(res.data.httpVersion).toBe('1.1');
    expect(config.transport).toBeUndefined();
  });

  test('explicit http2 against an h1-only server throws (no silent downgrade)', async () => {
    await expect(run({ url: httpsUrl(lab.ports.h1Only), preference: HTTP_VERSION.HTTP2 })).rejects.toThrow();
  });

  test('http1 preference never uses h2 even against an h2 server', async () => {
    const { res, config } = await run({ url: httpsUrl(lab.ports.h2), preference: HTTP_VERSION.HTTP1 });
    expect(res.data.httpVersion).toBe('1.1');
    expect(config.transport).toBeUndefined();
  });

  test('Basic auth survives on h2 (axios drops it without the transport fix)', async () => {
    const { res } = await run({ url: httpsUrl(lab.ports.h2, '/basic'), config: { auth: { username: 'bruno', password: 'bruno' } } });
    expect(res.data.ok).toBe(true);
  });
});

describe('proxied', () => {
  afterEach(() => closeAllProxyAgents());

  test('auto gets h2 over a SOCKS proxy', async () => {
    const { res, config } = await run({ url: httpsUrl(lab.ports.h2), proxyInfo: socksProxy() });
    expect(res.data.httpVersion).toBe('2.0');
    expect(config.transport).toBeDefined();
    expect(proxies.counters.socks.tunnels).toBeGreaterThan(0);
  });

  test('auto + proxy to an h1-only target falls back to HTTP/1.1 (no direct probe)', async () => {
    // The target is only named; the point is the glue does NOT probe it directly and instead tries h2
    // over the tunnel, failing cleanly to h1. We assert the transport was not attached.
    const { config } = await run({ url: httpsUrl(lab.ports.h1Only), proxyInfo: socksProxy() });
    expect(config.transport).toBeUndefined();
  });

  test('explicit http2 over a proxy to an h1-only target throws', async () => {
    await expect(run({ url: httpsUrl(lab.ports.h1Only), preference: HTTP_VERSION.HTTP2, proxyInfo: socksProxy() })).rejects.toThrow();
  });

  test('proxy + cleartext target falls back to HTTP/1.1', async () => {
    const config: Record<string, unknown> = { url: httpUrl(lab.ports.h2c) };
    const timeline: Http2TimelineEntry[] = [];
    await applyHttp2Transport({ config: config as { url: string }, httpVersionPreference: HTTP_VERSION.HTTP2, proxyInfo: socksProxy(), timeline });
    expect(config.transport).toBeUndefined();
    expect(timeline.some((e) => /HTTP\/2 requires TLS/.test(e.message))).toBe(true);
  });
});

describe('redirect reuse (Bruno re-runs the glue per hop)', () => {
  test('an h2 hop followed by an h1-only hop clears the stale transport', async () => {
    const config: Record<string, unknown> = { url: httpsUrl(lab.ports.h2), httpsAgent: new https.Agent(tls()), validateStatus: () => true };
    // hop 1: h2 target
    await applyHttp2Transport({ config: config as { url: string }, httpVersionPreference: HTTP_VERSION.AUTO, tlsOptions: tls() });
    expect(config.transport).toBeDefined();
    // hop 2: redirect to an h1-only target — same config object reused
    config.url = httpsUrl(lab.ports.h1Only);
    await applyHttp2Transport({ config: config as { url: string }, httpVersionPreference: HTTP_VERSION.AUTO, tlsOptions: tls() });
    expect(config.transport).toBeUndefined();
    const res = await axios.request(config);
    expect(res.data.httpVersion).toBe('1.1');
  });
});
