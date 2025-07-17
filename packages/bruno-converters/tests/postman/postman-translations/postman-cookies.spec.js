const { default: postmanTranslation } = require("../../../src/postman/postman-translations");

describe('postmanTranslations - cookies commands', () => {
  test('should handle cookies commands', () => {
    const inputScript = `
      const sessionCookie = pm.cookies.get('sessionId');
      
      if (pm.cookies.has('token')) {
        console.log('Token cookie exists');
      }
      
      const allCookies = pm.cookies.toObject();
      
      pm.test('Cookie is present', function() {
        pm.expect(pm.cookies.has('JSESSIONID')).to.be.true;
      });
      
      const authCookie = pm.cookies.get('auth');
      const userCookie = pm.cookies.get('user');
    `;
    const expectedOutput = `
      const sessionCookie = bru.cookies.get('sessionId');
      
      if (bru.cookies.has('token')) {
        console.log('Token cookie exists');
      }
      
      const allCookies = bru.cookies.get();
      
      test('Cookie is present', function() {
        expect(bru.cookies.has('JSESSIONID')).to.be.true;
      });
      
      const authCookie = bru.cookies.get('auth');
      const userCookie = bru.cookies.get('user');
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});
