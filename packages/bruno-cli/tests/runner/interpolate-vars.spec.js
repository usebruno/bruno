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

describe('interpolate-vars: queryParams append to URL', () => {
  // Regression coverage for https://github.com/usebruno/bruno/issues/1681
  // The CLI used to drop params:query entries entirely; only path params were honoured.

  it('appends a single query param to a URL with no existing query string', () => {
    const request = {
      url: 'https://example.com/api',
      mode: 'none',
      headers: {},
      pathParams: [],
      queryParams: [{ name: 'foo', value: 'bar', type: 'query', enabled: true }]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toEqual('https://example.com/api?foo=bar');
  });

  it('appends multiple query params and preserves order', () => {
    const request = {
      url: 'https://example.com/api',
      mode: 'none',
      headers: {},
      pathParams: [],
      queryParams: [
        { name: 'a', value: '1', type: 'query', enabled: true },
        { name: 'b', value: '2', type: 'query', enabled: true }
      ]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toEqual('https://example.com/api?a=1&b=2');
  });

  it('interpolates {{vars}} in query param names and values', () => {
    const request = {
      url: 'https://example.com/api',
      mode: 'none',
      headers: {},
      pathParams: [],
      queryParams: [
        { name: '{{paramName}}', value: '{{paramValue}}', type: 'query', enabled: true }
      ]
    };

    interpolateVars(request, { paramName: 'q', paramValue: 'hello world' }, {}, {});

    // 'hello world' should be percent-encoded by URLSearchParams
    expect(request.url).toEqual('https://example.com/api?q=hello+world');
  });

  it('does not duplicate params already present in the URL (URL value wins)', () => {
    // Matches the shape produced by the GUI: same param in URL and params:query.
    const request = {
      url: 'https://example.com/api?foo=urlValue',
      mode: 'none',
      headers: {},
      pathParams: [],
      queryParams: [
        { name: 'foo', value: 'paramsValue', type: 'query', enabled: true },
        { name: 'bar', value: 'newValue', type: 'query', enabled: true }
      ]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toEqual('https://example.com/api?foo=urlValue&bar=newValue');
  });

  it('encodes special characters required by Oracle Fusion q-syntax', () => {
    // Oracle Fusion: q=ItemNumber='AS85000';OrganizationCode='001'
    // Quotes and ';' must be percent-encoded for safe URL transport;
    // Oracle accepts the encoded form.
    const request = {
      url: 'https://example.com/api',
      mode: 'none',
      headers: {},
      pathParams: [],
      queryParams: [
        { name: 'q', value: "ItemNumber='AS85000';OrganizationCode='001'", type: 'query', enabled: true }
      ]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toEqual(
      'https://example.com/api?q=ItemNumber%3D%27AS85000%27%3BOrganizationCode%3D%27001%27'
    );
  });

  it('skips disabled query params', () => {
    const request = {
      url: 'https://example.com/api',
      mode: 'none',
      headers: {},
      pathParams: [],
      // prepare-request filters disabled entries out of queryParams; this test
      // belt-and-suspenders the interpolate step in case a caller hands them
      // through anyway.
      queryParams: [{ name: 'kept', value: 'yes', type: 'query', enabled: true }]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toEqual('https://example.com/api?kept=yes');
  });

  it('leaves URL untouched when queryParams is empty or undefined', () => {
    const r1 = { url: 'https://example.com/api', mode: 'none', headers: {}, pathParams: [], queryParams: [] };
    const r2 = { url: 'https://example.com/api', mode: 'none', headers: {}, pathParams: [] };

    interpolateVars(r1, {}, {}, {});
    interpolateVars(r2, {}, {}, {});

    expect(r1.url).toEqual('https://example.com/api');
    expect(r2.url).toEqual('https://example.com/api');
  });

  it('co-exists with pathParams substitution', () => {
    const request = {
      url: 'https://example.com/users/:id/orders',
      mode: 'none',
      headers: {},
      pathParams: [{ name: 'id', value: '42', type: 'path', enabled: true }],
      queryParams: [{ name: 'limit', value: '10', type: 'query', enabled: true }]
    };

    interpolateVars(request, {}, {}, {});

    expect(request.url).toEqual('https://example.com/users/42/orders?limit=10');
  });
});
