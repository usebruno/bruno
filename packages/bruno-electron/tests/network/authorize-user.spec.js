const { matchesCallbackUrl } = require('../../src/ipc/network/authorize-user-in-window');

describe('matchesCallbackUrl', () => {
  const testCases = [
    { url: 'https://random-url/endpoint', expected: false },
    { url: 'https://random-url/endpoint?code=abcd', expected: false },
    { url: 'https://callback.url', expected: false },
    { url: 'https://callback.url/', expected: false },
    { url: 'https://callback.url/?code=abcd', expected: false },
    { url: 'https://callback.url/endpoint', expected: true },
    { url: 'https://callback.url/endpoint/', expected: true },
    { url: 'https://callback.url/endpoint?code=abcd', expected: true },
    { url: 'https://callback.url/endpoint/?code=abcd', expected: true },

    // authorizeUrl that is subpath of the callbackUrl should not be matched
    { url: 'https://callback.url/endpoint/auth', expected: false },
    { url: 'https://callback.url/endpoint/auth?response_type=code&client_id=test', expected: false },
    { url: 'https://callback.url/endpoint-something', expected: false },
    { url: 'https://callback.url/endpoint-auth', expected: false },

    { url: 'https://callback.url/random-endpoint/?code=abcd', expected: false }
  ];

  it.each(testCases)('$url - should be $expected', ({ url, expected }) => {
    let callbackUrl = 'https://callback.url/endpoint';

    let actual = matchesCallbackUrl(new URL(url), new URL(callbackUrl));

    expect(actual).toBe(expected);
  });

  const testCasesModifiedCallback = [
    {
      callbackUrl: 'https://callback.url',
      url: 'https://callback.url',
      expected: true
    },
    {
      callbackUrl: 'https://callback.url',
      url: 'https://callback.url/',
      expected: true
    },
    {
      callbackUrl: 'https://callback.url/',
      url: 'https://callback.url',
      expected: true
    },
    {
      callbackUrl: 'https://callback.url/endpoint?something=1&another=2',
      url: 'https://callback.url/endpoint',
      expected: false
    },
    {
      callbackUrl: 'https://callback.url/endpoint?something=1&another=2',
      url: 'https://callback.url/endpoint?something=1&another=2',
      expected: true
    },
    {
      callbackUrl: 'https://callback.url/endpoint?something=1&another=2',
      // appended extra search params should be allowed
      url: 'https://callback.url/endpoint?something=1&another=2&code=abcd',
      expected: true
    },
    {
      callbackUrl: 'https://user:pass@callback.url/endpoint',
      url: 'https://callback.url/endpoint',
      expected: false
    },
    {
      callbackUrl: 'https://user:pass@callback.url/endpoint',
      url: 'https://user:otherpass@callback.url/endpoint',
      expected: false
    },
    {
      callbackUrl: 'https://user:pass@callback.url/endpoint',
      url: 'https://user:pass@callback.url/endpoint?code=123',
      expected: true
    }
  ];

  it.each(testCasesModifiedCallback)('$url - should be $expected with callbackUrl $callbackUrl', ({ callbackUrl, url, expected }) => {
    let actual = matchesCallbackUrl(new URL(url), new URL(callbackUrl));

    expect(actual).toBe(expected);
  });
});
