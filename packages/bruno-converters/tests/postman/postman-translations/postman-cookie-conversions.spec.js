import postmanTranslation from '../../../src/postman/postman-translations';

describe('postmanTranslations - cookie API conversions', () => {
  test('should convert pm.cookies.jar().get to bru.cookies.jar().getCookie', () => {
    const inputScript = `pm.cookies.jar().get('https://example.com', 'sessionId', (err, cookie) => {
      console.log(cookie);
    });`;

    const expectedOutput = `bru.cookies.jar().getCookie('https://example.com', 'sessionId', (err, cookie) => {
      console.log(cookie);
    });`;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert pm.cookies.jar().getAll to bru.cookies.jar().getCookies', () => {
    const inputScript = `pm.cookies.jar().getAll('https://example.com', (err, cookies) => {
      console.log(cookies);
    });`;

    const expectedOutput = `bru.cookies.jar().getCookies('https://example.com', (err, cookies) => {
      console.log(cookies);
    });`;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert pm.cookies.jar().set to bru.cookies.jar().setCookie', () => {
    const inputScript = `pm.cookies.jar().set('https://example.com', 'sessionId', 'abc123', (err) => {
      if (err) console.error(err);
    });`;

    const expectedOutput = `bru.cookies.jar().setCookie('https://example.com', 'sessionId', 'abc123', (err) => {
      if (err) console.error(err);
    });`;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert pm.cookies.jar().unset to bru.cookies.jar().deleteCookie', () => {
    const inputScript = `pm.cookies.jar().unset('https://example.com', 'sessionId', (err) => {
      if (err) console.error(err);
    });`;

    const expectedOutput = `bru.cookies.jar().deleteCookie('https://example.com', 'sessionId', (err) => {
      if (err) console.error(err);
    });`;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert pm.cookies.jar().clear to bru.cookies.jar().deleteCookies (behavior difference)', () => {
    const inputScript = `pm.cookies.jar().clear('https://example.com', (err) => {
      if (err) console.error(err);
    });`;

    const expectedOutput = `bru.cookies.jar().deleteCookies('https://example.com', (err) => {
      if (err) console.error(err);
    });`;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle multiple cookie operations in one script', () => {
    const inputScript = `
      pm.cookies.jar().set('https://api.example.com', 'auth', 'token123');
      const cookie = pm.cookies.jar().get('https://api.example.com', 'auth');
      pm.cookies.jar().getAll('https://api.example.com', (err, cookies) => {
        console.log('All cookies:', cookies);
      });
      pm.cookies.jar().unset('https://api.example.com', 'temp');
      pm.cookies.jar().clear('https://api.example.com');
    `;

    const expectedOutput = `
      bru.cookies.jar().setCookie('https://api.example.com', 'auth', 'token123');
      const cookie = bru.cookies.jar().getCookie('https://api.example.com', 'auth');
      bru.cookies.jar().getCookies('https://api.example.com', (err, cookies) => {
        console.log('All cookies:', cookies);
      });
      bru.cookies.jar().deleteCookie('https://api.example.com', 'temp');
      bru.cookies.jar().deleteCookies('https://api.example.com');
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert variable assignment and method calls on cookie jar variables', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.set('https://example.com', 'user', 'john');
      const userCookie = jar.get('https://example.com', 'user');
    `;

    const expectedOutput = `
      const jar = bru.cookies.jar();
      jar.setCookie('https://example.com', 'user', 'john');
      const userCookie = jar.getCookie('https://example.com', 'user');
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert jar.get to jar.getCookie with callback', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.get('https://api.example.com', 'authToken', (error, cookie) => {
        if (error) {
          console.error('Error getting cookie:', error);
        } else {
          console.log('Retrieved cookie:', cookie);
        }
      });
    `;

    const expectedOutput = `
      const jar = bru.cookies.jar();
      jar.getCookie('https://api.example.com', 'authToken', (error, cookie) => {
        if (error) {
          console.error('Error getting cookie:', error);
        } else {
          console.log('Retrieved cookie:', cookie);
        }
      });
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert jar.getAll to jar.getCookies with callback', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.getAll('https://api.example.com', (error, cookies) => {
        if (error) {
          console.error('Error getting cookies:', error);
        } else {
          console.log('All cookies:', cookies);
        }
      });
    `;

    const expectedOutput = `
      const jar = bru.cookies.jar();
      jar.getCookies('https://api.example.com', (error, cookies) => {
        if (error) {
          console.error('Error getting cookies:', error);
        } else {
          console.log('All cookies:', cookies);
        }
      });
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert jar.set to jar.setCookie with cookie object', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.set('https://api.example.com', {
        key: 'sessionId',
        value: 'abc123',
        path: '/api',
        httpOnly: true,
        secure: true
      }, (error) => {
        if (error) console.error(error);
      });
    `;

    const expectedOutput = `
      const jar = bru.cookies.jar();
      jar.setCookie('https://api.example.com', {
        key: 'sessionId',
        value: 'abc123',
        path: '/api',
        httpOnly: true,
        secure: true
      }, (error) => {
        if (error) console.error(error);
      });
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert jar.unset to jar.deleteCookie', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.unset('https://api.example.com', 'tempCookie', (error) => {
        if (error) {
          console.error('Failed to delete cookie:', error);
        } else {
          console.log('Cookie deleted successfully');
        }
      });
    `;

    const expectedOutput = `
      const jar = bru.cookies.jar();
      jar.deleteCookie('https://api.example.com', 'tempCookie', (error) => {
        if (error) {
          console.error('Failed to delete cookie:', error);
        } else {
          console.log('Cookie deleted successfully');
        }
      });
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should convert jar.clear to jar.deleteCookies', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.clear('https://api.example.com', (error) => {
        if (error) {
          console.error('Failed to clear cookies:', error);
        } else {
          console.log('All cookies cleared for domain');
        }
      });
    `;

    const expectedOutput = `
      const jar = bru.cookies.jar();
      jar.deleteCookies('https://api.example.com', (error) => {
        if (error) {
          console.error('Failed to clear cookies:', error);
        } else {
          console.log('All cookies cleared for domain');
        }
      });
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle complex cookie workflow with jar variable', () => {
    const inputScript = `
      const cookieJar = pm.cookies.jar();
      
      // Set multiple cookies
      cookieJar.set('https://example.com', 'auth', 'token123');
      cookieJar.set('https://example.com', {
        key: 'preferences',
        value: JSON.stringify({theme: 'dark'}),
        path: '/'
      });
      
      // Get specific cookie
      cookieJar.get('https://example.com', 'auth', (err, authCookie) => {
        console.log('Auth cookie:', authCookie);
      });
      
      // Get all cookies
      cookieJar.getAll('https://example.com', (err, allCookies) => {
        console.log('Total cookies:', allCookies.length);
      });
      
      // Clean up
      cookieJar.unset('https://example.com', 'temp');
      cookieJar.clear('https://example.com');
    `;

    const expectedOutput = `
      const cookieJar = bru.cookies.jar();
      
      // Set multiple cookies
      cookieJar.setCookie('https://example.com', 'auth', 'token123');
      cookieJar.setCookie('https://example.com', {
        key: 'preferences',
        value: JSON.stringify({theme: 'dark'}),
        path: '/'
      });
      
      // Get specific cookie
      cookieJar.getCookie('https://example.com', 'auth', (err, authCookie) => {
        console.log('Auth cookie:', authCookie);
      });
      
      // Get all cookies
      cookieJar.getCookies('https://example.com', (err, allCookies) => {
        console.log('Total cookies:', allCookies.length);
      });
      
      // Clean up
      cookieJar.deleteCookie('https://example.com', 'temp');
      cookieJar.deleteCookies('https://example.com');
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle mixed jar variable and direct calls', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.get('https://api.com', 'session');
      
      pm.cookies.jar().set('https://other.com', 'temp', 'value');
      
      jar.getAll('https://api.com', (err, cookies) => {
        console.log(cookies);
      });
    `;

    const expectedOutput = `
      const jar = bru.cookies.jar();
      jar.getCookie('https://api.com', 'session');
      
      bru.cookies.jar().setCookie('https://other.com', 'temp', 'value');
      
      jar.getCookies('https://api.com', (err, cookies) => {
        console.log(cookies);
      });
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});
