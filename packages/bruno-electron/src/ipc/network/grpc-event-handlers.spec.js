jest.mock('./interpolate-string', () => ({
  interpolateString: (str) => str
}));

const { resolveGrpcProxyConfig } = require('./grpc-event-handlers');

const emptyInterpolationOptions = {};

describe('resolveGrpcProxyConfig', () => {
  describe('proxyMode "off"', () => {
    it('should return null proxyUrl', () => {
      expect(resolveGrpcProxyConfig('off', {}, 'grpc://localhost:50051', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });
  });

  describe('proxyMode "on"', () => {
    it('should return proxy URL without auth', () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: true }
      };
      expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: 'http://proxy.example.com:8080' });
    });

    it('should return proxy URL with auth when auth is enabled', () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: false, username: 'user', password: 'pass' }
      };
      expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: 'http://user:pass@proxy.example.com:8080' });
    });

    it('should URL-encode special characters in credentials', () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: false, username: 'user@domain', password: 'p@ss:word' }
      };
      const result = resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions);
      expect(result.proxyUrl).toBe('http://user%40domain:p%40ss%3Aword@proxy.example.com:8080');
    });

    it('should reject SOCKS proxy protocols', () => {
      const proxyConfig = {
        protocol: 'socks5',
        hostname: 'proxy.example.com',
        port: '1080'
      };
      expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });

    it('should reject HTTPS proxy protocol', () => {
      const proxyConfig = {
        protocol: 'https',
        hostname: 'proxy.example.com',
        port: '8080'
      };
      expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });

    it('should return null when request URL is in bypassProxy list', () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        bypassProxy: 'localhost,api.example.com'
      };
      expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });

    it('should omit port when not provided', () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        auth: { disabled: true }
      };
      expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: 'http://proxy.example.com' });
    });
  });

  describe('proxyMode "system"', () => {
    it('should use https_proxy when available', () => {
      const proxyConfig = {
        https_proxy: 'http://system-proxy.example.com:3128',
        http_proxy: 'http://fallback-proxy.example.com:3128'
      };
      expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: 'http://system-proxy.example.com:3128' });
    });

    it('should fall back to http_proxy when https_proxy is not set', () => {
      const proxyConfig = {
        http_proxy: 'http://fallback-proxy.example.com:3128'
      };
      expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: 'http://fallback-proxy.example.com:3128' });
    });

    it('should return null when no system proxy is configured', () => {
      expect(resolveGrpcProxyConfig('system', {}, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });

    it('should reject non-HTTP system proxy protocols', () => {
      const proxyConfig = {
        https_proxy: 'socks5://system-proxy.example.com:1080'
      };
      expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });

    it('should return null when request URL matches no_proxy', () => {
      const proxyConfig = {
        https_proxy: 'http://system-proxy.example.com:3128',
        no_proxy: 'api.example.com'
      };
      expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });

    it('should return null for invalid system proxy URL', () => {
      const proxyConfig = {
        https_proxy: 'not-a-valid-url'
      };
      expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });

    it('should return null when proxyConfig is null', () => {
      expect(resolveGrpcProxyConfig('system', null, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .toEqual({ proxyUrl: null });
    });
  });
});
