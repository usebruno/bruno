const { describe, it, expect } = require('@jest/globals');
import { normalizeDomain, disableOtherCertsOnSameDomain } from './cert-utils';

describe('normalizeDomain', () => {
  it('should trim and lowercase a domain', () => {
    expect(normalizeDomain('  Example.COM  ')).toBe('example.com');
  });

  it('should return empty string for null/undefined', () => {
    expect(normalizeDomain(null)).toBe('');
    expect(normalizeDomain(undefined)).toBe('');
  });

  it('should return empty string for whitespace-only', () => {
    expect(normalizeDomain('   ')).toBe('');
  });
});

describe('disableOtherCertsOnSameDomain', () => {
  const makeCert = (domain, enabled = true, name = '') => ({
    domain,
    type: 'cert',
    name,
    enabled,
    certFilePath: 'cert.pem',
    keyFilePath: 'key.pem',
    passphrase: ''
  });

  it('should disable other certs on the same domain', () => {
    const certs = [
      makeCert('example.com', true, 'A'),
      makeCert('example.com', true, 'B'),
      makeCert('other.com', true, 'C')
    ];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com');

    expect(result[0].enabled).toBe(false);
    expect(result[1].enabled).toBe(false);
    expect(result[2].enabled).toBe(true);
  });

  it('should exclude the specified index from being disabled', () => {
    const certs = [
      makeCert('example.com', true, 'A'),
      makeCert('example.com', true, 'B'),
      makeCert('example.com', true, 'C')
    ];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com', 1);

    expect(result[0].enabled).toBe(false);
    expect(result[1].enabled).toBe(true); // excluded
    expect(result[2].enabled).toBe(false);
  });

  it('should return certs unchanged when domain is empty', () => {
    const certs = [
      makeCert('example.com', true, 'A'),
      makeCert('', true, 'B')
    ];

    const result = disableOtherCertsOnSameDomain(certs, '');

    expect(result[0].enabled).toBe(true);
    expect(result[1].enabled).toBe(true);
  });

  it('should handle case-insensitive domain matching', () => {
    const certs = [
      makeCert('Example.COM', true, 'A'),
      makeCert('example.com', true, 'B')
    ];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com');

    expect(result[0].enabled).toBe(false);
    expect(result[1].enabled).toBe(false);
  });

  it('should handle domains with whitespace', () => {
    const certs = [
      makeCert('  example.com  ', true, 'A'),
      makeCert('example.com', true, 'B')
    ];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com');

    expect(result[0].enabled).toBe(false);
    expect(result[1].enabled).toBe(false);
  });

  describe('radio-style toggle simulation', () => {
    it('should enable one cert and disable others on same domain (toggle on)', () => {
      const certs = [
        makeCert('api.example.com', false, 'Production'),
        makeCert('api.example.com', true, 'Staging'),
        makeCert('other.com', true, 'Other')
      ];

      // Simulating: user clicks to enable index 0
      const indexToToggle = 0;
      const targetDomain = normalizeDomain(certs[indexToToggle].domain);
      let nextCerts = disableOtherCertsOnSameDomain(certs, targetDomain, indexToToggle);
      nextCerts[indexToToggle] = { ...nextCerts[indexToToggle], enabled: true };

      expect(nextCerts[0].enabled).toBe(true); // toggled on
      expect(nextCerts[1].enabled).toBe(false); // same domain, disabled
      expect(nextCerts[2].enabled).toBe(true); // different domain, unchanged
    });

    it('should allow disabling a cert without affecting others (toggle off)', () => {
      const certs = [
        makeCert('api.example.com', true, 'Production'),
        makeCert('api.example.com', false, 'Staging')
      ];

      // Simulating: user clicks to disable index 0 (already enabled)
      const indexToToggle = 0;
      const shouldEnable = certs[indexToToggle].enabled === false; // false, so toggling off
      let nextCerts = [...certs];
      nextCerts[indexToToggle] = { ...nextCerts[indexToToggle], enabled: shouldEnable };

      expect(nextCerts[0].enabled).toBe(false); // toggled off
      expect(nextCerts[1].enabled).toBe(false); // unchanged
    });
  });
});
