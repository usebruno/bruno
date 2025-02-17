const { Cookie, CookieJar } = require('tough-cookie');
const each = require('lodash/each');

const cookieJar = new CookieJar();

const cookieJarWrapper = () => {
  return {
    get: function (url, cookieName, callback) {
      cookieJar.getCookies(url, (err, cookies) => {
        if (err) return callback(err);
        const cookie = cookies.find(cookie => cookie.key === cookieName);
        callback(null, cookie ? cookie.value : null);
      });
    },

    getSync: function (url) {
      const cookies = cookieJar.getCookiesSync(url);
      return cookies;
    },
  
    getAll: function (url, callback) {
      cookieJar.getCookies(url, callback);
    },

    set: function (url, cookieName, cookieValue, options, callback) {
      const cookie = new Cookie({
        key: cookieName,
        value: cookieValue,
        domain: new URL(url).hostname,
        path: '/',
        ...options
      });
      cookieJar.setCookie(cookie.toString(), url, callback);
    },

    unset: function (url, cookieName, callback) {
      const expiredCookie = new Cookie({
        key: cookieName,
        value: '',
        expires: new Date(0), // Set the cookie to expire in the past
        domain: new URL(url).hostname,
        path: '/',
      });
      cookieJar.setCookie(expiredCookie.toString(), url, callback);
    },

    clear: function (url, callback) {
      cookieJar.removeAllCookies(callback);
    }
  };
}

const addCookieToJar = (setCookieHeader, requestUrl) => {
  const cookie = Cookie.parse(setCookieHeader, { loose: true });
  cookieJar.setCookieSync(cookie, requestUrl, {
    ignoreError: true // silently ignore things like parse errors and invalid domains
  });
};

const getCookiesForUrl = (url) => {
  return cookieJar.getCookiesSync(url);
};

const getCookieStringForUrl = (url) => {
  const cookies = getCookiesForUrl(url);

  if (!Array.isArray(cookies) || !cookies.length) {
    return '';
  }

  const validCookies = cookies.filter((cookie) => !cookie.expires || cookie.expires > Date.now());

  return validCookies.map((cookie) => cookie.cookieString()).join('; ');
};

const getDomainsWithCookies = () => {
  return new Promise((resolve, reject) => {
    const domainCookieMap = {};

    cookieJar.store.getAllCookies((err, cookies) => {
      if (err) {
        return reject(err);
      }

      cookies.forEach((cookie) => {
        if (!domainCookieMap[cookie.domain]) {
          domainCookieMap[cookie.domain] = [cookie];
        } else {
          domainCookieMap[cookie.domain].push(cookie);
        }
      });

      const domains = Object.keys(domainCookieMap);
      const domainsWithCookies = [];

      each(domains, (domain) => {
        const cookies = domainCookieMap[domain];
        const validCookies = cookies.filter((cookie) => !cookie.expires || cookie.expires > Date.now());

        if (validCookies.length) {
          domainsWithCookies.push({
            domain,
            cookies: validCookies,
            cookieString: validCookies.map((cookie) => cookie.cookieString()).join('; ')
          });
        }
      });

      resolve(domainsWithCookies);
    });
  });
};

const deleteCookiesForDomain = (domain) => {
  return new Promise((resolve, reject) => {
    cookieJar.store.removeCookies(domain, null, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

const saveCookies = (url, headers) => {
  let setCookieHeaders = [];
  if (headers['set-cookie']) {
    setCookieHeaders = Array.isArray(headers['set-cookie'])
      ? headers['set-cookie']
      : [headers['set-cookie']];
    for (let setCookieHeader of setCookieHeaders) {
      if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
        addCookieToJar(setCookieHeader, url);
      }
    }
  }
}

module.exports = {
  addCookieToJar,
  getCookiesForUrl,
  getCookieStringForUrl,
  getDomainsWithCookies,
  deleteCookiesForDomain,
  saveCookies,
  cookieJarWrapper
};
