const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const makeRequest = (url, overrides = {}) => ({
  url,
  method: 'GET',
  headers: {},
  ...overrides
});

describe('BrunoRequest - getHost(), getPath(), getQueryString()', () => {
  it('reports a resolved url', () => {
    const req = new BrunoRequest(makeRequest('https://api.example.com/path/10?a=1&b=2'));

    expect(req.getHost()).toBe('api.example.com');
    expect(req.getPath()).toBe('/path/10');
    expect(req.getQueryString()).toBe('a=1&b=2');
  });

  // pre-request scripts run before the request is interpolated, so req.url is still a template
  it('reports a templated url as written rather than resolving it', () => {
    const req = new BrunoRequest(makeRequest('{{BASEURL}}/path?a={{A}}'));

    expect(req.getHost()).toBe('{{BASEURL}}');
    expect(req.getPath()).toBe('/path');
    expect(req.getQueryString()).toBe('a={{A}}');
  });

  it('reports a variable anywhere in the url', () => {
    const req = new BrunoRequest(makeRequest('{{PROTO}}://{{ENV}}.example.com:{{PORT}}/{{path}}?a={{A}}'));

    expect(req.getHost()).toBe('{{ENV}}.example.com:{{PORT}}');
    expect(req.getPath()).toBe('/{{path}}');
    expect(req.getQueryString()).toBe('a={{A}}');
  });

  it('applies path params, leaving templated values as written', () => {
    const req = new BrunoRequest(
      makeRequest('{{BASEURL}}/path/:p1/:p2', {
        pathParams: [
          { name: 'p1', value: '10' },
          { name: 'p2', value: '{{P2}}' }
        ]
      })
    );

    expect(req.getPath()).toBe('/path/10/{{P2}}');
  });
});
