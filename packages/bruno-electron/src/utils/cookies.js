const { Cookie, CookieJar } = require('tough-cookie');
const each = require('lodash/each');

const cookieJar = new CookieJar();

const addCookieToJar = (setCookieHeader, requestUrl) => {
  const cookie = Cookie.parse(setCookieHeader, { loose: true });
  cookieJar.setCookieSync(cookie, requestUrl.startsWith('http') ? requestUrl : `http://${requestUrl}`, {
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
    const domainPathCookieMap = {};

    cookieJar.store.getAllCookies((err, cookies) => {
      if (err) {
        return reject(err);
      }

      cookies.forEach((cookie) => {
        const key = cookie.domain + cookie.path;

        if (!domainPathCookieMap[key]) {
          domainPathCookieMap[key] = [cookie];
        } else {
          domainPathCookieMap[key].push(cookie);
        }
      });

      const domains = Object.keys(domainPathCookieMap);
      const domainsWithCookies = [];

      each(domains, (domainPath) => {
        const cookies = domainPathCookieMap[domainPath];
        const validCookies = cookies.filter((cookie) => !cookie.expires || cookie.expires > Date.now());

        if (validCookies.length) {
          domainsWithCookies.push({
            domainPath,
            cookies: validCookies,
            cookieString: validCookies.map((cookie) => cookie.cookieString()).join('; ')
          });
        }
      });

      resolve(domainsWithCookies);
    });
  });
};

const deleteCookiesForDomain = (domain, path) => {
  return new Promise((resolve, reject) => {
    cookieJar.store.removeCookies(domain, path, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

const addCookiesForURL = (values) => {
  return new Promise((resolve, reject) => {
    try {
      const cookiesArray = values.cookieString.split(/\r?\n/);

      cookiesArray.forEach((cookie) => {
        addCookieToJar(cookie, values.url);
      });
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
};

module.exports = {
  addCookieToJar,
  getCookiesForUrl,
  getCookieStringForUrl,
  getDomainsWithCookies,
  deleteCookiesForDomain,
  addCookiesForURL
};
