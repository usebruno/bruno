import { parse } from 'node:url';
import { shouldUseProxy } from './should-use-proxy';

describe('shouldUseProxy', () => {
  it.each([
    ['http://127.0.0.1:8080', '127.*', false],
    ['https://192.168.10.20', '192.168.*', false],
    ['https://10.1.2.3', '10.*', false],
    ['http://api.dev.example.com', 'api.*.example.com', false],
    ['http://api.eu.dev.example.com', 'api.*.example.com', false],
    ['http://api.dev.internal.example.com', 'api.*.internal.*', false],
    ['http://api.dev.example.com', 'api.*.internal.*', true],
    ['http://api.dev.example.com', 'api.**.example.com', false],
    ['http://api.example.com', '*example.com', false],
    ['http://notexample.com', '*example.com', false],
    ['http://example.com', '*.example.com', true],
    ['http://api.example.com', '*.example.com', false],
    ['http://api.example.com', '.example.com', false],
    ['http://example.com', '.example.com', true],
    ['http://example.com', 'example.com', false],
    ['http://api.example.com', 'example.com', true],
    ['http://example.com', '*', false],
    ['http://example.com', 'localhost, *', false],
    ['http://127.0.0.1', 'localhost; 127.* , 10.*', false],
    ['http://192.169.1.20', '192.168.*', true],
    ['http://x192.168.1.20', '192.168.*', true],
    ['http://192x168x1.example.com', '192.168.*', true],
    ['http://api.dev.example.com.evil', 'api.*.example.com', true],
    ['http://api.dev.example.com', 'api.*.example.co', true],
    ['http://api.dev.example.com', 'api[.]*.example.com', true],
    ['http://api.dev.example.com', 'api.*.example.com?', true],
    ['http://abc', 'ab*bc', true],
    ['http://ab', '*ab*ab', true],
    ['http://abbc', 'ab*bc', false],
    ['http://127.0.0.1:8080', '127.*:8080', false],
    ['http://127.0.0.1:8080', '127.*:8081', true],
    ['https://10.1.2.3', '10.*:443', false],
    ['http://10.1.2.3', '10.*:443', true],
    ['http://[::1]:8080', '[::1]:8080', false],
    ['http://[::1]:8080', '[::1]:8081', true],
    ['http://example.com', '', true],
    ['http://example.com', '   ', true],
    ['http://example.com', undefined, true]
  ])('routes %s with bypass=%s and proxy=%s', (url, bypass, useProxy) => {
    expect(shouldUseProxy(url, bypass)).toBe(useProxy);
  });

  it('accepts a parsed URL while retaining IPv6 brackets', () => {
    expect(shouldUseProxy(parse('http://[::1]:8080'), '[::1]:8080')).toBe(false);
  });

  it('does not proxy a URL without a scheme or host when bypass rules are present', () => {
    expect(shouldUseProxy('/relative-path', '127.*')).toBe(false);
  });
});
