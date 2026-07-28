import { resolveTimeoutSetting, TIMEOUT_INHERIT } from './index';

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
