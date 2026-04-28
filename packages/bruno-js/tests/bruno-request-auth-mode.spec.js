const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const makeReq = (overrides = {}) => ({
  url: 'http://localhost:5000/api',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    ...overrides.headers
  },
  data: undefined,
  ...overrides
});

describe('BrunoRequest - getAuthMode()', () => {
  it('returns oauth2 when OAuth2 config is present', () => {
    const req = new BrunoRequest(
      makeReq({
        oauth2: {
          access_token: 'access-token'
        }
      })
    );

    expect(req.getAuthMode()).toBe('oauth2');
  });

  it('returns oauth1 when OAuth1 config is present', () => {
    const req = new BrunoRequest(
      makeReq({
        oauth1config: {
          consumerKey: 'consumer-key',
          consumerSecret: 'consumer-secret'
        }
      })
    );

    expect(req.getAuthMode()).toBe('oauth1');
  });

  it('returns bearer when bearer authorization header is present', () => {
    const req = new BrunoRequest(
      makeReq({
        headers: {
          Authorization: 'Bearer token'
        }
      })
    );

    expect(req.getAuthMode()).toBe('bearer');
  });

  it('returns apikey for header placement when the api key header is present', () => {
    const req = new BrunoRequest(
      makeReq({
        headers: { 'X-API-Key': 'secret' },
        apiKeyHeaderName: 'X-API-Key'
      })
    );

    expect(req.getAuthMode()).toBe('apikey');
  });

  it('returns none when pre-request script deletes the api key header', () => {
    const req = new BrunoRequest(
      makeReq({
        headers: { 'X-API-Key': 'secret' },
        apiKeyHeaderName: 'X-API-Key'
      })
    );

    req.deleteHeader('X-API-Key');

    expect(req.getAuthMode()).toBe('none');
  });

  it('returns apikey for queryparams placement marker', () => {
    const req = new BrunoRequest(
      makeReq({
        apiKeyAuthValueForQueryParams: {
          key: 'api_key',
          value: 'secret',
          placement: 'queryparams'
        }
      })
    );

    expect(req.getAuthMode()).toBe('apikey');
  });

  it('returns awsv4 when AWS SigV4 config is present', () => {
    const req = new BrunoRequest(
      makeReq({
        awsv4config: {
          accessKeyId: 'access-key',
          secretAccessKey: 'secret-key',
          service: 'execute-api',
          region: 'us-east-1'
        }
      })
    );

    expect(req.getAuthMode()).toBe('awsv4');
  });

  it('returns digest when Digest config is present', () => {
    const req = new BrunoRequest(
      makeReq({
        digestConfig: {
          username: 'user',
          password: 'password'
        }
      })
    );

    expect(req.getAuthMode()).toBe('digest');
  });

  it('returns basic when basic auth config is present before interpolation', () => {
    const req = new BrunoRequest(
      makeReq({
        basicAuth: {
          username: 'user',
          password: 'password'
        }
      })
    );

    expect(req.getAuthMode()).toBe('basic');
  });

  it('returns ntlm when NTLM config is present', () => {
    const req = new BrunoRequest(
      makeReq({
        ntlmConfig: {
          username: 'user',
          password: 'password',
          domain: 'domain'
        }
      })
    );

    expect(req.getAuthMode()).toBe('ntlm');
  });

  it('returns wsse when WSSE auth header is present', () => {
    const req = new BrunoRequest(
      makeReq({
        headers: {
          'X-WSSE': 'UsernameToken Username="user"'
        }
      })
    );

    expect(req.getAuthMode()).toBe('wsse');
  });

  it('returns none when no auth config is present', () => {
    const req = new BrunoRequest(makeReq());

    expect(req.getAuthMode()).toBe('none');
  });
});
