const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('@usebruno/js/src/bruno-request');
const interpolateVars = require('../../src/runner/interpolate-vars');

const runFlow = (url, { pathParams = [], envVars = {} } = {}) => {
  const request = { url, method: 'GET', headers: {}, pathParams };

  const templated = new BrunoRequest(request);
  const preRequest = {
    host: templated.getHost(),
    path: templated.getPath(),
    queryString: templated.getQueryString()
  };

  interpolateVars(request, envVars, {}, {});

  const resolved = new BrunoRequest(request);
  const postResponse = {
    host: resolved.getHost(),
    path: resolved.getPath(),
    queryString: resolved.getQueryString()
  };

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
});
