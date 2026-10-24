const mockResolve = jest.fn();
jest.mock('../alpn', () => ({ resolveHttpVersionViaAlpn: (...args: unknown[]) => mockResolve(...args) }));

import { canUseHttp2, attachHttp2Adapter } from '../attach-http2-adapter';

describe('canUseHttp2', () => {
  it('is true for auto and http2, false for http1.1', () => {
    expect(canUseHttp2('auto')).toBe(true);
    expect(canUseHttp2('http2')).toBe(true);
    expect(canUseHttp2('http1.1')).toBe(false);
  });
});

describe('attachHttp2Adapter', () => {
  beforeEach(() => mockResolve.mockReset());

  it('skips the h2 path for http1.1 (no resolve, no timeline, no adapter)', async () => {
    const config: any = { url: 'https://x.test/' };
    const timeline: any[] = [];
    await attachHttp2Adapter({ config, requestedHttpVersion: 'http1.1', tlsOptions: {}, timeline });
    expect(mockResolve).not.toHaveBeenCalled();
    expect(timeline).toHaveLength(0);
    expect(config.adapter).toBeUndefined();
  });

  it('attaches the h2 adapter and logs the negotiated note', async () => {
    mockResolve.mockResolvedValue({ httpVersion: 2, reason: 'auto (h2)', offered: ['h2', 'http/1.1'], acceptedAlpnProtocol: 'h2' });
    const config: any = { url: 'https://x.test/' };
    const timeline: any[] = [];
    await attachHttp2Adapter({ config, requestedHttpVersion: 'auto', tlsOptions: {}, timeline });
    expect(typeof config.adapter).toBe('function');
    expect(timeline.some((e) => /ALPN: offered/.test(e.message))).toBe(true);
    expect(timeline.some((e) => /HTTP\/2 selected \(ALPN negotiated\)/.test(e.message))).toBe(true);
  });

  it('logs prior-knowledge (not "negotiated") for cleartext h2c', async () => {
    mockResolve.mockResolvedValue({ httpVersion: 2, reason: 'h2c prior knowledge (cleartext)' });
    const config: any = { url: 'http://x.test/' };
    const timeline: any[] = [];
    await attachHttp2Adapter({ config, requestedHttpVersion: 'http2', tlsOptions: {}, timeline });
    expect(typeof config.adapter).toBe('function');
    // No ALPN line over cleartext, and the note says prior knowledge, not "negotiated".
    expect(timeline.some((e) => /ALPN: offered/.test(e.message))).toBe(false);
    expect(timeline.some((e) => /prior knowledge/i.test(e.message))).toBe(true);
    expect(timeline.some((e) => /negotiated/i.test(e.message))).toBe(false);
  });

  it('logs HTTP/1.1 selected when negotiation falls back', async () => {
    mockResolve.mockResolvedValue({ httpVersion: 1, reason: 'auto (http/1.1)', offered: ['h2', 'http/1.1'], acceptedAlpnProtocol: 'http/1.1' });
    const config: any = { url: 'https://x.test/' };
    const timeline: any[] = [];
    await attachHttp2Adapter({ config, requestedHttpVersion: 'auto', tlsOptions: {}, timeline });
    expect(config.adapter).toBeUndefined();
    expect(timeline.some((e) => /HTTP\/1.1 selected/.test(e.message))).toBe(true);
  });

  it('clears a stale h2 adapter carried over from a previous redirect hop', async () => {
    mockResolve.mockResolvedValue({ httpVersion: 1, reason: 'auto (http/1.1)', offered: ['h2', 'http/1.1'], acceptedAlpnProtocol: 'http/1.1' });
    const config: any = { url: 'https://x.test/', adapter: () => {} };
    await attachHttp2Adapter({ config, requestedHttpVersion: 'auto', tlsOptions: {}, timeline: [] });
    expect(config.adapter).toBeUndefined();
  });
});
