/**
 * Tests for the URL protocol normalization logic used in run-single-request.js.
 *
 * hasExplicitScheme from @usebruno/common is the single source of truth.
 * The key regression: `localhost:8080` was wrongly left without an http:// prefix
 * because the old regex matched the port colon as a scheme separator.
 */

const { describe, it, expect } = require('@jest/globals');
const { hasExplicitScheme } = require('@usebruno/common').utils;

function normalizeUrl(url) {
  return hasExplicitScheme(url) ? url : `http://${url}`;
}

describe('hasExplicitScheme / URL normalization (run-single-request)', () => {
  // should prepend http://
  const shouldPrepend = [
    ['bare hostname', 'test-domain', 'http://test-domain'],
    ['localhost:port (regression)', 'localhost:8080', 'http://localhost:8080'],
    ['localhost no port', 'localhost', 'http://localhost'],
    ['127.0.0.1:port', '127.0.0.1:3000', 'http://127.0.0.1:3000'],
    ['bare IP', '192.168.1.1', 'http://192.168.1.1'],
    ['IP:port', '192.168.1.1:8080', 'http://192.168.1.1:8080'],
    ['hostname with path', 'example.com/api/v1', 'http://example.com/api/v1'],
    ['localhost:port/path', 'localhost:8080/path', 'http://localhost:8080/path']
  ];

  for (const [label, input, expected] of shouldPrepend) {
    it(`prepends http:// — ${label}`, () => {
      expect(normalizeUrl(input)).toEqual(expected);
    });
  }

  // should not prepend http://
  const shouldKeep = [
    ['http://', 'http://example.com'],
    ['https://', 'https://example.com'],
    ['ftp://', 'ftp://test-domain'],
    ['ws://', 'ws://example.com/socket'],
    ['wss://', 'wss://example.com/socket'],
    ['custom scheme', 'myapp://deep-link']
  ];

  for (const [label, url] of shouldKeep) {
    it(`does not prepend http:// — ${label}`, () => {
      expect(normalizeUrl(url)).toEqual(url);
    });
  }
});
