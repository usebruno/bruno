import { getProxyMode, transformProxyForStorage } from './helpers';

describe('Preferences ProxySettings helpers', () => {
  describe('getProxyMode', () => {
    it('should return "off" for false', () => {
      expect(getProxyMode(false)).toBe('off');
    });

    it('should return "system" for "system" string', () => {
      expect(getProxyMode('system')).toBe('system');
    });

    it('should return "on" for proxy object', () => {
      expect(getProxyMode({ protocol: 'http', hostname: 'proxy.com', port: 8090 })).toBe('on');
    });

    it('should return "off" as default for null', () => {
      expect(getProxyMode(null)).toBe('off');
    });

    it('should return "off" as default for undefined', () => {
      expect(getProxyMode(undefined)).toBe('off');
    });

    it('should return "off" as default for empty string', () => {
      expect(getProxyMode('')).toBe('off');
    });
  });

  describe('transformProxyForStorage', () => {
    it('should return false when mode is "off"', () => {
      expect(transformProxyForStorage({ mode: 'off' })).toBe(false);
    });

    it('should return "system" when mode is "system"', () => {
      expect(transformProxyForStorage({ mode: 'system' })).toBe('system');
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
