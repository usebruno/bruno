const { default: postmanTranslation } = require("../../../src/postman/postman-translations");

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

  // Note: Variable assignment case has limitations - method names on variables aren't converted
  // This is a complex AST transformation that would require more sophisticated alias tracking
  test('should convert variable assignment but method calls need manual conversion', () => {
    const inputScript = `
      const jar = pm.cookies.jar();
      jar.set('https://example.com', 'user', 'john');
      const userCookie = jar.get('https://example.com', 'user');
    `;
    
    // Current behavior: pm.cookies.jar() is converted but method names on variables are not
    const actualOutput = `
      const jar = bru.cookies.jar();
      jar.set('https://example.com', 'user', 'john');
      const userCookie = jar.get('https://example.com', 'user');
    `;
    
    expect(postmanTranslation(inputScript)).toBe(actualOutput);
  });
}); 