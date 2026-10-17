import { normalizeOmitHeaders } from './omit-headers';

describe('normalizeOmitHeaders', () => {
  it('normalizes valid omitHeaders lists', () => {
    expect(normalizeOmitHeaders([' User-Agent ', 'Accept-Encoding'])).toEqual(['User-Agent', 'Accept-Encoding']);
    expect(normalizeOmitHeaders(['User-Agent', ''])).toEqual(['User-Agent']);
    expect(normalizeOmitHeaders([null, 42, ' User-Agent '])).toEqual(['User-Agent']);
  });

  it('returns undefined for empty or invalid input', () => {
    expect(normalizeOmitHeaders(undefined)).toBeUndefined();
    expect(normalizeOmitHeaders([])).toBeUndefined();
    expect(normalizeOmitHeaders(['', '  '])).toBeUndefined();
    expect(normalizeOmitHeaders(null)).toBeUndefined();
  });
});
