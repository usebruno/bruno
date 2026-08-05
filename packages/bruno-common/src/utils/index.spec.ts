import { parseMaxRedirects, resolveTimeoutSetting, toMaxRedirects, DEFAULT_MAX_REDIRECTS, TIMEOUT_INHERIT } from './index';

describe('resolveTimeoutSetting', () => {
  test('preserves the "inherit" sentinel', () => {
    expect(resolveTimeoutSetting(TIMEOUT_INHERIT)).toBe(TIMEOUT_INHERIT);
    expect(resolveTimeoutSetting('inherit')).toBe(TIMEOUT_INHERIT);
  });

  test('preserves finite, positive numbers', () => {
    expect(resolveTimeoutSetting(1)).toBe(1);
    expect(resolveTimeoutSetting(30000)).toBe(30000);
    expect(resolveTimeoutSetting(0.5)).toBe(0.5);
  });

  test('falls back to 0 for zero and negative numbers', () => {
    expect(resolveTimeoutSetting(0)).toBe(0);
    expect(resolveTimeoutSetting(-1)).toBe(0);
    expect(resolveTimeoutSetting(-30000)).toBe(0);
  });

  test('falls back to 0 for NaN and ±Infinity', () => {
    expect(resolveTimeoutSetting(NaN)).toBe(0);
    expect(resolveTimeoutSetting(Infinity)).toBe(0);
    expect(resolveTimeoutSetting(-Infinity)).toBe(0);
  });

  test('falls back to 0 for null, undefined and non-numeric values', () => {
    expect(resolveTimeoutSetting(null)).toBe(0);
    expect(resolveTimeoutSetting(undefined)).toBe(0);
    expect(resolveTimeoutSetting('30000')).toBe(0);
    expect(resolveTimeoutSetting({})).toBe(0);
    expect(resolveTimeoutSetting([])).toBe(0);
    expect(resolveTimeoutSetting(true)).toBe(0);
  });
});

// The accept-and-truncate rule itself is covered on parseMaxRedirects below; this only pins
// the fallback toMaxRedirects adds on top.
describe('toMaxRedirects', () => {
  test('passes usable values through and falls back to the default for the rest', () => {
    expect(toMaxRedirects(51)).toBe(51);
    expect(toMaxRedirects(3.5)).toBe(3);
    for (const value of [null, undefined, '10', -1, NaN, Infinity]) {
      expect(toMaxRedirects(value)).toBe(DEFAULT_MAX_REDIRECTS);
    }
  });
});

describe('parseMaxRedirects', () => {
  test('keeps whole numbers of 0 or more', () => {
    expect(parseMaxRedirects(0)).toBe(0);
    expect(parseMaxRedirects(5)).toBe(5);
    expect(parseMaxRedirects(51)).toBe(51);
    expect(parseMaxRedirects(1000)).toBe(1000);
    expect(parseMaxRedirects(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseMaxRedirects(1e21)).toBe(1e21);
  });

  test('truncates fractions', () => {
    expect(parseMaxRedirects(3.5)).toBe(3);
    expect(parseMaxRedirects(0.9)).toBe(0);
  });

  test('yields undefined for negatives', () => {
    expect(parseMaxRedirects(-1)).toBeUndefined();
    expect(parseMaxRedirects(-0.5)).toBeUndefined();
  });

  test('yields undefined for NaN and ±Infinity', () => {
    expect(parseMaxRedirects(NaN)).toBeUndefined();
    expect(parseMaxRedirects(Infinity)).toBeUndefined();
    expect(parseMaxRedirects(-Infinity)).toBeUndefined();
  });

  test('yields undefined for null, undefined and non-numeric values', () => {
    expect(parseMaxRedirects(null)).toBeUndefined();
    expect(parseMaxRedirects(undefined)).toBeUndefined();
    expect(parseMaxRedirects('10')).toBeUndefined();
    expect(parseMaxRedirects(true)).toBeUndefined();
    expect(parseMaxRedirects({})).toBeUndefined();
    expect(parseMaxRedirects([])).toBeUndefined();
  });
});
