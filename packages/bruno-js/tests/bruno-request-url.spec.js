const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const makeRequest = (overrides = {}) => ({
  url: 'https://api.example.com/path',
  method: 'GET',
  headers: {},
  ...overrides
});

describe('BrunoRequest - getHost(), getPath(), getQueryString()', () => {
  describe('resolved urls', () => {
    it('returns the host, path and query string', () => {
      const req = new BrunoRequest(makeRequest({ url: 'https://api.example.com/path/10?a=1&b=2' }));

      expect(req.getHost()).toBe('api.example.com');
      expect(req.getPath()).toBe('/path/10');
      expect(req.getQueryString()).toBe('a=1&b=2');
    });
  });

  // pre-request scripts run before the request is interpolated, so req.url is still a template
  describe('templated urls', () => {
    it('reports the template as written rather than resolving it', () => {
      const req = new BrunoRequest(makeRequest({ url: '{{BASEURL}}/path?a=1&b={{B}}' }));

      expect(req.getHost()).toBe('{{BASEURL}}');
      expect(req.getPath()).toBe('/path');
      expect(req.getQueryString()).toBe('a=1&b={{B}}');
    });

    it('reports a template that is only part of the host', () => {
      const req = new BrunoRequest(makeRequest({ url: 'https://{{ENV}}.example.com/path' }));

      expect(req.getHost()).toBe('{{ENV}}.example.com');
      expect(req.getPath()).toBe('/path');
    });

    it('reports a template inside the path and query', () => {
      const req = new BrunoRequest(makeRequest({ url: 'https://api.example.com/{{path}}/users?a={{x}}' }));

      expect(req.getHost()).toBe('api.example.com');
      expect(req.getPath()).toBe('/{{path}}/users');
      expect(req.getQueryString()).toBe('a={{x}}');
    });

    it('reports a variable used as the port', () => {
      const req = new BrunoRequest(makeRequest({ url: 'https://api.example.com:{{PORT}}/path' }));

      expect(req.getHost()).toBe('api.example.com:{{PORT}}');
      expect(req.getPath()).toBe('/path');
    });

    it('reports a variable used as the scheme', () => {
      const req = new BrunoRequest(makeRequest({ url: '{{PROTO}}://{{HOST}}/path' }));

      expect(req.getHost()).toBe('{{HOST}}');
      expect(req.getPath()).toBe('/path');
    });

    it('drops the user:password@ prefix and the #fragment', () => {
      const req = new BrunoRequest(makeRequest({ url: 'https://user:pass@{{HOST}}:8080/path?a=1#top' }));

      expect(req.getHost()).toBe('{{HOST}}:8080');
      expect(req.getPath()).toBe('/path');
      expect(req.getQueryString()).toBe('a=1');
    });

    it('applies path params, leaving templated values as written', () => {
      const req = new BrunoRequest(
        makeRequest({
          url: '{{BASEURL}}/path/:p1/:p2',
          pathParams: [
            { name: 'p1', value: '10' },
            { name: 'p2', value: '{{P2}}' }
          ]
        })
      );

      expect(req.getPath()).toBe('/path/10/{{P2}}');
    });
  });
});
