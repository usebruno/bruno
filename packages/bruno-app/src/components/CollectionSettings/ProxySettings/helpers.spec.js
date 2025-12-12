import { getProxyMode, transformProxyForStorage } from './helpers';

describe('CollectionSettings ProxySettings helpers', () => {
  describe('getProxyMode', () => {
    it('should return "off" for false', () => {
      expect(getProxyMode(false)).toBe('off');
    });

    it('should return "inherit" for "inherit" string', () => {
      expect(getProxyMode('inherit')).toBe('inherit');
    });

    it('should return "on" for proxy object without enabled property', () => {
      expect(getProxyMode({ protocol: 'http', hostname: 'proxy.com', port: 8090 })).toBe('on');
    });

    it('should return "on" for legacy format with enabled: true', () => {
      expect(getProxyMode({ enabled: true, protocol: 'http', hostname: 'proxy.com' })).toBe('on');
    });

    it('should return "off" for legacy format with enabled: false', () => {
      expect(getProxyMode({ enabled: false })).toBe('off');
    });

    it('should return "inherit" for legacy format with enabled: "global"', () => {
      expect(getProxyMode({ enabled: 'global' })).toBe('inherit');
    });

    it('should return "inherit" as default for null', () => {
      expect(getProxyMode(null)).toBe('inherit');
    });

    it('should return "inherit" as default for undefined', () => {
      expect(getProxyMode(undefined)).toBe('inherit');
    });
  });

  describe('transformProxyForStorage', () => {
    it('should return false when mode is "off"', () => {
      expect(transformProxyForStorage({ mode: 'off' })).toBe(false);
    });

    it('should return "inherit" when mode is "inherit"', () => {
      expect(transformProxyForStorage({ mode: 'inherit' })).toBe('inherit');
    });

    it('should return proxy config object when mode is "on"', () => {
      const values = {
        mode: 'on',
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090,
        auth: { username: 'user', password: 'pass' }
      };

      const result = transformProxyForStorage(values);
      expect(result).toEqual({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090,
        auth: { username: 'user', password: 'pass' }
      });
    });

    it('should return false as default for invalid mode value', () => {
      expect(transformProxyForStorage({ mode: 'invalid' })).toBe(false);
    });

    it('should return false as default for empty object', () => {
      expect(transformProxyForStorage({})).toBe(false);
    });
  });
});
