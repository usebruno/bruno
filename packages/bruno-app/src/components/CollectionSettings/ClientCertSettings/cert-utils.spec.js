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
  const makeCert = (domain, enabled = true) => ({ domain, enabled });

  it('should disable other certs on the same domain', () => {
    const certs = [
      makeCert('example.com'),
      makeCert('example.com'),
      makeCert('other.com')
    ];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com');

    expect(result[0].enabled).toBe(false);
    expect(result[1].enabled).toBe(false);
    expect(result[2].enabled).toBe(true);
  });

  it('should exclude the specified index from being disabled', () => {
    const certs = [
      makeCert('example.com'),
      makeCert('example.com'),
      makeCert('example.com')
    ];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com', 1);

    expect(result[0].enabled).toBe(false);
    expect(result[1].enabled).toBe(true);
    expect(result[2].enabled).toBe(false);
  });

  it('should return certs unchanged when domain is empty', () => {
    const certs = [makeCert('example.com'), makeCert('')];

    const result = disableOtherCertsOnSameDomain(certs, '');

    expect(result[0].enabled).toBe(true);
    expect(result[1].enabled).toBe(true);
  });

  it('should handle case-insensitive domain matching', () => {
    const certs = [makeCert('Example.COM'), makeCert('example.com')];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com');

    expect(result[0].enabled).toBe(false);
    expect(result[1].enabled).toBe(false);
  });

  it('should leave certs without a domain untouched', () => {
    const certs = [{ enabled: true }, makeCert('example.com')];

    const result = disableOtherCertsOnSameDomain(certs, 'example.com');

    expect(result[0].enabled).toBe(true);
    expect(result[1].enabled).toBe(false);
  });
});
