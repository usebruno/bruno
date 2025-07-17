const { CookieJar } = require('tough-cookie');
const {
  addCookieString,
  addCookieToJar,
  populateCookieJarFromRequestAndResponse,
  getCookiesForUrl,
  getCookieStringForUrl
} = require('../../src/utils/cookies');

describe('Cookie Utils', () => {
  describe('addCookieString', () => {
    it('should populate cookie jar from cookie string correctly', () => {
      const cookieJar = new CookieJar();
      const cookieString = 'sessionId=abc123; userId=456; theme=dark';
      const url = 'http://example.com';
      
      addCookieString(cookieString, cookieJar, url);
      const cookies = getCookiesForUrl(cookieJar, url);
      
      expect(cookies).toHaveLength(3);
      expect(cookies.find(c => c.key === 'sessionId').value).toBe('abc123');
      expect(cookies.find(c => c.key === 'userId').value).toBe('456');
      expect(cookies.find(c => c.key === 'theme').value).toBe('dark');
    });

    it('should handle empty cookie string', () => {
      const cookieJar = new CookieJar();
      addCookieString('', cookieJar, 'http://example.com');
      const cookies = getCookiesForUrl(cookieJar, 'http://example.com');
      expect(cookies).toHaveLength(0);
    });

    it('should handle null/undefined input', () => {
      const cookieJar = new CookieJar();
      addCookieString(null, cookieJar, 'http://example.com');
      addCookieString(undefined, cookieJar, 'http://example.com');
      const cookies = getCookiesForUrl(cookieJar, 'http://example.com');
      expect(cookies).toHaveLength(0);
    });

    it('should handle cookies with equals signs in values', () => {
      const cookieJar = new CookieJar();
      const cookieString = 'token=abc=def=123; data=value=test';
      const url = 'http://example.com';
      
      addCookieString(cookieString, cookieJar, url);
      const cookies = getCookiesForUrl(cookieJar, url);
      
      expect(cookies).toHaveLength(2);
      expect(cookies.find(c => c.key === 'token').value).toBe('abc=def=123');
      expect(cookies.find(c => c.key === 'data').value).toBe('value=test');
    });
  });

  describe('addCookieToJar', () => {
    it('should populate cookie jar from single Set-Cookie header', () => {
      const cookieJar = new CookieJar();
      const setCookieHeader = 'sessionId=abc123; Path=/; HttpOnly';
      const url = 'http://example.com';
      
      addCookieToJar(setCookieHeader, cookieJar, url);
      const cookies = getCookiesForUrl(cookieJar, url);
      
      expect(cookies).toHaveLength(1);
      expect(cookies[0].key).toBe('sessionId');
      expect(cookies[0].value).toBe('abc123');
    });

    it('should populate cookie jar from array of Set-Cookie headers', () => {
      const cookieJar = new CookieJar();
      const setCookieHeaders = [
        'sessionId=abc123; Path=/; HttpOnly',
        'userId=456; Path=/'
      ];
      const url = 'http://example.com';
      
      addCookieToJar(setCookieHeaders, cookieJar, url);
      const cookies = getCookiesForUrl(cookieJar, url);
      
      expect(cookies).toHaveLength(2);
      expect(cookies.find(c => c.key === 'sessionId').value).toBe('abc123');
      expect(cookies.find(c => c.key === 'userId').value).toBe('456');
    });

    it('should handle empty input', () => {
      const cookieJar = new CookieJar();
      const url = 'http://example.com';
      
      addCookieToJar(null, cookieJar, url);
      addCookieToJar(undefined, cookieJar, url);
      addCookieToJar([], cookieJar, url);
      
      const cookies = getCookiesForUrl(cookieJar, url);
      expect(cookies).toHaveLength(0);
    });
  });

  describe('populateCookieJarFromRequestAndResponse', () => {
    it('should populate cookie jar from both request and response', () => {
      const request = {
        url: 'http://example.com',
        headers: {
          'cookie': 'existingCookie=value1; userPref=dark'
        }
      };
      const response = {
        headers: {
          'set-cookie': ['newCookie=value2; Path=/', 'sessionId=abc123; HttpOnly']
        }
      };
      
      const cookieJar = populateCookieJarFromRequestAndResponse(request, response);
      const cookies = getCookiesForUrl(cookieJar, 'http://example.com');
      
      expect(cookies).toHaveLength(4);
      expect(cookies.find(c => c.key === 'existingCookie').value).toBe('value1');
      expect(cookies.find(c => c.key === 'userPref').value).toBe('dark');
      expect(cookies.find(c => c.key === 'newCookie').value).toBe('value2');
      expect(cookies.find(c => c.key === 'sessionId').value).toBe('abc123');
    });

    it('should handle request with no cookies', () => {
      const request = { 
        url: 'http://example.com',
        headers: {} 
      };
      const response = {
        headers: {
          'set-cookie': 'newCookie=value; Path=/'
        }
      };
      
      const cookieJar = populateCookieJarFromRequestAndResponse(request, response);
      const cookies = getCookiesForUrl(cookieJar, 'http://example.com');
      
      expect(cookies).toHaveLength(1);
      expect(cookies[0].key).toBe('newCookie');
      expect(cookies[0].value).toBe('value');
    });

    it('should handle response with no Set-Cookie headers', () => {
      const request = {
        url: 'http://example.com',
        headers: {
          'cookie': 'existingCookie=value'
        }
      };
      const response = { headers: {} };
      
      const cookieJar = populateCookieJarFromRequestAndResponse(request, response);
      const cookies = getCookiesForUrl(cookieJar, 'http://example.com');
      
      expect(cookies).toHaveLength(1);
      expect(cookies[0].key).toBe('existingCookie');
      expect(cookies[0].value).toBe('value');
    });

    it('should handle empty request and response', () => {
      const cookieJar = populateCookieJarFromRequestAndResponse({}, {});
      const cookies = getCookiesForUrl(cookieJar, 'http://localhost');
      expect(cookies).toHaveLength(0);
    });
  });

  describe('getCookieStringForUrl', () => {
    it('should generate cookie string for URL', () => {
      const cookieJar = new CookieJar();
      const url = 'http://example.com';
      
      addCookieString('sessionId=abc123; userId=456', cookieJar, url);
      const cookieString = getCookieStringForUrl(cookieJar, url);
      
      expect(cookieString).toContain('sessionId=abc123');
      expect(cookieString).toContain('userId=456');
    });

    it('should return empty string for no cookies', () => {
      const cookieJar = new CookieJar();
      const cookieString = getCookieStringForUrl(cookieJar, 'http://example.com');
      expect(cookieString).toBe('');
    });
  });
}); 