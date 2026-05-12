import { buildHarRequest } from './har';

// Minimal request shape that satisfies createHeaders / createQuery / createPostData
const makeRequest = (url, overrides = {}) => ({
  method: 'GET',
  url,
  body: { mode: 'none' },
  params: [],
  auth: { mode: 'none' },
  ...overrides
});

describe('buildHarRequest – URL sanity gate', () => {
  describe('accepts valid-looking URLs', () => {
    const accepted = [
      'http://example.com',
      'https://example.com',
      'https://example.com/path',
      'https://example.com/path?q=v',
      'https://example.com/path?q=v#frag',
      'https://user:pass@example.com/path',
      'https://example.com:8080/path',
      // Pre-encoded chars that URL.canParse previously rejected — must pass now
      'https://example.com/list%5B1%5D',
      'https://example.com/path/50%25',
      'https://example.com/api/Jos%C3%A9',
      // Pre-encoded chars that URL.canParse previously accepted — must still pass
      'https://example.com/path/a%20b',
      'https://example.com/api?q=hello%20world',
      // Custom schemes
      'ftp://example.com/file',
      'ws://example.com/socket'
    ];

    it.each(accepted)('accepts %s', (url) => {
      expect(() => buildHarRequest({ request: makeRequest(url), headers: [] })).not.toThrow();
    });
  });

  describe('rejects garbage', () => {
    const rejected = [
      '',
      'not a url',
      'example.com', // no scheme
      'example.com/path?q=v', // no scheme
      '://example.com', // missing scheme name
      'https://', // missing authority
      'https:///', // missing authority
      undefined,
      null
    ];

    it.each(rejected)('rejects %s', (url) => {
      expect(() => buildHarRequest({ request: makeRequest(url), headers: [] })).toThrow('invalid request url');
    });
  });

  it('returns a HAR-shaped object for a valid URL', () => {
    const result = buildHarRequest({
      request: makeRequest('https://example.com/api/users', { method: 'POST' }),
      headers: []
    });

    expect(result).toMatchObject({
      method: 'POST',
      url: 'https://example.com/api/users',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headersSize: 0,
      bodySize: 0,
      binary: true
    });
  });
});
