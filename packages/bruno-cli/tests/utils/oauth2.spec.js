const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('@usebruno/requests', () => ({
  getOAuth2Token: jest.fn(),
  OAUTH2_ERROR_CODES: jest.requireActual('@usebruno/requests').OAUTH2_ERROR_CODES
}));

const { getOAuth2Token: sharedGetOAuth2Token, OAUTH2_ERROR_CODES } = require('@usebruno/requests');
const { AUTHORIZATION_ERROR_CODES } = require('../../src/utils/oauth2-authorize');
const { getOAuth2Token } = require('../../src/utils/oauth2');

// Each test uses its own token URL, since failures are remembered for the process
const authCodeConfig = (accessTokenUrl, overrides = {}) => ({
  grantType: 'authorization_code',
  accessTokenUrl,
  ...overrides
});

const codedError = (message, fields) => Object.assign(new Error(message), fields);
const denied = (oauth2Error) => codedError(`OAuth2 authorization failed: ${oauth2Error}`, { code: OAUTH2_ERROR_CODES.AUTHORIZATION_DENIED, oauth2Error });

describe('oauth2: getOAuth2Token', () => {
  beforeEach(() => {
    sharedGetOAuth2Token.mockReset();
  });

  describe('definitive sign-in failures are not prompted again', () => {
    it.each([
      ['an IdP denial', denied('access_denied')],
      ['a cancelled sign-in', codedError('OAuth2 authorization cancelled', { code: AUTHORIZATION_ERROR_CODES.CANCELLED })],
      ['a timed-out sign-in', codedError('Timed out', { code: AUTHORIZATION_ERROR_CODES.TIMED_OUT })]
    ])('re-throws %s without calling the helper again', async (_label, error) => {
      sharedGetOAuth2Token.mockRejectedValueOnce(error);
      const config = authCodeConfig(`https://definitive.example.com/${error.code}/${error.oauth2Error}`);

      await expect(getOAuth2Token(config)).rejects.toBe(error);
      await expect(getOAuth2Token(config)).rejects.toBe(error);

      expect(sharedGetOAuth2Token).toHaveBeenCalledTimes(1);
    });
  });

  describe('retryable failures let a later request try again', () => {
    it.each([
      ['a token endpoint network failure', codedError('connect ECONNREFUSED 127.0.0.1:443', { code: 'ECONNREFUSED' })],
      ['a token endpoint server error', new Error('Request failed with status code 503')],
      ['a callback listener failure', new Error('Could not listen for the OAuth2 callback on http://localhost:8765: listen EADDRINUSE')],
      ['a transient IdP error', denied('temporarily_unavailable')]
    ])('retries after %s', async (_label, error) => {
      sharedGetOAuth2Token.mockRejectedValueOnce(error).mockResolvedValueOnce('token');
      const config = authCodeConfig(`https://retryable.example.com/${encodeURIComponent(error.message)}`);

      await expect(getOAuth2Token(config)).rejects.toBe(error);
      await expect(getOAuth2Token(config)).resolves.toBe('token');

      expect(sharedGetOAuth2Token).toHaveBeenCalledTimes(2);
    });
  });

  it('passes successful tokens straight through', async () => {
    sharedGetOAuth2Token.mockResolvedValue('token');
    const config = authCodeConfig('https://success.example.com/token');

    await expect(getOAuth2Token(config)).resolves.toBe('token');
    await expect(getOAuth2Token(config)).resolves.toBe('token');

    // Reuse within the run is the helper's token store's job, so every call reaches it
    expect(sharedGetOAuth2Token).toHaveBeenCalledTimes(2);
  });

  it('keys failures like the token store, so an empty credentialsId is not treated as the default', async () => {
    sharedGetOAuth2Token.mockRejectedValueOnce(denied('access_denied')).mockResolvedValueOnce('token');

    await expect(getOAuth2Token(authCodeConfig('https://keys.example.com/token'))).rejects.toThrow('access_denied');

    await expect(getOAuth2Token(authCodeConfig('https://keys.example.com/token', { credentialsId: '' }))).resolves.toBe('token');
  });

  it('does not cache failures for non-interactive grants', async () => {
    sharedGetOAuth2Token.mockRejectedValueOnce(denied('access_denied')).mockResolvedValueOnce('token');
    const config = { grantType: 'client_credentials', accessTokenUrl: 'https://client-credentials.example.com/token' };

    await expect(getOAuth2Token(config)).rejects.toThrow('access_denied');
    await expect(getOAuth2Token(config)).resolves.toBe('token');
  });
});
