const { parseCookieString, parseSetCookieHeaders, parseCookiesFromRequestAndResponse } = require('../../src/utils/cookies');

describe('Cookie Utils', () => {
  describe('parseCookieString', () => {
    it('should parse cookie string correctly', () => {
      const cookieString = 'sessionId=abc123; userId=456; theme=dark';
      const result = parseCookieString(cookieString);
      
      expect(result).toEqual({
        sessionId: 'abc123',
        userId: '456',
        theme: 'dark'
      });
    });

    it('should handle empty cookie string', () => {
      const result = parseCookieString('');
      expect(result).toEqual({});
    });

    it('should handle null/undefined input', () => {
      expect(parseCookieString(null)).toEqual({});
      expect(parseCookieString(undefined)).toEqual({});
    });

    it('should handle cookies with equals signs in values', () => {
      const cookieString = 'token=abc=def=123; data=value=test';
      const result = parseCookieString(cookieString);
      
      expect(result).toEqual({
        token: 'abc=def=123',
        data: 'value=test'
      });
    });
  });

  describe('parseSetCookieHeaders', () => {
    it('should parse single Set-Cookie header', () => {
      const setCookieHeader = 'sessionId=abc123; Path=/; HttpOnly';
      const result = parseSetCookieHeaders(setCookieHeader);
      
      expect(result).toEqual({
        sessionId: 'abc123'
      });
    });

    it('should parse array of Set-Cookie headers', () => {
      const setCookieHeaders = [
        'sessionId=abc123; Path=/; HttpOnly',
        'userId=456; Path=/; Secure'
      ];
      const result = parseSetCookieHeaders(setCookieHeaders);
      
      expect(result).toEqual({
        sessionId: 'abc123',
        userId: '456'
      });
    });

    it('should handle empty input', () => {
      expect(parseSetCookieHeaders(null)).toEqual({});
      expect(parseSetCookieHeaders(undefined)).toEqual({});
      expect(parseSetCookieHeaders([])).toEqual({});
    });
  });

  describe('parseCookiesFromRequestAndResponse', () => {
    it('should parse cookies from both request and response', () => {
      const request = {
        headers: {
          'cookie': 'existingCookie=value1; userPref=dark'
        }
      };
      const response = {
        headers: {
          'set-cookie': ['newCookie=value2; Path=/', 'sessionId=abc123; HttpOnly']
        }
      };
      
      const result = parseCookiesFromRequestAndResponse(request, response);
      
      expect(result).toEqual({
        existingCookie: 'value1',
        userPref: 'dark',
        newCookie: 'value2',
        sessionId: 'abc123'
      });
    });

    it('should handle request with no cookies', () => {
      const request = { headers: {} };
      const response = {
        headers: {
          'set-cookie': 'newCookie=value; Path=/'
        }
      };
      
      const result = parseCookiesFromRequestAndResponse(request, response);
      
      expect(result).toEqual({
        newCookie: 'value'
      });
    });

    it('should handle response with no Set-Cookie headers', () => {
      const request = {
        headers: {
          'cookie': 'existingCookie=value'
        }
      };
      const response = { headers: {} };
      
      const result = parseCookiesFromRequestAndResponse(request, response);
      
      expect(result).toEqual({
        existingCookie: 'value'
      });
    });

    it('should handle empty request and response', () => {
      const result = parseCookiesFromRequestAndResponse({}, {});
      expect(result).toEqual({});
    });
  });
}); 