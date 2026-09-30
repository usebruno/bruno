const { matchesCallbackUrl } = require('../../src/ipc/network/authorize-user-in-window');

describe('matchesCallbackUrl', () => {
  const testCases = [
    { url: 'https://random-url/endpoint', expected: false },
    { url: 'https://random-url/endpoint?code=abcd', expected: false },
    { url: 'https://callback.url/endpoint?code=abcd', expected: true },
    { url: 'https://callback.url/endpoint/?code=abcd', expected: true },
    { url: 'https://callback.url/random-endpoint/?code=abcd', expected: false }
  ];

  it.each(testCases)('$url - should be $expected', ({ url, expected }) => {
    let callBackUrl = 'https://callback.url/endpoint';

    let actual = matchesCallbackUrl(new URL(url), new URL(callBackUrl));

    expect(actual).toBe(expected);
  });

  describe('root path callback URL', () => {
    const rootPathCases = [
      { url: 'https://hostname/auth/login', expected: false, desc: 'intermediate login page without code' },
      { url: 'https://hostname/consent', expected: false, desc: 'intermediate consent page without code' },
      { url: 'https://hostname/?code=abcd', expected: true, desc: 'root callback with authorization code' },
      { url: 'https://hostname/?error=access_denied', expected: false, desc: 'root callback with error (handled separately by onWindowRedirect)' },
      { url: 'https://hostname/#access_token=xyz', expected: true, desc: 'root callback with implicit flow hash' },
      { url: 'https://hostname/', expected: false, desc: 'root path without any OAuth2 params' },
      { url: 'https://other-host/?code=abcd', expected: false, desc: 'different host with code param' }
    ];

    it.each(rootPathCases)('$desc ($url) - should be $expected', ({ url, expected }) => {
      let callBackUrl = 'https://hostname/';

      let actual = matchesCallbackUrl(new URL(url), new URL(callBackUrl));

      expect(actual).toBe(expected);
    });
  });

  describe('implicit flow with hash fragments', () => {
    const implicitCases = [
      { url: 'https://callback.url/endpoint#access_token=xyz&token_type=bearer', expected: true, desc: 'callback with hash fragment' },
      { url: 'https://callback.url/endpoint#', expected: false, desc: 'callback with empty hash' },
      { url: 'https://callback.url/endpoint', expected: false, desc: 'callback without hash or code' }
    ];

    it.each(implicitCases)('$desc ($url) - should be $expected', ({ url, expected }) => {
      let callBackUrl = 'https://callback.url/endpoint';

      let actual = matchesCallbackUrl(new URL(url), new URL(callBackUrl));

      expect(actual).toBe(expected);
    });
  });

  it('should return false for null url', () => {
    let callBackUrl = 'https://callback.url/endpoint';
    expect(matchesCallbackUrl(null, new URL(callBackUrl))).toBe(false);
  });
});
