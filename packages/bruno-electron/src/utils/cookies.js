const cookies = require('@usebruno/requests').cookies;

const parseCookieHeaderString = (str) => str.split(';').reduce((parsed, cookie) => {
  const [name, ...rest] = cookie.split('=');
  if (name && name.trim()) {
    parsed[name.trim()] = rest.join('=').trim();
  }
  return parsed;
}, {});

// Merges cookies from the jar into `headers`, in place, combining with any cookie header already set on the request.
const attachCookieHeader = (url, headers) => {
  const cookieString = cookies.getCookieStringForUrl(url);
  if (!cookieString || typeof cookieString !== 'string' || !cookieString.length) {
    return;
  }

  const existingCookieHeaderName = Object.keys(headers).find((name) => name.toLowerCase() === 'cookie');
  const existingCookieString = existingCookieHeaderName ? headers[existingCookieHeaderName] : '';

  const mergedCookies = {
    ...parseCookieHeaderString(existingCookieString),
    ...parseCookieHeaderString(cookieString)
  };

  const combinedCookieString = Object.entries(mergedCookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  headers[existingCookieHeaderName || 'Cookie'] = combinedCookieString;
};

module.exports = { ...cookies, attachCookieHeader };
