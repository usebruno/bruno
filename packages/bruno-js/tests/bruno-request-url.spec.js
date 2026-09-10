const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');
const interpolateVars = require('../../bruno-electron/src/ipc/network/interpolate-vars');

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

const readUrl = (req) => ({
  host: req.getHost(),
  path: req.getPath(),
  queryString: req.getQueryString()
});

const runFlow = (url, { pathParams = [], envVars = {} } = {}) => {
  const request = { url, method: 'GET', headers: {}, pathParams };

  const preRequest = readUrl(new BrunoRequest(request));
  interpolateVars(request, envVars, {}, {}, {});
  const postResponse = readUrl(new BrunoRequest(request));

  return { preRequest, postResponse };
};

describe('request url as seen by pre-request and post-response scripts', () => {
  it('resolves a templated host, query and path params', () => {
    const flow = runFlow('{{BASEURL}}/path/:p1/:p2?a={{A}}', {
      pathParams: [
        { name: 'p1', value: '10' },
        { name: 'p2', value: '{{P2}}' }
      ],
      envVars: { BASEURL: 'https://api.example.com:8080', A: '1', P2: '20' }
    });

    expect(flow.preRequest).toEqual({
      host: '{{BASEURL}}',
      path: '/path/10/{{P2}}',
      queryString: 'a={{A}}'
    });

    expect(flow.postResponse).toEqual({
      host: 'api.example.com:8080',
      path: '/path/10/20',
      queryString: 'a=1'
    });
  });

  // without path params interpolateVars() keeps the fragment
  it('excludes a fragment in both phases', () => {
    const flow = runFlow('{{BASEURL}}/path?a={{A}}#section', {
      envVars: { BASEURL: 'https://api.example.com', A: '1' }
    });

    expect(flow.preRequest).toEqual({ host: '{{BASEURL}}', path: '/path', queryString: 'a={{A}}' });
    expect(flow.postResponse).toEqual({ host: 'api.example.com', path: '/path', queryString: 'a=1' });
  });

  it('excludes credentials in both phases', () => {
    const flow = runFlow('https://user:pass@{{HOST}}/path/:p1', {
      pathParams: [{ name: 'p1', value: '10' }],
      envVars: { HOST: 'api.example.com' }
    });

    expect(flow.preRequest).toEqual({ host: '{{HOST}}', path: '/path/10', queryString: '' });
    expect(flow.postResponse).toEqual({ host: 'api.example.com', path: '/path/10', queryString: '' });
  });

  it('keeps an undefined variable in the host, lowercased by the path param rewrite', () => {
    const flow = runFlow('{{BASEURL}}/path/:p1', {
      pathParams: [{ name: 'p1', value: '10' }],
      envVars: {}
    });

    expect(flow.preRequest).toEqual({ host: '{{BASEURL}}', path: '/path/10', queryString: '' });

    // the path param rewrite lowercases the host, so {{BASEURL}} becomes {{baseurl}}
    expect(flow.postResponse).toEqual({ host: '{{baseurl}}', path: '/path/10', queryString: '' });
  });
});
