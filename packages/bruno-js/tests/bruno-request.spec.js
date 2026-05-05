const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

describe('BrunoRequest', () => {
  describe('getPath()', () => {
    it('returns pathname for full URL', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/api/users',
        method: 'GET',
        headers: {},
        pathParams: []
      });
      expect(req.getPath()).toBe('/api/users');
    });

    it('returns path with path params interpolated', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/api/users/:userId',
        method: 'GET',
        headers: {},
        pathParams: [{ name: 'userId', value: '123', type: 'path' }]
      });
      expect(req.getPath()).toBe('/api/users/123');
    });

    it('returns path when URL has unresolved vars (e.g. {{BASEURL}}/path)', () => {
      const req = new BrunoRequest({
        url: '{{BASEURL}}/path/:p1/:p2',
        method: 'GET',
        headers: {},
        pathParams: [
          { name: 'p1', value: 'value1', type: 'path' },
          { name: 'p2', value: 'value2', type: 'path' }
        ]
      });
      expect(req.getPath()).toBe('/path/value1/value2');
    });

    it('strips query string when parsing unparseable URL', () => {
      const req = new BrunoRequest({
        url: '{{BASEURL}}/path?foo=bar',
        method: 'GET',
        headers: {},
        pathParams: []
      });
      expect(req.getPath()).toBe('/path');
    });

    it('returns empty string when req.url is missing', () => {
      const req = new BrunoRequest({
        url: undefined,
        method: 'GET',
        headers: {},
        pathParams: []
      });
      expect(req.getPath()).toBe('');
    });

    it('returns path when URL has protocol with template host (e.g. https://{{HOST}}/path)', () => {
      const req = new BrunoRequest({
        url: 'https://{{HOST}}/api/users',
        method: 'GET',
        headers: {},
        pathParams: []
      });
      expect(req.getPath()).toBe('/api/users');
    });
  });
});
