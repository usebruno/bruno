/**
 * Parses a cookie string into an object with cookie name-value pairs
 * @param {string} cookieString - The cookie string to parse (from request headers)
 * @returns {Object} Object with cookie name-value pairs
 */
const parseCookieString = (cookieString) => {
  const cookiesObj = {};
  
  if (!cookieString || typeof cookieString !== 'string') {
    return cookiesObj;
  }
  
  cookieString.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookiesObj[name] = valueParts.join('=');
    }
  });
  
  return cookiesObj;
};

/**
 * Parses Set-Cookie header(s) into an object with cookie name-value pairs
 * @param {string|string[]} setCookieHeaders - Set-Cookie header(s) from response
 * @returns {Object} Object with cookie name-value pairs
 */
const parseSetCookieHeaders = (setCookieHeaders) => {
  const cookiesObj = {};
  
  if (!setCookieHeaders) {
    return cookiesObj;
  }
  
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  
  headers.forEach(setCookieHeader => {
    if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
      const [cookiePair] = setCookieHeader.split(';');
      if (cookiePair) {
        const [name, ...valueParts] = cookiePair.trim().split('=');
        if (name) {
          cookiesObj[name] = valueParts.join('=');
        }
      }
    }
  });
  
  return cookiesObj;
};

/**
 * Parses cookies from both request headers and response Set-Cookie headers
 * @param {Object} request - Request object with headers
 * @param {Object} response - Response object with headers
 * @returns {Object} Combined object with all cookies
 */
const parseCookiesFromRequestAndResponse = (request, response) => {
  let cookiesObj = {};
  
  // Parse cookies from request headers
  if (request?.headers) {
    const cookieHeader = Object.entries(request.headers).find(([key]) => key.toLowerCase() === 'cookie');
    if (cookieHeader && cookieHeader[1]) {
      cookiesObj = parseCookieString(cookieHeader[1]);
    }
  }
  
  // Parse cookies from response Set-Cookie headers
  if (response?.headers && response.headers['set-cookie']) {
    const setCookies = parseSetCookieHeaders(response.headers['set-cookie']);
    cookiesObj = { ...cookiesObj, ...setCookies };
  }
  
  return cookiesObj;
};

module.exports = {
  parseCookieString,
  parseSetCookieHeaders,
  parseCookiesFromRequestAndResponse
}; 