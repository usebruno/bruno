jest.mock('./interpolate-string', () => ({
  interpolateString: (str) => str
}));

const { resolveGrpcProxyConfig } = require('./grpc-event-handlers');

const emptyInterpolationOptions = {};

describe('resolveGrpcProxyConfig', () => {
  describe('proxyMode "off"', () => {
    it('should return null proxyUrl', async () => {
      await expect(resolveGrpcProxyConfig('off', {}, 'grpc://localhost:50051', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });
  });

  describe('proxyMode "on"', () => {
    it('should return proxy URL without auth', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: true }
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://proxy.example.com:8080' });
    });

    it('should return proxy URL with auth when auth is enabled', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: false, username: 'user', password: 'pass' }
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://user:pass@proxy.example.com:8080' });
    });

    it('should URL-encode special characters in credentials', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: false, username: 'user@domain', password: 'p@ss:word' }
      };
      const result = await resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions);
      expect(result.proxyUrl).toBe('http://user%40domain:p%40ss%3Aword@proxy.example.com:8080');
    });

    it('should reject SOCKS proxy protocols', async () => {
      const proxyConfig = {
        protocol: 'socks5',
        hostname: 'proxy.example.com',
        port: '1080'
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should reject HTTPS proxy protocol', async () => {
      const proxyConfig = {
        protocol: 'https',
        hostname: 'proxy.example.com',
        port: '8080'
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null when request URL is in bypassProxy list', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        bypassProxy: 'localhost,api.example.com'
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should omit port when not provided', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        auth: { disabled: true }
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://proxy.example.com' });
    });
  });

  describe('proxyMode "system"', () => {
    it('should use https_proxy when available', async () => {
      const proxyConfig = {
        https_proxy: 'http://system-proxy.example.com:3128',
        http_proxy: 'http://fallback-proxy.example.com:3128'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://system-proxy.example.com:3128' });
    });

    it('should fall back to http_proxy when https_proxy is not set', async () => {
      const proxyConfig = {
        http_proxy: 'http://fallback-proxy.example.com:3128'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://fallback-proxy.example.com:3128' });
    });

    it('should return null when no system proxy is configured', async () => {
      await expect(resolveGrpcProxyConfig('system', {}, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should reject non-HTTP system proxy protocols', async () => {
      const proxyConfig = {
        https_proxy: 'socks5://system-proxy.example.com:1080'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null when request URL matches no_proxy', async () => {
      const proxyConfig = {
        https_proxy: 'http://system-proxy.example.com:3128',
        no_proxy: 'api.example.com'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null for invalid system proxy URL', async () => {
      const proxyConfig = {
        https_proxy: 'not-a-valid-url'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null when proxyConfig is null', async () => {
      await expect(resolveGrpcProxyConfig('system', null, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });
  });
});
