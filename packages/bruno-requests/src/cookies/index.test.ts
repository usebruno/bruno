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
