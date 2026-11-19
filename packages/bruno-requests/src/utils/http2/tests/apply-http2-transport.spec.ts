jest.mock('../create-http2-transport', () => ({
  createHttp2Transport: jest.fn(() => ({ request: jest.fn() }))
}));
jest.mock('../negotiate-http-version', () => ({
  negotiateHttpVersion: jest.fn(),
  canUseHttp2: jest.fn((mode: string) => mode === 'http2' || mode === 'auto')
}));
jest.mock('../session-pool', () => ({
  hasLiveSession: jest.fn(() => false)
}));
jest.mock('../proxy-tunnel', () => ({
  proxyKeyFor: jest.fn(() => null),
  redactProxyUri: jest.fn((u: string) => u),
  connectThroughProxy: jest.fn()
}));

import { applyHttp2Transport, applyBasicAuthHeader } from '../apply-http2-transport';
import { createHttp2Transport } from '../create-http2-transport';
import { negotiateHttpVersion } from '../negotiate-http-version';
import { hasLiveSession } from '../session-pool';
import { proxyKeyFor, connectThroughProxy } from '../proxy-tunnel';

const mockCreate = createHttp2Transport as jest.Mock;
const mockNegotiate = negotiateHttpVersion as jest.Mock;
const mockHasLive = hasLiveSession as jest.Mock;
const mockProxyKey = proxyKeyFor as jest.Mock;
const mockTunnel = connectThroughProxy as jest.Mock;

const makeConfig = (over: Record<string, any> = {}): any => ({
  url: 'https://example.com/path',
  headers: {},
  httpsAgent: { options: { rejectUnauthorized: true } },
  transport: { request: () => {}, __bruno_http2: true }, // marked h2 left over from a previous redirect
  ...over
});

beforeEach(() => {
  jest.clearAllMocks();
  mockHasLive.mockReturnValue(false);
  mockProxyKey.mockReturnValue(null);
});

describe('applyHttp2Transport (shared)', () => {
  it('does nothing for http1 mode and preserves a foreign (non-h2) transport', async () => {
    // A non-h2 transport (e.g. the Connection-omitting wrapper) must survive the http1 path.
    const foreign = { request: () => {} };
    const config = makeConfig({ transport: foreign });
    await applyHttp2Transport({ config, mode: 'http1' });
    expect(config.transport).toBe(foreign);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('clears a stale h2 transport we attached (redirect cleanup), on the http1 path', async () => {
    const staleH2: any = { request: () => {}, __bruno_http2: true };
    const config = makeConfig({ transport: staleH2 });
    await applyHttp2Transport({ config, mode: 'http1' });
    expect(config.transport).toBeUndefined();
  });

  describe('direct connection (no proxy)', () => {
    it('attaches the transport when the server selects h2', async () => {
      mockNegotiate.mockResolvedValue({ httpVersion: 2 });
      const config = makeConfig();

      await applyHttp2Transport({ config, mode: 'auto' });

      expect(mockNegotiate).toHaveBeenCalledWith(
        expect.objectContaining({ url: config.url, mode: 'auto', proxyUri: null })
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ proxyUri: null, socket: null })
      );
      expect(config.transport).toEqual(expect.objectContaining({ request: expect.any(Function), __bruno_http2: true }));
    });

    it('leaves HTTP/1.1 in place when the server declines h2', async () => {
      mockNegotiate.mockResolvedValue({ httpVersion: 1 });
      const config = makeConfig();

      await applyHttp2Transport({ config, mode: 'auto' });

      expect(mockCreate).not.toHaveBeenCalled();
      expect(config.transport).toBeUndefined();
    });
  });

  describe('timeline (desktop app)', () => {
    it('logs the ALPN line, the version line, and the basic-auth note when h2 is selected', async () => {
      mockNegotiate.mockResolvedValue({ httpVersion: 2, reason: 'ALPN negotiated h2', offered: ['h2', 'http/1.1'], alpn: 'h2' });
      const timeline: any[] = [];
      const config = makeConfig({ auth: { username: 'u', password: 'p' } });

      await applyHttp2Transport({ config, mode: 'auto', timeline });

      const messages = timeline.map((t) => t.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ALPN: offered h2, http/1.1 · server accepted h2'),
          expect.stringContaining('HTTP/2 selected (ALPN negotiated h2)'),
          expect.stringContaining('Authorization header built')
        ])
      );
    });

    it('logs the HTTP/1.1 decision and no basic-auth note when h2 is declined', async () => {
      mockNegotiate.mockResolvedValue({ httpVersion: 1, reason: 'server lacks h2' });
      const timeline: any[] = [];
      const config = makeConfig();

      await applyHttp2Transport({ config, mode: 'auto', timeline });

      const messages = timeline.map((t) => t.message);
      expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('HTTP/1.1 selected (server lacks h2)')]));
      expect(messages.some((m) => m.includes('Authorization header built'))).toBe(false);
    });

    it('uses agentOptions as the TLS override when provided', async () => {
      mockNegotiate.mockResolvedValue({ httpVersion: 2 });
      const agentOptions = { rejectUnauthorized: false, ca: 'CUSTOM' };
      const config = makeConfig();

      await applyHttp2Transport({ config, mode: 'http2', agentOptions, timeline: [] });

      expect(mockNegotiate).toHaveBeenCalledWith(expect.objectContaining({ tlsOptions: agentOptions }));
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tlsOptions: agentOptions }));
    });
  });

  describe('cleartext (http://) through a proxy', () => {
    const cleartextProxied = () =>
      makeConfig({ url: 'http://example.com/x', httpAgent: { proxy: { href: 'http://proxy:8080' } } });

    it('auto: falls back to HTTP/1.1 over the proxy (no direct dial / no leak)', async () => {
      mockProxyKey.mockReturnValue('http://proxy:8080');
      const config = cleartextProxied();

      await applyHttp2Transport({ config, mode: 'auto' });

      expect(mockNegotiate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(config.transport).toBeUndefined();
    });

    it('forced http2: fails instead of silently downgrading', async () => {
      mockProxyKey.mockReturnValue('http://proxy:8080');
      const config = cleartextProxied();

      await expect(applyHttp2Transport({ config, mode: 'http2' })).rejects.toMatchObject({
        code: 'ERR_H2_CLEARTEXT_PROXY_UNSUPPORTED'
      });
      expect(mockCreate).not.toHaveBeenCalled();
      expect(config.transport).toBeUndefined();
    });
  });

  describe('proxied https connection', () => {
    const proxied = () =>
      makeConfig({ httpsAgent: { options: {}, proxy: { href: 'http://proxy:8080' }, connect: jest.fn() } });

    it('tunnels and attaches the transport with the tunnel socket when the server selects h2', async () => {
      mockProxyKey.mockReturnValue('http://proxy:8080');
      const tunnelSocket = { destroy: jest.fn() };
      mockTunnel.mockResolvedValue({ alpn: 'h2', socket: tunnelSocket });
      const config = proxied();

      await applyHttp2Transport({ config, mode: 'auto' });

      expect(mockTunnel).toHaveBeenCalled();
      expect(mockNegotiate).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ proxyUri: 'http://proxy:8080', socket: tunnelSocket, lookup: undefined })
      );
      expect(tunnelSocket.destroy).not.toHaveBeenCalled();
    });

    it('destroys the tunnel socket and falls back when the server declines h2 (auto)', async () => {
      mockProxyKey.mockReturnValue('http://proxy:8080');
      const tunnelSocket = { destroy: jest.fn() };
      mockTunnel.mockResolvedValue({ alpn: 'http/1.1', socket: tunnelSocket });
      const config = proxied();

      await applyHttp2Transport({ config, mode: 'auto' });

      expect(tunnelSocket.destroy).toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(config.transport).toBeUndefined();
    });

    it('reuses a pooled session without opening a new tunnel', async () => {
      mockProxyKey.mockReturnValue('http://proxy:8080');
      mockHasLive.mockReturnValue(true);
      const config = proxied();

      await applyHttp2Transport({ config, mode: 'http2' });

      expect(mockTunnel).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ proxyUri: 'http://proxy:8080', socket: null })
      );
    });

    it('propagates a tunnel failure in forced http2 mode', async () => {
      mockProxyKey.mockReturnValue('http://proxy:8080');
      mockTunnel.mockRejectedValue(new Error('CONNECT refused'));
      const config = proxied();

      await expect(applyHttp2Transport({ config, mode: 'http2' })).rejects.toThrow('CONNECT refused');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('falls back to HTTP/1.1 when the tunnel fails in auto mode', async () => {
      mockProxyKey.mockReturnValue('http://proxy:8080');
      mockTunnel.mockRejectedValue(new Error('CONNECT refused'));
      const config = proxied();

      await applyHttp2Transport({ config, mode: 'auto' });

      expect(mockCreate).not.toHaveBeenCalled();
      expect(config.transport).toBeUndefined();
    });
  });
});

describe('applyBasicAuthHeader (URL-derived auth marking)', () => {
  it('marks URL userinfo auth as host-bound and strips it from the URL', () => {
    const config: any = { url: 'https://user:p%40ss@api.test/x', headers: {} };
    expect(applyBasicAuthHeader(config)).toBe(true);
    expect(config.headers.Authorization).toBe(`Basic ${Buffer.from('user:p@ss').toString('base64')}`);
    expect(config.url).toBe('https://api.test/x'); // userinfo stripped
    expect(config.__urlDerivedAuth).toBe(true);
  });

  it('does NOT mark explicit config.auth as URL-derived', () => {
    const config: any = { url: 'https://api.test/x', auth: { username: 'u', password: 'p' }, headers: {} };
    expect(applyBasicAuthHeader(config)).toBe(true);
    expect(config.headers.Authorization).toBe(`Basic ${Buffer.from('u:p').toString('base64')}`);
    expect(config.__urlDerivedAuth).toBe(false);
  });

  it('returns false and marks nothing when there are no credentials', () => {
    const config: any = { url: 'https://api.test/x', headers: {} };
    expect(applyBasicAuthHeader(config)).toBe(false);
    expect(config.__urlDerivedAuth).toBeUndefined();
  });
});
