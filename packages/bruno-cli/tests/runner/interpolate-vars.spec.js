const { describe, it, expect } = require('@jest/globals');
const interpolateVars = require('../../src/runner/interpolate-vars');

describe('interpolate-vars: api key header name sidecar', () => {
  it('interpolates apiKeyHeaderName in lockstep with interpolated header keys', () => {
    const request = {
      url: 'https://example.com',
      mode: 'none',
      headers: {
        '{{api_header_name}}': '{{api_key_value}}'
      },
      apiKeyHeaderName: '{{api_header_name}}',
      pathParams: []
    };

    interpolateVars(
      request,
      {
        api_header_name: 'X-API-Key',
        api_key_value: 'secret-key-value'
      },
      {},
      {}
    );

    expect(request.headers).toEqual({
      'X-API-Key': 'secret-key-value'
    });
    expect(request.apiKeyHeaderName).toEqual('X-API-Key');
  });
});

describe('interpolate-vars: path-param encoding (issue #7356)', () => {
  it('encodes / inside path-param value when settings.encodeUrl is true', () => {
    const request = {
      method: 'GET',
      url: 'http://example.com/users/:id/profile',
      settings: { encodeUrl: true },
      pathParams: [{ type: 'path', name: 'id', value: 'aaa/bbb' }]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toBe('http://example.com/users/aaa%2Fbbb/profile');
  });

  it('does NOT encode path-param value when settings.encodeUrl is false', () => {
    const request = {
      method: 'GET',
      url: 'http://example.com/users/:id/profile',
      settings: { encodeUrl: false },
      pathParams: [{ type: 'path', name: 'id', value: 'aaa/bbb' }]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toBe('http://example.com/users/aaa/bbb/profile');
  });

  it('encodes # and spaces inside path-param value when settings.encodeUrl is true', () => {
    const request = {
      method: 'GET',
      url: 'http://example.com/users/:id',
      settings: { encodeUrl: true },
      pathParams: [{ type: 'path', name: 'id', value: 'John#Doe Jr' }]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toBe('http://example.com/users/John%23Doe%20Jr');
  });
});
