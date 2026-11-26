import {
  normalizeProxyTargetProtocols,
  isProxyEnabledForUrl,
  serializeProxyTargetProtocols
} from './proxy';

describe('proxy target protocol helpers', () => {
  describe('normalizeProxyTargetProtocols', () => {
    test('defaults both http and https to true when undefined or null', () => {
      expect(normalizeProxyTargetProtocols(undefined)).toEqual({ http: true, https: true });
      expect(normalizeProxyTargetProtocols(null)).toEqual({ http: true, https: true });
      expect(normalizeProxyTargetProtocols({})).toEqual({ http: true, https: true });
    });

    test('preserves explicit false flags while defaulting missing keys to true', () => {
      expect(normalizeProxyTargetProtocols({ http: false })).toEqual({ http: false, https: true });
      expect(normalizeProxyTargetProtocols({ https: false })).toEqual({ http: true, https: false });
      expect(normalizeProxyTargetProtocols({ http: false, https: false })).toEqual({ http: false, https: false });
    });
  });

  describe('isProxyEnabledForUrl', () => {
    test('allows both http and https URLs by default', () => {
      expect(isProxyEnabledForUrl(undefined, 'http://example.com')).toBe(true);
      expect(isProxyEnabledForUrl(undefined, 'https://example.com')).toBe(true);
    });

    test('routes only https when http is disabled', () => {
      const targetProtocols = { http: false, https: true };
      expect(isProxyEnabledForUrl(targetProtocols, 'http://example.com/test')).toBe(false);
      expect(isProxyEnabledForUrl(targetProtocols, 'https://example.com/test')).toBe(true);
    });

    test('routes only http when https is disabled', () => {
      const targetProtocols = { http: true, https: false };
      expect(isProxyEnabledForUrl(targetProtocols, 'http://example.com/test')).toBe(true);
      expect(isProxyEnabledForUrl(targetProtocols, 'https://example.com/test')).toBe(false);
    });

    test('handles interpolated or non-URL strings gracefully', () => {
      const targetProtocols = { http: false, https: true };
      expect(isProxyEnabledForUrl(targetProtocols, 'http://{{host}}/path')).toBe(false);
      expect(isProxyEnabledForUrl(targetProtocols, 'https://{{host}}/path')).toBe(true);
    });
  });

  describe('serializeProxyTargetProtocols', () => {
    test('returns undefined when both protocols are enabled', () => {
      expect(serializeProxyTargetProtocols(undefined)).toBeUndefined();
      expect(serializeProxyTargetProtocols({ http: true, https: true })).toBeUndefined();
    });

    test('returns normalized map when either protocol is disabled', () => {
      expect(serializeProxyTargetProtocols({ http: false, https: true })).toEqual({ http: false, https: true });
      expect(serializeProxyTargetProtocols({ http: true, https: false })).toEqual({ http: true, https: false });
    });
  });
});
