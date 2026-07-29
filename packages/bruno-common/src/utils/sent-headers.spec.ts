import { describe, it, expect } from '@jest/globals';
import { parseSentHeaders, hasWireBlock, sentHeadersToObject } from './sent-headers';

describe('parseSentHeaders', () => {
  it('parses the serialized wire block, preserving name casing and dropping the request line', () => {
    const req = {
      _header: 'GET /headers HTTP/1.1\r\nHost: localhost:8081\r\nAccept-Encoding: gzip, deflate\r\nConnection: keep-alive\r\n\r\n'
    };

    expect(parseSentHeaders(req)).toEqual([
      { name: 'Host', value: 'localhost:8081' },
      { name: 'Accept-Encoding', value: 'gzip, deflate' },
      { name: 'Connection', value: 'keep-alive' }
    ]);
  });

  it('keeps a value that itself contains a colon (only splits on the first)', () => {
    const req = { _header: 'GET / HTTP/1.1\r\nHost: localhost:8081\r\nX-Time: 12:30:00\r\n\r\n' };

    expect(parseSentHeaders(req)).toContainEqual({ name: 'X-Time', value: '12:30:00' });
  });

  it('keeps every occurrence of a repeated header', () => {
    const req = { _header: 'GET / HTTP/1.1\r\nX-Multi: a\r\nX-Multi: b\r\n\r\n' };

    expect(parseSentHeaders(req)).toEqual([
      { name: 'X-Multi', value: 'a' },
      { name: 'X-Multi', value: 'b' }
    ]);
  });

  it('drops lines with no colon and lines with an empty name, but keeps empty values', () => {
    const req = {
      _header: 'GET / HTTP/1.1\r\nHost: localhost\r\nmalformed-no-colon\r\n: orphan-value\r\nX-Empty:\r\n\r\n'
    };

    expect(parseSentHeaders(req)).toEqual([
      { name: 'Host', value: 'localhost' },
      { name: 'X-Empty', value: '' }
    ]);
  });

  it('redacts proxy credentials, which come from preferences rather than the request', () => {
    const req = {
      _header: 'GET / HTTP/1.1\r\nHost: x\r\nProxy-Authorization: Basic dXNlcjpwYXNz\r\nProxy-Connection: Keep-Alive\r\n\r\n'
    };

    expect(parseSentHeaders(req)).toEqual([
      { name: 'Host', value: 'x' },
      { name: 'Proxy-Authorization', value: '<redacted>' },
      { name: 'Proxy-Connection', value: 'Keep-Alive' }
    ]);
  });

  it('redacts proxy credentials in the fallback path too, whatever the casing', () => {
    const req = { getHeaders: () => ({ 'PROXY-AUTHORIZATION': 'Basic secret' }) };

    expect(parseSentHeaders(req)).toEqual([{ name: 'PROXY-AUTHORIZATION', value: '<redacted>' }]);
  });

  describe('getHeaders() fallback', () => {
    it('is used when _header is unavailable, joining array values', () => {
      const req = { getHeaders: () => ({ 'host': 'localhost:8081', 'set-cookie': ['a=1', 'b=2'] }) };

      expect(parseSentHeaders(req)).toEqual([
        { name: 'host', value: 'localhost:8081' },
        { name: 'set-cookie', value: 'a=1, b=2' }
      ]);
    });

    it('stringifies a non-string value', () => {
      const req = { getHeaders: () => ({ 'content-length': 42 }) };

      expect(parseSentHeaders(req)).toEqual([{ name: 'content-length', value: '42' }]);
    });

    it('returns an empty list when neither source is present', () => {
      expect(parseSentHeaders({})).toEqual([]);
      expect(parseSentHeaders(null)).toEqual([]);
      expect(parseSentHeaders(undefined)).toEqual([]);
    });
  });
});

describe('hasWireBlock', () => {
  it('distinguishes the exact wire block from the lossy fallback', () => {
    // Callers that must match a packet capture depend on this: getHeaders() omits Connection and
    // Transfer-Encoding, which Node emits only while serializing.
    expect(hasWireBlock({ _header: 'GET / HTTP/1.1\r\nHost: x\r\n\r\n' })).toBe(true);
    expect(hasWireBlock({ getHeaders: () => ({ host: 'x' }) })).toBe(false);
    expect(hasWireBlock({})).toBe(false);
    expect(hasWireBlock(null)).toBe(false);
  });
});

describe('sentHeadersToObject', () => {
  it('folds a list into a name -> value object', () => {
    expect(sentHeadersToObject([
      { name: 'Host', value: 'localhost' },
      { name: 'Accept', value: '*/*' }
    ])).toEqual({ Host: 'localhost', Accept: '*/*' });
  });

  it('comma-joins repeated names, since consumers of this shape expect one entry per name', () => {
    expect(sentHeadersToObject([
      { name: 'X-Multi', value: 'a' },
      { name: 'X-Multi', value: 'b' }
    ])).toEqual({ 'X-Multi': 'a, b' });
  });

  it('returns an empty object for an empty list', () => {
    expect(sentHeadersToObject([])).toEqual({});
  });
});
