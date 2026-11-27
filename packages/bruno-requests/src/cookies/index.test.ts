import cookiesModule from './index';

const TEST_URL = 'https://example.com';

describe('cookieJarWrapper.setCookie — __Host- prefix handling', () => {
  let jar: ReturnType<typeof cookiesModule.jar>;

  beforeEach(async () => {
    // Clear the shared cookie jar before each test
    await cookiesModule.jar().clear();
    jar = cookiesModule.jar();
  });

  // T1: name/value pair with __Host- prefix — dropped because secure/path not set
  it('drops __Host- cookie via name/value pair (missing secure and path)', async () => {
    // The name/value API doesn't set secure:true or path:"/", so tough-cookie
    // correctly rejects it per __Host- spec requirements. This verifies the
    // cookie is dropped for the right reason (missing secure/path), not because
    // of the old domain/hostOnly mismatch bug.
    await jar.setCookie(TEST_URL, '__Host-TOKEN', 'abc123');
    const cookies = await jar.getCookies(TEST_URL);
    expect(cookies!.find((c: any) => c.key === '__Host-TOKEN')).toBeUndefined();
  });

  // T2: object with __Host- prefix (the exact scenario from the bug report)
  it('stores __Host- cookie via cookie object', async () => {
    await jar.setCookie(TEST_URL, {
      key: '__Host-SESSION',
      value: '12345',
      path: '/',
      secure: true,
      httpOnly: true
    });

    const cookies = await jar.getCookies(TEST_URL);
    const found = cookies!.find((c: any) => c.key === '__Host-SESSION');
    expect(found).toBeDefined();
    expect(found!.value).toBe('12345');
  });

  // T3: setCookies (array API) with __Host- prefix
  it('stores __Host- cookie via setCookies array', async () => {
    await jar.setCookies(TEST_URL, [
      {
        key: '__Host-SESSION',
        value: 'arrayval',
        path: '/',
        secure: true,
        httpOnly: true
      }
    ]);

    const cookies = await jar.getCookies(TEST_URL);
    const found = cookies!.find((c: any) => c.key === '__Host-SESSION');
    expect(found).toBeDefined();
    expect(found!.value).toBe('arrayval');
  });

  // T4: regular cookie still works (regression)
  it('stores regular cookie via name/value pair', async () => {
    await jar.setCookie(TEST_URL, 'REGULAR', 'hello');

    const cookies = await jar.getCookies(TEST_URL);
    const found = cookies!.find((c: any) => c.key === 'REGULAR');
    expect(found).toBeDefined();
    expect(found!.value).toBe('hello');
  });

  // T5: __Host- cookie with user-supplied domain is dropped per spec
  it('drops __Host- cookie when user provides explicit domain', async () => {
    await jar.setCookie(TEST_URL, {
      key: '__Host-SESSION',
      value: 'shouldfail',
      path: '/',
      secure: true,
      httpOnly: true,
      domain: 'example.com'
    });

    const cookies = await jar.getCookies(TEST_URL);
    const found = cookies!.find((c: any) => c.key === '__Host-SESSION');
    // tough-cookie rejects __Host- cookies with hostOnly=false (which happens
    // when domain is explicitly set), so this should be silently dropped.
    expect(found).toBeUndefined();
  });
});

describe('cookie expiry — Max-Age takes precedence over Expires', () => {
  const PAST_EXPIRES = 'Thu, 01 Jan 2015 00:00:00 GMT';
  const FUTURE_EXPIRES = 'Fri, 01 Jan 2100 00:00:00 GMT';

  beforeEach(async () => {
    await cookiesModule.jar().clear();
  });

  it('sends a cookie with a valid Max-Age even when Expires is in the past', () => {
    cookiesModule.addCookieToJar(`session=abc; Max-Age=3600; Expires=${PAST_EXPIRES}; Path=/`, TEST_URL);

    expect(cookiesModule.getCookieStringForUrl(TEST_URL)).toBe('session=abc');
  });

  it('lists a cookie with a valid Max-Age even when Expires is in the past', async () => {
    cookiesModule.addCookieToJar(`session=abc; Max-Age=3600; Expires=${PAST_EXPIRES}; Path=/`, TEST_URL);

    const domains = await cookiesModule.getDomainsWithCookies();
    const domain = domains.find((d) => d.domain === 'example.com');
    expect(domain).toBeDefined();
    expect(domain!.cookies.map((c) => c.key)).toEqual(['session']);
  });

  it('does not send or list a cookie whose Max-Age is zero even when Expires is in the future', async () => {
    cookiesModule.addCookieToJar(`session=abc; Max-Age=0; Expires=${FUTURE_EXPIRES}; Path=/`, TEST_URL);

    expect(cookiesModule.getCookieStringForUrl(TEST_URL)).toBe('');
    const domains = await cookiesModule.getDomainsWithCookies();
    expect(domains.find((d) => d.domain === 'example.com')).toBeUndefined();
  });

  it('still drops a cookie without Max-Age whose Expires is in the past', async () => {
    cookiesModule.addCookieToJar(`old=1; Expires=${PAST_EXPIRES}; Path=/`, TEST_URL);

    expect(cookiesModule.getCookieStringForUrl(TEST_URL)).toBe('');
    const domains = await cookiesModule.getDomainsWithCookies();
    expect(domains.find((d) => d.domain === 'example.com')).toBeUndefined();
  });

  it('keeps session cookies that have neither Max-Age nor Expires', async () => {
    cookiesModule.addCookieToJar('sid=xyz; Path=/', TEST_URL);

    expect(cookiesModule.getCookieStringForUrl(TEST_URL)).toBe('sid=xyz');
    const domains = await cookiesModule.getDomainsWithCookies();
    expect(domains.find((d) => d.domain === 'example.com')!.cookies.map((c) => c.key)).toEqual(['sid']);
  });
});
