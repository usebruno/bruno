const { describe, it, expect } = require('@jest/globals');
const interpolateVars = require('../../src/runner/interpolate-vars');
const prepareRequest = require('../../src/runner/prepare-request');

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

  it('interpolates variables in TEXT body when Content-Type is application/x-www-form-urlencoded', () => {
    const request = {
      method: 'POST',
      mode: 'text',
      url: '{{oauth_uri}}/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'username={{oauth_user}}&password={{oauth_password}}&grant_type=password'
    };

    const result = interpolateVars(
      request,
      {
        oauth_uri: 'https://auth.example.com',
        oauth_user: 'alice',
        oauth_password: 's3cret'
      },
      null,
      null
    );

    expect(result.url).toBe('https://auth.example.com/token');
    expect(result.data).toBe('username=alice&password=s3cret&grant_type=password');
  });

  it('interpolates TEXT urlencoded body from global environment variables', () => {
    const request = {
      method: 'POST',
      mode: 'text',
      url: '{{oauth_uri}}/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: 'username={{oauth_user}}&password={{oauth_password}}&grant_type=password',
      globalEnvironmentVariables: {
        oauth_uri: 'https://auth.example.com',
        oauth_user: 'alice',
        oauth_password: 's3cret'
      }
    };

    const result = interpolateVars(request, {}, null, null);

    expect(result.url).toBe('https://auth.example.com/token');
    expect(result.data).toBe('username=alice&password=s3cret&grant_type=password');
  });

  it('still interpolates form-urlencoded field values when body is an array', () => {
    const request = {
      method: 'POST',
      mode: 'formUrlEncoded',
      url: 'https://auth.example.com/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: [
        { name: 'username', value: '{{oauth_user}}', enabled: true },
        { name: 'password', value: '{{oauth_password}}', enabled: true },
        { name: 'grant_type', value: 'password', enabled: true }
      ]
    };

    const result = interpolateVars(
      request,
      { oauth_user: 'alice', oauth_password: 's3cret' },
      null,
      null
    );

    expect(result.data).toEqual([
      { name: 'username', value: 'alice', enabled: true },
      { name: 'password', value: 's3cret', enabled: true },
      { name: 'grant_type', value: 'password', enabled: true }
    ]);
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
