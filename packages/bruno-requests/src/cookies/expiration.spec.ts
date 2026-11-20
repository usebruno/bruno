import cookies from './index';

describe('cookie expiration in request headers and the domain listing', () => {
  const url = 'https://example.test/';

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
    cookies.cookieJar.removeAllCookiesSync();
  });

  afterEach(() => {
    cookies.cookieJar.removeAllCookiesSync();
    jest.useRealTimers();
  });

  test.each<[string, string, number, boolean]>([
    ['session cookie', '', 0, true],
    ['future Expires', '; Expires=Fri, 02 Jan 2026 00:00:00 GMT', 0, true],
    ['past Expires', '; Expires=Wed, 31 Dec 2025 00:00:00 GMT', 0, false],
    ['Max-Age overrides past Expires', '; Max-Age=60; Expires=Wed, 31 Dec 2025 00:00:00 GMT', 0, true],
    ['zero Max-Age overrides future Expires', '; Max-Age=0; Expires=Fri, 02 Jan 2026 00:00:00 GMT', 0, false],
    ['negative Max-Age overrides future Expires', '; Max-Age=-1; Expires=Fri, 02 Jan 2026 00:00:00 GMT', 0, false],
    ['Max-Age remains valid before its deadline', '; Max-Age=60', 59000, true],
    ['Max-Age expires at its deadline', '; Max-Age=60', 60000, false],
    ['elapsed Max-Age overrides future Expires', '; Max-Age=60; Expires=Fri, 02 Jan 2026 00:00:00 GMT', 61000, false]
  ])('%s', async (_name, attributes, elapsed, valid) => {
    cookies.saveCookies(url, { 'set-cookie': `sid=demo; Path=/${attributes}` });
    jest.setSystemTime(Date.now() + elapsed);

    // Read the listing first: a URL lookup can evict expired cookies from the jar.
    const domains = await cookies.getDomainsWithCookies();
    expect(domains.map(({ domain, cookieString }) => ({ domain, cookieString }))).toEqual(
      valid ? [{ domain: 'example.test', cookieString: 'sid=demo' }] : []
    );
    expect(cookies.getCookieStringForUrl(url)).toBe(valid ? 'sid=demo' : '');
  });
});
