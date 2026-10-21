jest.mock('./create-http2-transport', () => ({
  createHttp2Transport: jest.fn(() => ({ request: jest.fn() }))
}));
jest.mock('./negotiate-http-version', () => ({
  negotiateHttpVersion: jest.fn(),
  canUseHttp2: jest.fn((mode: string) => mode === 'http2' || mode === 'auto')
}));
jest.mock('./session-pool', () => ({
  hasLiveSession: jest.fn(() => false)
}));
jest.mock('./proxy-tunnel', () => ({
  proxyKeyFor: jest.fn(() => null),
  connectThroughProxy: jest.fn()
}));

import { applyHttp2Transport } from './apply-http2-transport';
import { createHttp2Transport } from './create-http2-transport';
import { negotiateHttpVersion } from './negotiate-http-version';
import { hasLiveSession } from './session-pool';
import { proxyKeyFor, connectThroughProxy } from './proxy-tunnel';

const mockCreate = createHttp2Transport as jest.Mock;
const mockNegotiate = negotiateHttpVersion as jest.Mock;
const mockHasLive = hasLiveSession as jest.Mock;
const mockProxyKey = proxyKeyFor as jest.Mock;
const mockTunnel = connectThroughProxy as jest.Mock;

const makeConfig = (over: Record<string, any> = {}): any => ({
  url: 'https://example.com/path',
  headers: {},
  httpsAgent: { options: { rejectUnauthorized: true } },
  transport: { stale: true }, // left over from a previous redirect
  ...over
});

beforeEach(() => {
  jest.clearAllMocks();
  mockHasLive.mockReturnValue(false);
  mockProxyKey.mockReturnValue(null);
});

describe('applyHttp2Transport (shared)', () => {
  it('clears a stale transport and does nothing for http1 mode', async () => {
    const config = makeConfig();
    await applyHttp2Transport({ config, mode: 'http1' });
    expect(config.transport).toBeUndefined();
    expect(mockCreate).not.toHaveBeenCalled();
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
      expect(config.transport).toEqual({ request: expect.any(Function) });
    });

    it('leaves HTTP/1.1 in place when the server declines h2', async () => {
      mockNegotiate.mockResolvedValue({ httpVersion: 1 });
      const config = makeConfig();

      await applyHttp2Transport({ config, mode: 'auto' });

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
