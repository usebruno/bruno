const cookiesModule = require('../../src/cookies/index.ts').default;

describe('Bruno Cookie Jar Wrapper - API Examples', () => {
  let jar;
  const testUrl = 'https://api.example.com';

  beforeEach(() => {
    jar = cookiesModule.jar();
    // Clear all cookies before each test
    jar.clear();
  });

  describe('Basic Cookie Operations', () => {
    test('setCookie and get - name/value pair', (done) => {
      const cookieName = 'authToken';
      const cookieValue = 'jwt123';

      // Set a cookie
      jar.setCookie(testUrl, cookieName, cookieValue, (err) => {
        expect(err).toBeUndefined();

        // Get the cookie back
        jar.get(testUrl, cookieName, (err, cookie) => {
          expect(err).toBeNull();
          expect(cookie.key).toBe(cookieName);
          expect(cookie.value).toBe(cookieValue);
          expect(cookie.domain).toBe('api.example.com');
          done();
        });
      });
    });

    test('setCookie with cookie object', (done) => {
      const cookieObj = {
        key: 'sessionId',
        value: 'abc123',
        path: '/api',
        httpOnly: true,
        secure: true
      };

      jar.setCookie(testUrl, cookieObj, (err) => {
        expect(err).toBeUndefined();

        jar.get(testUrl + '/api', 'sessionId', (err, cookie) => {
          expect(err).toBeNull();
          expect(cookie.key).toBe('sessionId');
          expect(cookie.value).toBe('abc123');
          expect(cookie.path).toBe('/api');
          expect(cookie.httpOnly).toBe(true);
          expect(cookie.secure).toBe(true);
          done();
        });
      });
    });

    test('get returns null for non-existent cookie', (done) => {
      jar.get(testUrl, 'nonexistent', (err, cookie) => {
        expect(err).toBeNull();
        expect(cookie).toBeNull();
        done();
      });
    });
  });

  describe('Multiple Cookie Operations', () => {
    test('setCookies with array of cookie objects', (done) => {
      const cookies = [
        { key: 'cookie1', value: 'value1' },
        { key: 'cookie2', value: 'value2' },
        { key: 'cookie3', value: 'value3', httpOnly: true }
      ];

      jar.setCookies(testUrl, cookies, (err) => {
        expect(err).toBeUndefined();

        // Verify all cookies were set
        jar.getAll(testUrl, (err, retrievedCookies) => {
          expect(err).toBeNull();
          expect(retrievedCookies).toHaveLength(3);
          
          const cookieNames = retrievedCookies.map(c => c.key);
          expect(cookieNames).toContain('cookie1');
          expect(cookieNames).toContain('cookie2');
          expect(cookieNames).toContain('cookie3');
          done();
        });
      });
    });

    test('getAll returns all cookies for URL', (done) => {
      // Set multiple cookies
      jar.setCookie(testUrl, 'auth', 'token123', () => {
        jar.setCookie(testUrl, 'session', 'sess456', () => {
          jar.setCookie(testUrl, 'prefs', 'theme=dark', () => {
            
            jar.getAll(testUrl, (err, cookies) => {
              expect(err).toBeNull();
              expect(cookies).toHaveLength(3);
              
              const cookieMap = cookies.reduce((map, cookie) => {
                map[cookie.key] = cookie.value;
                return map;
              }, {});
              
              expect(cookieMap.auth).toBe('token123');
              expect(cookieMap.session).toBe('sess456');
              expect(cookieMap.prefs).toBe('theme=dark');
              done();
            });
          });
        });
      });
    });
  });

  describe('Cookie Deletion', () => {
    test('unset removes specific cookie', (done) => {
      // Set two cookies
      jar.setCookie(testUrl, 'keep', 'keepValue', () => {
        jar.setCookie(testUrl, 'remove', 'removeValue', () => {
          
          // Delete one cookie
          jar.unset(testUrl, 'remove', (err) => {
            expect(err).toBeUndefined();
            
            // Verify only one cookie remains
            jar.getAll(testUrl, (err, cookies) => {
              expect(err).toBeNull();
              expect(cookies).toHaveLength(1);
              expect(cookies[0].key).toBe('keep');
              expect(cookies[0].value).toBe('keepValue');
              done();
            });
          });
        });
      });
    });

    test('deleteCookies removes all cookies for URL', (done) => {
      // Set multiple cookies
      jar.setCookie(testUrl, 'cookie1', 'value1', () => {
        jar.setCookie(testUrl, 'cookie2', 'value2', () => {
          
          // Delete all cookies for the URL
          jar.deleteCookies(testUrl, (err) => {
            expect(err).toBeUndefined();
            
            // Verify no cookies remain
            jar.getAll(testUrl, (err, cookies) => {
              expect(err).toBeNull();
              expect(cookies).toHaveLength(0);
              done();
            });
          });
        });
      });
    });

    test('clear removes all cookies from jar', (done) => {
      // Set cookies for multiple URLs
      jar.setCookie('https://site1.com', 'cookie1', 'value1', () => {
        jar.setCookie('https://site2.com', 'cookie2', 'value2', () => {
          
          // Clear entire jar
          jar.clear((err) => {
            expect(err).toBeNull();
            
            // Verify no cookies remain for any URL
            jar.getAll('https://site1.com', (err, cookies1) => {
              expect(cookies1).toHaveLength(0);
              
              jar.getAll('https://site2.com', (err, cookies2) => {
                expect(cookies2).toHaveLength(0);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('setCookie handles missing URL', (done) => {
      jar.setCookie('', 'name', 'value', (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('URL is required');
        done();
      });
    });

    test('get handles missing URL', (done) => {
      jar.get('', 'name', (err, cookie) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('URL and cookie name are required');
        done();
      });
    });

    test('setCookies handles invalid input', (done) => {
      jar.setCookies(testUrl, 'not-an-array', (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('expects an array');
        done();
      });
    });

    test('setCookie handles missing cookie name in object', (done) => {
      jar.setCookie(testUrl, { value: 'test' }, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('key (name) is required');
        done();
      });
    });
  });

  describe('Real-world Usage Examples', () => {
    test('Authentication workflow example', (done) => {
      const apiUrl = 'https://api.example.com';
      const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      
      // Simulate login - set auth cookie
      jar.setCookie(apiUrl, 'authToken', authToken, (err) => {
        expect(err).toBeFalsy(); // Allow both null and undefined
        
        // Later in the session - retrieve auth token
        jar.get(apiUrl, 'authToken', (err, cookie) => {
          expect(err).toBeNull();
          expect(cookie.value).toBe(authToken);
          
          // Simulate logout - remove auth cookie
          jar.unset(apiUrl, 'authToken', (err) => {
            expect(err).toBeFalsy(); // Allow both null and undefined
            
            // Verify cookie is gone
            jar.get(apiUrl, 'authToken', (err, cookie) => {
              expect(cookie).toBeNull();
              done();
            });
          });
        });
      });
    });

    test('Session management with multiple cookies', (done) => {
      const sessionUrl = 'https://app.example.com';
      
      // Set session cookies
      const sessionCookies = [
        { key: 'sessionId', value: 'sess_123', httpOnly: true },
        { key: 'csrfToken', value: 'csrf_456' },
        { key: 'userPrefs', value: JSON.stringify({ theme: 'dark', lang: 'en' }) }
      ];
      
      jar.setCookies(sessionUrl, sessionCookies, (err) => {
        expect(err).toBeUndefined();
        
        // Retrieve all session cookies
        jar.getAll(sessionUrl, (err, cookies) => {
          expect(err).toBeNull();
          expect(cookies).toHaveLength(3);
          
          // Find specific cookies
          const sessionCookie = cookies.find(c => c.key === 'sessionId');
          const csrfCookie = cookies.find(c => c.key === 'csrfToken');
          const prefsCookie = cookies.find(c => c.key === 'userPrefs');
          
          expect(sessionCookie.value).toBe('sess_123');
          expect(sessionCookie.httpOnly).toBe(true);
          expect(csrfCookie.value).toBe('csrf_456');
          
          const prefs = JSON.parse(prefsCookie.value);
          expect(prefs.theme).toBe('dark');
          expect(prefs.lang).toBe('en');
          
          done();
        });
      });
    });

    test('Cookie path handling', (done) => {
      const baseUrl = 'https://example.com';
      
      // Set cookies with different paths
      jar.setCookie(baseUrl, { key: 'global', value: 'global_val', path: '/' }, () => {
        jar.setCookie(baseUrl, { key: 'api', value: 'api_val', path: '/api' }, () => {
          jar.setCookie(baseUrl, { key: 'admin', value: 'admin_val', path: '/admin' }, () => {
            
            // Get cookies for root path - should include global cookie
            jar.getAll(baseUrl + '/', (err, rootCookies) => {
              expect(err).toBeNull();
              const globalCookie = rootCookies.find(c => c.key === 'global');
              expect(globalCookie).toBeTruthy();
              expect(globalCookie.value).toBe('global_val');
              
              // Get cookies for API path - should include both global and api cookies
              jar.getAll(baseUrl + '/api/users', (err, apiCookies) => {
                expect(err).toBeNull();
                expect(apiCookies.length).toBeGreaterThanOrEqual(2);
                
                const apiCookieNames = apiCookies.map(c => c.key);
                expect(apiCookieNames).toContain('global');
                expect(apiCookieNames).toContain('api');
                
                done();
              });
            });
          });
        });
      });
    });
  });
}); 