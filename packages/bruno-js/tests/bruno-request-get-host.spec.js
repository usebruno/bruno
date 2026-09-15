const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const hostOf = (url) => new BrunoRequest({ url, method: 'GET', headers: {} }).getHost();

describe('BrunoRequest - getHost()', () => {
  describe('urls holding template variables', () => {
    // Pre-request scripts run before interpolation, so req.url still holds the
    // user's template text. Scripts interpolate the result themselves via
    // bru.interpolate(), which only works if the placeholder survives verbatim.
    it('preserves the case of a variable in the hostname', () => {
      expect(hostOf('https://{{HOST}}/test')).toBe('{{HOST}}');
    });

    it('returns the variable when it supplies the scheme as well', () => {
      expect(hostOf('{{HOST}}/test')).toBe('{{HOST}}');
    });

    it('handles a variable with no path after it', () => {
      expect(hostOf('{{HOST}}')).toBe('{{HOST}}');
    });

    it('preserves a partially templated host', () => {
      expect(hostOf('https://{{ENV}}.example.com/test')).toBe('{{ENV}}.example.com');
    });

    it('keeps an explicit port alongside a variable', () => {
      expect(hostOf('http://{{HOST}}:8080/test')).toBe('{{HOST}}:8080');
    });

    it('stops at the query string when there is no path', () => {
      expect(hostOf('https://{{HOST}}?a=b')).toBe('{{HOST}}');
    });
  });

  describe('plain urls keep their existing behaviour', () => {
    it('returns the host', () => {
      expect(hostOf('https://example.com/test')).toBe('example.com');
    });

    it('includes the port', () => {
      expect(hostOf('http://localhost:5000/api')).toBe('localhost:5000');
    });

    it('excludes userinfo', () => {
      expect(hostOf('https://user:pass@example.com/test')).toBe('example.com');
    });

    it('still lower-cases a literal hostname', () => {
      expect(hostOf('https://EXAMPLE.COM/test')).toBe('example.com');
    });

    it('handles an ipv6 literal', () => {
      expect(hostOf('http://[::1]:8080/api')).toBe('[::1]:8080');
    });
  });

  describe('edge cases', () => {
    it('reads the host from a schemeless url', () => {
      expect(hostOf('example.com:8080/api')).toBe('example.com:8080');
    });

    it('reads the host from a protocol-relative url', () => {
      expect(hostOf('//example.com/api')).toBe('example.com');
    });

    it('preserves a variable in a protocol-relative url', () => {
      expect(hostOf('//{{HOST}}/api')).toBe('{{HOST}}');
    });

    it('returns an empty string for a path-only url', () => {
      expect(hostOf('/api/users')).toBe('');
    });

    it('returns an empty string for an empty url', () => {
      expect(hostOf('')).toBe('');
    });

    it('returns an empty string when url is missing', () => {
      expect(hostOf(undefined)).toBe('');
    });
  });
});
