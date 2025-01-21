const { Cookie, CookieJar } = require('tough-cookie');
const each = require('lodash/each');

const cookieJar = new CookieJar();

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

const deleteCookiesForDomain = (domain, path, cookieKey) => {
  return new Promise((resolve, reject) => {
    if (path && cookieKey) {
      cookieJar.store.removeCookie(domain, path, cookieKey, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    } else {
      cookieJar.store.removeCookies(domain, null, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    }
  });
};

module.exports = {
  addCookieToJar,
  getCookiesForUrl,
  getCookieStringForUrl,
  getDomainsWithCookies,
  deleteCookiesForDomain
};
