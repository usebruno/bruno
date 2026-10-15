const { describe, it, expect } = require('@jest/globals');
const interpolateVars = require('../../src/runner/interpolate-vars');
const prepareRequest = require('../../src/runner/prepare-request');

const FORM_URL_ENCODED_CONTENT_TYPES = [
  'application/x-www-form-urlencoded',
  'application/x-www-form-urlencoded; charset=UTF-8',
  'Application/X-WWW-Form-Urlencoded; charset=UTF-8'
];
const JSON_CONTENT_TYPES = [
  'application/json',
  'application/json; charset=utf-8',
  'Application/JSON'
];

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

  it.each(FORM_URL_ENCODED_CONTENT_TYPES)('interpolates form-urlencoded field values when Content-Type is "%s"', (contentType) => {
    const request = {
      method: 'POST',
      mode: 'formUrlEncoded',
      url: 'https://api.example/submit',
      headers: { 'content-type': contentType },
      data: [
        { name: 'token', value: '{{token}}', enabled: true },
        { name: 'static', value: 'value', enabled: true }
      ]
    };

    const result = interpolateVars(request, { token: 'abc123' }, null, null);

    expect(result.data).toEqual([
      { name: 'token', value: 'abc123', enabled: true },
      { name: 'static', value: 'value', enabled: true }
    ]);
  });

  it.each(FORM_URL_ENCODED_CONTENT_TYPES)('interpolates a form-urlencoded string body when Content-Type is "%s"', (contentType) => {
    const request = {
      method: 'POST',
      mode: 'text',
      url: 'https://api.example/submit',
      headers: { 'content-type': contentType },
      data: 'token={{token}}&static=value'
    };

    const result = interpolateVars(request, { token: 'abc123' }, null, null);

    expect(result.data).toBe('token=abc123&static=value');
  });

  it.each(JSON_CONTENT_TYPES)('interpolates a JSON object body when Content-Type is "%s"', (contentType) => {
    const request = {
      method: 'POST',
      mode: 'json',
      url: 'https://api.example/submit',
      headers: { 'content-type': contentType },
      data: { token: '{{token}}' }
    };

    const result = interpolateVars(request, { token: 'abc123' }, null, null);

    expect(result.data).toEqual({ token: 'abc123' });
  });

  it('JSON-escapes mock values in a string body when Content-Type is mixed case', () => {
    const request = {
      method: 'POST',
      mode: 'json',
      url: 'https://api.example/submit',
      headers: { 'content-type': 'Application/JSON' },
      data: '{"note": "{{$randomLoremParagraphs}}"}'
    };

    const result = interpolateVars(request, {}, null, null);

    expect(() => JSON.parse(result.data)).not.toThrow();
  });

  it('interpolates a multi-line multipart field value when the boundary contains "json"', () => {
    const request = {
      method: 'POST',
      mode: 'multipartForm',
      url: 'https://api.example/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=json-boundary' },
      data: [{ name: 'note', value: '{{note}}', type: 'text', enabled: true }]
    };

    const result = interpolateVars(request, { note: 'first line\nsecond line' }, null, null);

    expect(result.data).toEqual([{ name: 'note', value: 'first line\nsecond line', type: 'text', enabled: true }]);
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

describe('interpolate-vars: digest auth', () => {
  it('interpolates digest credentials from environment variables', () => {
    const request = { digestConfig: { username: 'user', password: '{{digestPw}}' } };
    const envVariables = { digestPw: 'passwd' };

    interpolateVars(request, envVariables, {}, {});

    expect(request.digestConfig).toEqual({ username: 'user', password: 'passwd' });
  });

  it('interpolates digest credentials from runtime variables', () => {
    const request = { digestConfig: { username: 'user', password: '{{digestPw}}' } };
    const runtimeVariables = { digestPw: 'passwd' };

    interpolateVars(request, {}, runtimeVariables, {});

    expect(request.digestConfig).toEqual({ username: 'user', password: 'passwd' });
  });

  it('interpolates digest credentials inherited from the collection', async () => {
    const collection = {
      root: { request: { auth: { mode: 'digest', digest: { username: 'user', password: '{{digestPw}}' } } } }
    };
    const item = { request: { method: 'GET', headers: [], params: [], url: 'https://example.com', auth: { mode: 'inherit' } } };
    const envVariables = { digestPw: 'passwd' };

    const request = await prepareRequest(item, collection);
    interpolateVars(request, envVariables, {}, {});

    expect(request.digestConfig).toEqual({ username: 'user', password: 'passwd' });
  });
});
