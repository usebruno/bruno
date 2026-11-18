import { describe, it, expect } from '@jest/globals';
import { isSupportedAuthType, toBrunoAuth } from '../../../src/postman/helpers/auth';

describe('toBrunoAuth', () => {
  it('maps noauth to mode none', () => {
    expect(toBrunoAuth('noauth')).toMatchObject({ mode: 'none', basic: null, oauth2: null });
  });

  it('maps basic credentials and coerces non-string values', () => {
    expect(toBrunoAuth('basic', { username: 'john', password: 1234 })).toMatchObject({
      mode: 'basic',
      basic: { username: 'john', password: '1234' }
    });
  });

  it.each([
    ['query', 'queryparams'],
    ['header', 'header'],
    [undefined, 'header']
  ])('maps apikey placement %p to %p', (postmanPlacement, brunoPlacement) => {
    const auth = toBrunoAuth('apikey', { key: 'X-Key', value: 'secret', in: postmanPlacement });
    expect(auth.apikey).toEqual({ key: 'X-Key', value: 'secret', placement: brunoPlacement });
  });

  it('maps edgegrid to akamai-edgegrid with a numeric maxBodySize', () => {
    const auth = toBrunoAuth('edgegrid', { accessToken: 'at', maxBodySize: '131072' });
    expect(auth.mode).toBe('akamai-edgegrid');
    expect(auth.akamaiEdgegrid).toMatchObject({ accessToken: 'at', maxBodySize: 131072 });
  });

  it('maps an oauth1 query placement and fills Postman defaults', () => {
    const auth = toBrunoAuth('oauth1', { consumerKey: 'ck', addParamsToHeader: false });
    expect(auth.oauth1).toMatchObject({
      consumerKey: 'ck',
      placement: 'query',
      signatureMethod: 'HMAC-SHA1',
      version: '1.0',
      callbackUrl: null
    });
  });

  it('maps oauth2 authorization code with PKCE', () => {
    const auth = toBrunoAuth('oauth2', {
      grant_type: 'authorization_code_with_pkce',
      authUrl: 'https://auth.example.com/authorize',
      redirect_uri: 'https://app.example.com/callback',
      client_authentication: 'body'
    });

    expect(auth.mode).toBe('oauth2');
    expect(auth.oauth2).toMatchObject({
      grantType: 'authorization_code',
      pkce: true,
      authorizationUrl: 'https://auth.example.com/authorize',
      callbackUrl: 'https://app.example.com/callback',
      credentialsPlacement: 'body',
      tokenPlacement: 'header',
      tokenHeaderPrefix: 'Bearer'
    });
  });

  it('maps oauth2 request params to additional parameters', () => {
    const auth = toBrunoAuth('oauth2', {
      grant_type: 'client_credentials',
      tokenRequestParams: [
        { key: 'audience', value: 'api', send_as: 'request_body', enabled: true },
        { key: 'debug', value: '1', send_as: 'request_url', enabled: false }
      ]
    });

    expect(auth.oauth2.additionalParameters).toEqual({
      token: [
        { name: 'audience', value: 'api', sendIn: 'body', enabled: true },
        { name: 'debug', value: '1', sendIn: 'queryparams', enabled: false }
      ]
    });
  });

  it('adds an empty authorization list when an authorization code grant has only token params', () => {
    const auth = toBrunoAuth('oauth2', {
      grant_type: 'authorization_code',
      tokenRequestParams: [{ key: 'audience', value: 'api', send_as: 'request_body' }]
    });

    expect(auth.oauth2.additionalParameters.authorization).toEqual([]);
  });

  it('maps an oauth2 query token placement without a default header prefix', () => {
    const auth = toBrunoAuth('oauth2', { grant_type: 'password_credentials', addTokenTo: 'queryParams', username: 'u' });
    expect(auth.oauth2).toMatchObject({ grantType: 'password', tokenPlacement: 'url', tokenHeaderPrefix: '', username: 'u' });
  });

  it('falls back to mode none for an unsupported type', () => {
    expect(isSupportedAuthType('hawk')).toBe(false);
    expect(toBrunoAuth('hawk', { authId: 'x' }).mode).toBe('none');
  });
});
