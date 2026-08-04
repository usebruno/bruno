import { resolveTimeoutSetting, toMaxRedirects, TIMEOUT_INHERIT } from './index';

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

describe('toMaxRedirects', () => {
  test('honours whole counts of 0 or more', () => {
    for (const value of [0, 5, 50, 51, 1000, Number.MAX_SAFE_INTEGER, 1e21, 1e31]) {
      expect(toMaxRedirects(value)).toBe(value);
    }
  });

  test('truncates fractional counts', () => {
    expect(toMaxRedirects(3.5)).toBe(3);
    expect(toMaxRedirects(0.9)).toBe(0);
  });

  test('falls back to the default for non-numbers', () => {
    for (const value of [null, undefined, '', '   ', '10', '-3', true, false, [], {}, 'abc']) {
      expect(toMaxRedirects(value)).toBe(5);
    }
  });

  test('falls back to the default for non-finite values', () => {
    for (const value of [Infinity, -Infinity, NaN, 1e309]) {
      expect(toMaxRedirects(value)).toBe(5);
    }
  });

  test('falls back to the default for negatives', () => {
    for (const value of [-1, -3, -0.5]) {
      expect(toMaxRedirects(value)).toBe(5);
    }
  });
});
