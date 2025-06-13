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
    const callBackUrl = 'https://callback.url/endpoint';
    const authorizeUrl = 'https://login.example.com/openid-connect/auth'

    const actual = matchesCallbackUrl(new URL(url), new URL(authorizeUrl), new URL(callBackUrl));

    expect(actual).toBe(expected);
  });

  it('should allow authorizeUrl to be a subpath of the callBackUrl', () => {
    const callBackUrl = 'https://some-app.example.com';
    const authorizeUrl = `${callBackUrl}/auth/protocol/openid-connect/auth`;
    expect(authorizeUrl.startsWith(callBackUrl)).toBeTruthy();
    
    // When the authorizeUrl is currently opened, do not match this as the callBackUrl
    let url = authorizeUrl;
    let actual = matchesCallbackUrl(new URL(url), new URL(authorizeUrl), new URL(callBackUrl));
    expect(actual).toBeFalsy();
    
    // Also not the authorizeUrl with some parameters
    url = `${authorizeUrl}?response_type=code&client_id=test`;
    actual = matchesCallbackUrl(new URL(url), new URL(authorizeUrl), new URL(callBackUrl));
    expect(actual).toBeFalsy();

    // Now the real callBackUrl is opened in the browser window
    url = callBackUrl;
    actual = matchesCallbackUrl(new URL(url), new URL(authorizeUrl), new URL(callBackUrl));
    expect(actual).toBeTruthy();
  });
});
