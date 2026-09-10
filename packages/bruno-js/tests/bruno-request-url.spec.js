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
    const pathParams = [
      { name: 'p1', value: '10' },
      { name: 'p2', value: '{{P2}}' }
    ];
    const req = new BrunoRequest(makeRequest('{{BASEURL}}/path/:p1/:p2', { pathParams }));

    expect(req.getPath()).toBe('/path/10/{{P2}}');
  });

  it('excludes credentials from the host', () => {
    const req = new BrunoRequest(makeRequest('https://user:p@ss@api.example.com:8080/path?a=1'));

    expect(req.getHost()).toBe('api.example.com:8080');
    expect(req.getPath()).toBe('/path');
    expect(req.getQueryString()).toBe('a=1');
  });

  it('excludes the fragment from the path and the query string', () => {
    const req = new BrunoRequest(makeRequest('https://api.example.com/path?a=1#section'));

    expect(req.getHost()).toBe('api.example.com');
    expect(req.getPath()).toBe('/path');
    expect(req.getQueryString()).toBe('a=1');
  });

  it('reports an empty string when there is no url', () => {
    const req = new BrunoRequest(makeRequest(''));

    expect(req.getHost()).toBe('');
    expect(req.getPath()).toBe('');
    expect(req.getQueryString()).toBe('');
  });

  it('applies path params to a path followed by a fragment', () => {
    const request = makeRequest('{{BASEURL}}/path/:p1#section', { pathParams: [{ name: 'p1', value: '10' }] });
    const req = new BrunoRequest(request);

    expect(req.getPath()).toBe('/path/10');
  });
});

// post-response scripts run after interpolation, so req.url is already resolved
describe('BrunoRequest - getHost(), getPath(), getQueryString() after interpolation', () => {
  it('reports a resolved url without applying the path params a second time', () => {
    const request = makeRequest('https://api.example.com:8080/path/10/20?a=1', {
      pathParams: [
        { name: 'p1', value: '10' },
        { name: 'p2', value: '20' }
      ]
    });
    const req = new BrunoRequest(request);

    expect(req.getHost()).toBe('api.example.com:8080');
    expect(req.getPath()).toBe('/path/10/20');
    expect(req.getQueryString()).toBe('a=1');
  });

  // interpolateVars() only strips the fragment when path params exist
  it('excludes a fragment that survived interpolation', () => {
    const req = new BrunoRequest(makeRequest('https://api.example.com/path?a=1#section'));

    expect(req.getHost()).toBe('api.example.com');
    expect(req.getPath()).toBe('/path');
    expect(req.getQueryString()).toBe('a=1');
  });
});
