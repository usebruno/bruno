<<<<<<<< HEAD:packages/bruno-common/src/utils/url/validation.spec.ts
import { isPotentiallyTrustworthyOrigin } from './validation';
========
const { isPotentiallyTrustworthyOrigin } = require('../../src/utils/url');
>>>>>>>> 8ec6480f (fixes):packages/bruno-common/tests/cookies/cookie-utils.spec.js

describe('isPotentiallyTrustworthyOrigin', () => {
  describe('secure schemes', () => {
    it('should return true for HTTPS URLs', () => {
      expect(isPotentiallyTrustworthyOrigin('https://example.com')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('https://api.github.com/v1/users')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('https://localhost:3000')).toBe(true);
    });

    it('should return true for WSS URLs', () => {
      expect(isPotentiallyTrustworthyOrigin('wss://example.com')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('wss://localhost:8080/ws')).toBe(true);
    });

    it('should return true for file URLs', () => {
      expect(isPotentiallyTrustworthyOrigin('file:///path/to/file.html')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('file://localhost/path/to/file.html')).toBe(true);
    });
  });

  describe('insecure schemes', () => {
    it('should return false for HTTP URLs with non-localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('http://example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('http://api.github.com')).toBe(false);
    });

    it('should return false for WS URLs with non-localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('ws://example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('ws://api.github.com')).toBe(false);
    });

    it('should return false for other schemes', () => {
      expect(isPotentiallyTrustworthyOrigin('ftp://example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('ssh://example.com')).toBe(false);
    });

    it('should return true for HTTP/WS URLs with localhost (localhost is always trustworthy)', () => {
      expect(isPotentiallyTrustworthyOrigin('http://localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('ws://localhost')).toBe(true);
    });
  });

  describe('loopback addresses', () => {
    describe('IPv4 loopback', () => {
      it('should return true for 127.0.0.1', () => {
        expect(isPotentiallyTrustworthyOrigin('http://127.0.0.1')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://127.0.0.1:3000')).toBe(true);
      });

      it('should return true for other 127.x.x.x addresses', () => {
        expect(isPotentiallyTrustworthyOrigin('http://127.0.0.0')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://127.255.255.255')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://127.1.2.3')).toBe(true);
      });

      it('should return false for non-loopback IPv4 addresses', () => {
        expect(isPotentiallyTrustworthyOrigin('http://192.168.1.1')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://10.0.0.1')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://172.16.0.1')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://8.8.8.8')).toBe(false);
      });
    });

    describe('IPv6 loopback', () => {
      it('should return true for ::1', () => {
        expect(isPotentiallyTrustworthyOrigin('http://[::1]')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://[::1]:3000')).toBe(true);
      });

      it('should return false for non-loopback IPv6 addresses', () => {
        expect(isPotentiallyTrustworthyOrigin('http://[2001:db8::1]')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://[fe80::1]')).toBe(false);
      });
    });
  });

  describe('localhost hostnames', () => {
    it('should return true for localhost and *.localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('http://localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://localhost:3000')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://app.localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://api.localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://sub.domain.localhost')).toBe(true);
    });

    it('should handle case insensitive localhost', () => {
      expect(isPotentiallyTrustworthyOrigin('http://LOCALHOST')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://LocalHost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://APP.LOCALHOST')).toBe(true);
    });

    it('should return false for non-localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('http://api.example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('http://localhost.example.com')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle trailing dots in hostnames', () => {
      expect(isPotentiallyTrustworthyOrigin('http://localhost.')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://app.localhost.')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://example.com.')).toBe(false);
    });

    it('should handle URLs with query parameters and fragments', () => {
      expect(isPotentiallyTrustworthyOrigin('https://example.com/path?query=value#fragment')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://localhost/path?query=value#fragment')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://api.example.com/path?query=value#fragment')).toBe(false);
    });

    it('should handle URLs with authentication', () => {
      expect(isPotentiallyTrustworthyOrigin('https://user:pass@example.com')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://user:pass@localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://user:pass@api.example.com')).toBe(false);
    });
  });

  describe('mixed scenarios', () => {
    it('should prioritize secure schemes over hostname checks', () => {
      // Even though example.com is not localhost, HTTPS makes it trustworthy
      expect(isPotentiallyTrustworthyOrigin('https://example.com')).toBe(true);

      // Even though 192.168.1.1 is not loopback, HTTPS makes it trustworthy
      expect(isPotentiallyTrustworthyOrigin('https://192.168.1.1')).toBe(true);
    });

    it('should handle localhost with different schemes', () => {
      expect(isPotentiallyTrustworthyOrigin('https://localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('wss://localhost')).toBe(true);
    });
  });
});