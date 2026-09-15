const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const queryOf = (url) => new BrunoRequest({ url, method: 'GET', headers: {} }).getQueryString();

describe('BrunoRequest - getQueryString()', () => {
  describe('returns the query exactly as written', () => {
    // The reported case: `new URL().search` escaped the spaces but not `:` or
    // `=`, giving `test=a:b%20=%20c` - neither the URL bar's `a:b = c` nor the
    // `a%3Ab%20%3D%20c` Bruno puts on the wire.
    it('does not re-encode spaces alongside unescaped punctuation', () => {
      expect(queryOf('https://example.com?test=a:b = c')).toBe('test=a:b = c');
    });

    it('leaves an already-encoded query untouched', () => {
      expect(queryOf('https://example.com?test=a%3Ab%20%3D%20c')).toBe('test=a%3Ab%20%3D%20c');
    });

    it('preserves template variables', () => {
      expect(queryOf('https://example.com/api?token={{TOKEN}}&id=1')).toBe('token={{TOKEN}}&id=1');
    });

    it('keeps multiple params in order', () => {
      expect(queryOf('https://example.com/api?b=2&a=1')).toBe('b=2&a=1');
    });

    it('keeps a param with no value', () => {
      expect(queryOf('https://example.com/api?flag')).toBe('flag');
    });

    it('keeps an empty value', () => {
      expect(queryOf('https://example.com/api?a=')).toBe('a=');
    });
  });

  describe('structure is unchanged', () => {
    it('drops the leading question mark', () => {
      expect(queryOf('https://example.com/api?a=1')).toBe('a=1');
    });

    it('stops at a fragment, matching URL.search', () => {
      expect(queryOf('https://example.com/api?a=1#section')).toBe('a=1');
    });

    it('splits on the first question mark only', () => {
      expect(queryOf('https://example.com/api?a=1?2')).toBe('a=1?2');
    });

    it('returns an empty string when there is no query', () => {
      expect(queryOf('https://example.com/api')).toBe('');
    });

    it('returns an empty string for a bare question mark', () => {
      expect(queryOf('https://example.com/api?')).toBe('');
    });

    it('returns an empty string when url is missing', () => {
      expect(queryOf(undefined)).toBe('');
    });
  });

  it('reads the query from a schemeless url', () => {
    expect(queryOf('localhost:3000/api?a=1')).toBe('a=1');
  });
});
