const mockEstablish = jest.fn();
jest.mock('./tls-connect-options', () => ({
  ...jest.requireActual('./tls-connect-options'),
  establishTlsConnection: (...a: unknown[]) => mockEstablish(...a)
}));

import { negotiateHttpVersion, clearAlpnCache } from './negotiate-http-version';

const h2Probe = { alpn: 'h2', protocol: 'TLSv1.3', offered: ['h2', 'http/1.1'], socket: { destroy: jest.fn() } };
const h1Probe = { alpn: 'http/1.1', protocol: 'TLSv1.3', offered: ['h2', 'http/1.1'], socket: { destroy: jest.fn() } };

beforeEach(() => {
  clearAlpnCache();
  mockEstablish.mockReset();
});

describe('negotiateHttpVersion — no probe needed', () => {
  it('unparseable URL → HTTP/1.1', async () => {
    expect(await negotiateHttpVersion({ url: 'not a url', mode: 'auto' })).toMatchObject({ httpVersion: 1 });
    expect(mockEstablish).not.toHaveBeenCalled();
  });

  it('mode http1 → HTTP/1.1 (https)', async () => {
    expect(await negotiateHttpVersion({ url: 'https://x.test/', mode: 'http1' })).toMatchObject({ httpVersion: 1, reason: 'mode http1' });
    expect(mockEstablish).not.toHaveBeenCalled();
  });

  it('mode http2 over https → forced HTTP/2 (no probe)', async () => {
    expect(await negotiateHttpVersion({ url: 'https://x.test/', mode: 'http2' })).toMatchObject({ httpVersion: 2, reason: 'mode http2 (forced)' });
    expect(mockEstablish).not.toHaveBeenCalled();
  });

  describe('cleartext (h2c unification)', () => {
    it('http2 + http:// → h2c prior knowledge', async () => {
      expect(await negotiateHttpVersion({ url: 'http://x.test/', mode: 'http2' }))
        .toMatchObject({ httpVersion: 2, reason: 'h2c prior knowledge (cleartext)' });
      expect(mockEstablish).not.toHaveBeenCalled();
    });

    it('auto + http:// → HTTP/1.1 (no ALPN on cleartext)', async () => {
      expect(await negotiateHttpVersion({ url: 'http://x.test/', mode: 'auto' })).toMatchObject({ httpVersion: 1 });
    });

    it('http1 + http:// → HTTP/1.1', async () => {
      expect(await negotiateHttpVersion({ url: 'http://x.test/', mode: 'http1' })).toMatchObject({ httpVersion: 1 });
    });
  });
});

describe('negotiateHttpVersion — auto over TLS (ALPN probe)', () => {
  it('server negotiates h2 → HTTP/2', async () => {
    mockEstablish.mockResolvedValue(h2Probe);
    const r = await negotiateHttpVersion({ url: 'https://x.test:8443/', mode: 'auto' });
    expect(r).toMatchObject({ httpVersion: 2, alpn: 'h2', offered: ['h2', 'http/1.1'] });
    expect(h2Probe.socket.destroy).toHaveBeenCalled();
  });

  it('server negotiates http/1.1 → HTTP/1.1', async () => {
    mockEstablish.mockResolvedValue(h1Probe);
    expect(await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto' })).toMatchObject({ httpVersion: 1, alpn: 'http/1.1' });
  });

  it('caches the result: a second call does not re-probe', async () => {
    mockEstablish.mockResolvedValue(h2Probe);
    await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto' });
    const second = await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto' });
    expect(second).toMatchObject({ httpVersion: 2, reason: 'auto (cached)' });
    expect(mockEstablish).toHaveBeenCalledTimes(1);
  });

  it('a different TLS identity probes separately', async () => {
    mockEstablish.mockResolvedValue(h2Probe);
    await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto', tlsOptions: { cert: 'A' } });
    await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto', tlsOptions: { cert: 'B' } });
    expect(mockEstablish).toHaveBeenCalledTimes(2);
  });

  it('a failed probe falls back to HTTP/1.1 and is NOT cached', async () => {
    mockEstablish.mockRejectedValue(Object.assign(new Error(''), { code: 'ECONNREFUSED' }));
    const r = await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto' });
    expect(r.httpVersion).toBe(1);
    expect(r.reason).toContain('ECONNREFUSED'); // not an empty message
    // next call probes again (not cached)
    mockEstablish.mockResolvedValue(h2Probe);
    expect(await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto' })).toMatchObject({ httpVersion: 2 });
    expect(mockEstablish).toHaveBeenCalledTimes(2);
  });

  it('derives a reason from an AggregateError with an empty message', async () => {
    const agg: any = new Error('');
    agg.name = 'AggregateError';
    agg.errors = [Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })];
    mockEstablish.mockRejectedValue(agg);
    const r = await negotiateHttpVersion({ url: 'https://x.test/', mode: 'auto' });
    expect(r.reason).toContain('ECONNREFUSED');
  });
});
