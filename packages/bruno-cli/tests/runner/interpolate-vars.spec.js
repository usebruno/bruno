const { describe, it, expect } = require('@jest/globals');
const interpolateVars = require('../../src/runner/interpolate-vars');

describe('interpolate-vars: interpolateVars', () => {
  it('keeps stream-backed JSON request bodies intact', () => {
    const streamPayload = {
      pipe: jest.fn(),
      path: '/tmp/allocations.json'
    };
    const request = {
      method: 'POST',
      mode: 'file',
      url: 'http://api.example/upload',
      headers: { 'content-type': 'application/json' },
      data: streamPayload
    };

    const result = interpolateVars(request, { shouldNotApply: 'value' }, null, null);
    expect(result.data).toBe(streamPayload);
  });

  it('preserves raw string body when Content-Type is multipart/mixed', () => {
    const rawMultipartBody = [
      '--TestBoundary123',
      'Content-Type: application/json',
      '',
      '{"test": true}',
      '--TestBoundary123--',
      ''
    ].join('\r\n');

    const request = {
      method: 'POST',
      mode: 'text',
      url: 'https://httpbin.dev/post',
      headers: { 'content-type': 'multipart/mixed; boundary=TestBoundary123' },
      data: rawMultipartBody
    };

    const result = interpolateVars(request, {}, null, null);
    expect(result.data).toBe(rawMultipartBody);
  });

  it('interpolates variables in raw multipart/mixed string body', () => {
    const boundary = 'CustomBoundary123';
    const rawMultipartBody = [
      `--${boundary}`,
      'Content-Type: text/plain',
      '',
      'Token: {{token}}',
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      '{"id": "{{id}}", "msg": "{{msg}}"}',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const request = {
      method: 'POST',
      mode: 'text',
      url: 'https://api.example/send',
      headers: { 'content-type': `multipart/mixed; boundary=${boundary}` },
      data: rawMultipartBody
    };

    const result = interpolateVars(request, { token: 'abc123', id: 42, msg: 'hello' }, null, null);
    expect(result.data).toContain('Token: abc123');
    expect(result.data).toContain('{"id": "42", "msg": "hello"}');
    expect(result.data).toContain(`--${boundary}`);
    expect(result.data).toContain(`--${boundary}--`);
  });
});

describe('interpolate-vars: path params', () => {
  it('supports an escaped colon after a resolved path param (issue #3810)', () => {
    const request = {
      method: 'GET',
      url: 'https://example.com/:foo/:bar\\:publish',
      pathParams: [
        { type: 'path', name: 'foo', value: 'a' },
        { type: 'path', name: 'bar', value: 'b' }
      ]
    };

    const result = interpolateVars(request, {}, null, null);
    expect(result.url).toBe('https://example.com/a/b:publish');
  });

  it('resolves an escaped colon literal even without any configured path params', () => {
    const request = {
      method: 'GET',
      url: 'https://example.com/foo/\\:literal',
      pathParams: []
    };

    const result = interpolateVars(request, {}, null, null);
    expect(result.url).toBe('https://example.com/foo/:literal');
  });

  it('does not corrupt a path param value that looks like the internal escape placeholder', () => {
    const request = {
      method: 'GET',
      url: 'https://example.com/:foo/:bar\\:publish',
      pathParams: [
        { type: 'path', name: 'foo', value: 'zzzBRUNOESCAPEDCOLONabc123zzz' },
        { type: 'path', name: 'bar', value: 'b' }
      ]
    };

    const result = interpolateVars(request, {}, null, null);
    expect(result.url).toBe('https://example.com/zzzBRUNOESCAPEDCOLONabc123zzz/b:publish');
  });
});

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
