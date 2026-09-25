const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('@usebruno/requests', () => ({ getOAuth2Token: jest.fn() }));

const { getOAuth2Token: sharedGetOAuth2Token } = require('@usebruno/requests');
const { getOAuth2Token } = require('../../src/utils/oauth2');

const authCodeConfig = (overrides = {}) => ({
  grantType: 'authorization_code',
  accessTokenUrl: 'https://auth.example.com/token',
  ...overrides
});

describe('oauth2: getOAuth2Token', () => {
  beforeEach(() => {
    sharedGetOAuth2Token.mockReset();
  });

  it('re-throws a failed authorization code sign-in instead of prompting again', async () => {
    sharedGetOAuth2Token.mockRejectedValueOnce(new Error('OAuth2 authorization failed: access_denied'));
    const config = authCodeConfig({ credentialsId: 'repeat-failure' });

    await expect(getOAuth2Token(config)).rejects.toThrow('access_denied');
    await expect(getOAuth2Token(config)).rejects.toThrow('access_denied');

    expect(sharedGetOAuth2Token).toHaveBeenCalledTimes(1);
  });

  it('keys failures like the token store, so an empty credentialsId is not treated as the default', async () => {
    sharedGetOAuth2Token.mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce('token');

    await expect(getOAuth2Token(authCodeConfig({ accessTokenUrl: 'https://keys.example.com/token' }))).rejects.toThrow('denied');

    await expect(getOAuth2Token(authCodeConfig({ accessTokenUrl: 'https://keys.example.com/token', credentialsId: '' }))).resolves.toBe('token');
  });

  it('does not cache failures for non-interactive grants', async () => {
    sharedGetOAuth2Token.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce('token');
    const config = { grantType: 'client_credentials', accessTokenUrl: 'https://auth.example.com/token' };

    await expect(getOAuth2Token(config)).rejects.toThrow('timeout');
    await expect(getOAuth2Token(config)).resolves.toBe('token');
  });
});
