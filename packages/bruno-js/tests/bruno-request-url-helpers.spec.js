const { describe, it, expect } = require('@jest/globals');
const { interpolate } = require('@usebruno/common');
const BrunoRequest = require('../src/bruno-request');

const makeReq = (overrides = {}) => ({
  url: 'https://example.com/api',
  method: 'GET',
  headers: {},
  data: undefined,
  ...overrides
});

const createInterpolator = (vars) => (str) => interpolate(str, vars);

describe('BrunoRequest - URL helpers', () => {
  describe('without an interpolator', () => {
    it('parses a literal URL', () => {
      const req = new BrunoRequest(makeReq({ url: 'https://example.com:8080/api/users?page=2' }));

      expect(req.getHost()).toBe('example.com:8080');
      expect(req.getPath()).toBe('/api/users');
      expect(req.getQueryString()).toBe('page=2');
    });
  });

  describe('with an interpolator', () => {
    it('resolves a host variable that includes the scheme', () => {
      const req = new BrunoRequest(makeReq({ url: '{{HOST}}/test' }), {
        interpolate: createInterpolator({ HOST: 'https://example.com' })
      });

      expect(req.getHost()).toBe('example.com');
    });

    it('resolves a host variable that follows a literal scheme without lowercasing the variable name', () => {
      const req = new BrunoRequest(makeReq({ url: 'https://{{HOST}}/test' }), {
        interpolate: createInterpolator({ HOST: 'example.com' })
      });

      expect(req.getHost()).toBe('example.com');
    });

    it('resolves host and port variables', () => {
      const req = new BrunoRequest(makeReq({ url: 'https://{{HOST}}:{{PORT}}/test' }), {
        interpolate: createInterpolator({ HOST: 'example.com', PORT: '8080' })
      });

      expect(req.getHost()).toBe('example.com:8080');
    });

    it('resolves variables in getPath() and getQueryString()', () => {
      const req = new BrunoRequest(
        makeReq({
          url: '{{baseUrl}}/users/:userId?name={{name}}&age=30',
          pathParams: [{ name: 'userId', value: '123', type: 'path' }]
        }),
        { interpolate: createInterpolator({ baseUrl: 'https://example.com/api', name: 'john' }) }
      );

      expect(req.getPath()).toBe('/api/users/123');
      expect(req.getQueryString()).toBe('name=john&age=30');
    });

    it('uses the variable values at call time', () => {
      const vars = { HOST: 'https://example.com' };
      const req = new BrunoRequest(makeReq({ url: '{{HOST}}/test' }), {
        interpolate: createInterpolator(vars)
      });

      vars.HOST = 'https://api.example.com';

      expect(req.getHost()).toBe('api.example.com');
    });

    it('leaves the raw URL untouched', () => {
      const rawReq = makeReq({ url: '{{HOST}}/test' });
      const req = new BrunoRequest(rawReq, {
        interpolate: createInterpolator({ HOST: 'https://example.com' })
      });

      req.getHost();

      expect(req.getUrl()).toBe('{{HOST}}/test');
      expect(rawReq.url).toBe('{{HOST}}/test');
    });

    it('returns an empty string when the resolved URL is not parseable', () => {
      const req = new BrunoRequest(makeReq({ url: '{{HOST}}/test' }), {
        interpolate: createInterpolator({})
      });

      expect(req.getHost()).toBe('');
    });
  });
});
