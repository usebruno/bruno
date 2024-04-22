const { matchesCallbackUrl } = require('../../src/ipc/network/authorize-user-in-window');

describe('matchesCallbackUrl', () => {
  const testCases = [
    { url: null, expected: false },
    { url: '', expected: false },
    { url: 'https://random-url/endpoint', expected: false },
    { url: 'https://random-url/endpoint?code=abcd', expected: false },
    { url: 'https://callback.url/endpoint?code=abcd', expected: true },
    { url: 'https://callback.url/endpoint/?code=abcd', expected: true }
  ];

  it.each(testCases)('$url - should be $expected', ({ url, expected }) => {
    let callBackUrl = 'https://callback.url/endpoint';

    let actual = matchesCallbackUrl(url, callBackUrl);

    expect(actual).toBe(expected);
  });
});
