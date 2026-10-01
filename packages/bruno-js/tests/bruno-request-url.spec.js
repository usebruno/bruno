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

  // new URL() re-encodes a query - a space becomes %20 but ':' and '=' do not - which matches neither
  // the url as written nor the one sent, so a resolved url's query is read as written like a templated one's
  it('reports the query string as written rather than re-encoding it', () => {
    const req = new BrunoRequest(makeRequest('https://api.example.com/path?test=a:b = c'));

    expect(req.getHost()).toBe('api.example.com');
    expect(req.getPath()).toBe('/path');
    expect(req.getQueryString()).toBe('test=a:b = c');
  });

  it('leaves an already encoded query string as it is', () => {
    const req = new BrunoRequest(makeRequest('https://api.example.com/path?test=a%3Ab%20%3D%20c'));

    expect(req.getQueryString()).toBe('test=a%3Ab%20%3D%20c');
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

  it('does not read a question mark inside the fragment as the query string', () => {
    const req = new BrunoRequest(makeRequest('https://api.example.com/path#section?a=1'));

    expect(req.getPath()).toBe('/path');
    expect(req.getQueryString()).toBe('');
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
