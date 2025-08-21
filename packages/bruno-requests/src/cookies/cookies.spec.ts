import cookiesModule from '.';
import { Cookie } from 'tough-cookie';

// Provide explicit type for the cookie-jar wrapper returned by cookiesModule.jar()
type CookieJarWrapper = ReturnType<typeof cookiesModule.jar>;

const jarFactory = (): CookieJarWrapper => cookiesModule.jar();

describe('Bruno Cookie Jar Wrapper - API Examples', () => {
  let jar: CookieJarWrapper;
  const testUrl = 'https://api.example.com';

  beforeEach(() => {
    jar = jarFactory();
    // Clear all cookies before each test
    jar.clear();
  });

  describe('Basic Cookie Operations', () => {
    test('setCookie and getCookie - name/value pair', async () => {
      const cookieName = 'authToken';
      const cookieValue = 'jwt123';

      // Set a cookie
      await jar.setCookie(testUrl, cookieName, cookieValue);

      // Get the cookie back
      const cookie = (await jar.getCookie(testUrl, cookieName))!;
      expect(cookie.key).toBe(cookieName);
      expect(cookie.value).toBe(cookieValue);
      expect(cookie.domain).toBe('api.example.com');
    });

    test('setCookie with cookie object', async () => {
      const cookieObj = {
        key: 'sessionId',
        value: 'abc123',
        path: '/api',
        httpOnly: true,
        secure: true
      };

      await jar.setCookie(testUrl, cookieObj);

      const cookie = (await jar.getCookie(testUrl + '/api', 'sessionId'))!;
      expect(cookie.key).toBe('sessionId');
      expect(cookie.value).toBe('abc123');
      expect(cookie.path).toBe('/api');
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.secure).toBe(true);
    });

    test('getCookie returns null for non-existent cookie', async () => {
      const cookie = await jar.getCookie(testUrl, 'nonexistent');
      expect(cookie).toBeNull();
    });
  });

  describe('Multiple Cookie Operations', () => {
    test('setCookies with array of cookie objects', async () => {
      const cookies = [
        { key: 'cookie1', value: 'value1' },
        { key: 'cookie2', value: 'value2' },
        { key: 'cookie3', value: 'value3', httpOnly: true }
      ];

      await jar.setCookies(testUrl, cookies);

      // Verify all cookies were set
      const retrievedCookies = (await jar.getCookies(testUrl)) as Cookie[];
      expect(retrievedCookies).toHaveLength(3);
      
      const cookieNames = retrievedCookies.map((c: Cookie) => c.key);
      expect(cookieNames).toContain('cookie1');
      expect(cookieNames).toContain('cookie2');
      expect(cookieNames).toContain('cookie3');
    });

    test('getCookies returns all cookies for URL', async () => {
      // Set multiple cookies
      await jar.setCookie(testUrl, 'auth', 'token123');
      await jar.setCookie(testUrl, 'session', 'sess456');
      await jar.setCookie(testUrl, 'prefs', 'theme=dark');
      
      const cookies = (await jar.getCookies(testUrl)) as Cookie[];
      expect(cookies).toHaveLength(3);
      
      const cookieMap = (cookies as Cookie[]).reduce<Record<string, string>>((map, cookie: Cookie) => {
        map[cookie.key] = cookie.value;
        return map;
      }, {} as Record<string, string>);
      
      expect(cookieMap.auth).toBe('token123');
      expect(cookieMap.session).toBe('sess456');
      expect(cookieMap.prefs).toBe('theme=dark');
    });
  });

  describe('Cookie Deletion', () => {
    test('deleteCookie removes specific cookie', async () => {
      // Set two cookies
      await jar.setCookie(testUrl, 'keep', 'keepValue');
      await jar.setCookie(testUrl, 'remove', 'removeValue');
      
      // Delete one cookie
      await jar.deleteCookie(testUrl, 'remove');
      
      // Verify only one cookie remains
      const cookies = (await jar.getCookies(testUrl)) as Cookie[];
      expect(cookies).toHaveLength(1);
      expect(cookies[0]!.key).toBe('keep');
      expect(cookies[0]!.value).toBe('keepValue');
    });

    test('deleteCookies removes all cookies for URL', async () => {
      // Set multiple cookies
      await jar.setCookie(testUrl, 'cookie1', 'value1');
      await jar.setCookie(testUrl, 'cookie2', 'value2');
      
      // Delete all cookies for the URL
      await jar.deleteCookies(testUrl);
      
      // Verify no cookies remain
      const cookies = (await jar.getCookies(testUrl)) as Cookie[];
      expect(cookies).toHaveLength(0);
    });

    test('clear removes all cookies from jar', async () => {
      // Set cookies for multiple URLs
      await jar.setCookie('https://site1.com', 'cookie1', 'value1');
      await jar.setCookie('https://site2.com', 'cookie2', 'value2');
      
      // Clear entire jar
      await jar.clear();
      
      // Verify no cookies remain for any URL
      const cookies1 = (await jar.getCookies('https://site1.com')) as Cookie[];
      const cookies2 = (await jar.getCookies('https://site2.com')) as Cookie[];
      
      expect(cookies1).toHaveLength(0);
      expect(cookies2).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('setCookie handles missing URL', async () => {
      await expect(jar.setCookie('', 'name', 'value')).rejects.toThrow('URL is required');
    });

    test('getCookie handles missing URL', async () => {
      await expect(jar.getCookie('', 'name')).rejects.toThrow('URL and cookie name are required');
    });

    test('setCookies handles invalid input', async () => {
      await expect(jar.setCookies(testUrl, 'not-an-array' as any)).rejects.toThrow('expects an array');
    });

    test('setCookie handles missing cookie name in object', async () => {
      await expect(jar.setCookie(testUrl, { value: 'test' })).rejects.toThrow('key (name) is required');
    });
  });

  describe('Real-world Usage Examples', () => {
    test('Authentication workflow example', async () => {
      const apiUrl = 'https://api.example.com';
      const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      
      // Simulate login - set auth cookie
      await jar.setCookie(apiUrl, 'authToken', authToken);
      
      // Later in the session - retrieve auth token
      const cookie = (await jar.getCookie(apiUrl, 'authToken'))!;
      expect(cookie.value).toBe(authToken);
      
      // Simulate logout - remove auth cookie
      await jar.deleteCookie(apiUrl, 'authToken');
      
      // Verify cookie is gone
      const deletedCookie = await jar.getCookie(apiUrl, 'authToken');
      expect(deletedCookie).toBeNull();
    });

    test('Session management with multiple cookies', async () => {
      const sessionUrl = 'https://app.example.com';
      
      // Set session cookies
      const sessionCookies = [
        { key: 'sessionId', value: 'sess_123', httpOnly: true },
        { key: 'csrfToken', value: 'csrf_456' },
        { key: 'userPrefs', value: JSON.stringify({ theme: 'dark', lang: 'en' }) }
      ];
      
      await jar.setCookies(sessionUrl, sessionCookies);
      
      // Retrieve all session cookies
      const cookies = (await jar.getCookies(sessionUrl)) as Cookie[];
      expect(cookies).toHaveLength(3);
      
      // Find specific cookies
      const sessionCookie = cookies.find((c: Cookie) => c.key === 'sessionId')!;
      const csrfCookie = cookies.find((c: Cookie) => c.key === 'csrfToken')!;
      const prefsCookie = cookies.find((c: Cookie) => c.key === 'userPrefs')!;
      
      expect(sessionCookie.value).toBe('sess_123');
      expect(sessionCookie.httpOnly).toBe(true);
      expect(csrfCookie.value).toBe('csrf_456');
      
      const prefs = JSON.parse(prefsCookie.value);
      expect(prefs.theme).toBe('dark');
      expect(prefs.lang).toBe('en');
    });

    test('Cookie path handling', async () => {
      const baseUrl = 'https://example.com';
      
      // Set cookies with different paths
      await jar.setCookie(baseUrl, { key: 'global', value: 'global_val', path: '/' });
      await jar.setCookie(baseUrl, { key: 'api', value: 'api_val', path: '/api' });
      await jar.setCookie(baseUrl, { key: 'admin', value: 'admin_val', path: '/admin' });
      
      const rootCookies = (await jar.getCookies(baseUrl + '/')) as Cookie[];
      const globalCookie = rootCookies.find((c: Cookie) => c.key === 'global')!;
      expect(globalCookie).toBeTruthy();
      expect(globalCookie.value).toBe('global_val');
      
      const apiCookies = (await jar.getCookies(baseUrl + '/api/users')) as Cookie[];
      expect(apiCookies.length).toBeGreaterThanOrEqual(2);
      
      const apiCookieNames = apiCookies.map((c: Cookie) => c.key);
      expect(apiCookieNames).toContain('global');
      expect(apiCookieNames).toContain('api');
    });
  });
}); 