const { CookieJar, Cookie } = require('tough-cookie');

/**
 * Adds cookies from a cookie string to a CookieJar (from request headers)
 * @param {string} cookieString - The cookie string to parse (from request headers)
 * @param {CookieJar} cookieJar - The CookieJar to populate
 * @param {string} url - The URL context for the cookies
 */
const addCookieString = (cookieString, cookieJar, url) => {
  if (!cookieString || typeof cookieString !== 'string' || !cookieJar || !url) {
    return;
  }
  
  cookieString.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name && name.trim()) {
      const value = valueParts.join('=');
      try {
        // Create a simple cookie and add it to the jar
        const cookieObj = new Cookie({
          key: name.trim(),
          value: value || '',
          path: '/'
        });
        cookieJar.setCookieSync(cookieObj, url, { ignoreError: true });
      } catch (error) {
        // Silently ignore invalid cookies
      }
    }
  });
};

const addCookieToJar = (setCookieHeaders, cookieJar, url) => {
  if (!setCookieHeaders || !cookieJar || !url) {
    return;
  }
  
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  
  headers.forEach(setCookieHeader => {
    if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
      try {
        // Use tough-cookie's built-in parsing for Set-Cookie headers
        const cookie = Cookie.parse(setCookieHeader, { loose: true });
        if (cookie) {
          cookieJar.setCookieSync(cookie, url, { ignoreError: true });
        }
      } catch (error) {
        // Silently ignore invalid cookies
      }
    }
  });
};

const populateCookieJarFromRequestAndResponse = (request, response, cookieJar = null) => {
  if (!cookieJar) {
    cookieJar = new CookieJar();
  }

  // Return early if no URL is available - cookies need URL context
  const url = request?.url;
  if (!url) {
    return cookieJar;
  }
  
  // Parse cookies from request headers
  if (request?.headers) {
    const cookieHeader = Object.entries(request.headers).find(([key]) => key.toLowerCase() === 'cookie');
    if (cookieHeader && cookieHeader[1]) {
      addCookieString(cookieHeader[1], cookieJar, url);
    }
  }
  
  // Parse cookies from response Set-Cookie headers
  if (response?.headers && response.headers['set-cookie']) {
    addCookieToJar(response.headers['set-cookie'], cookieJar, url);
  }
  
  return cookieJar;
};


const getCookiesForUrl = (cookieJar, url) => {
  if (!cookieJar || !url) {
    return [];
  }
  
  try {
    return cookieJar.getCookiesSync(url) || [];
  } catch (error) {
    return [];
  }
};


const getCookieStringForUrl = (cookieJar, url) => {
  const cookies = getCookiesForUrl(cookieJar, url);

  if (!Array.isArray(cookies) || !cookies.length) {
    return '';
  }

  const validCookies = cookies.filter((cookie) => !cookie.expires || cookie.expires > Date.now());
  return validCookies.map((cookie) => cookie.cookieString()).join('; ');
};

module.exports = {
  addCookieString,
  addCookieToJar,
  populateCookieJarFromRequestAndResponse,
  getCookiesForUrl,
  getCookieStringForUrl
}; 