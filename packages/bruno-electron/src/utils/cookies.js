const { Cookie, CookieJar } = require('tough-cookie');
const each = require('lodash/each');
const moment = require('moment');

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

const transformCookieObject = (cookieObj, oldCookie = null) => {
  // If oldCookie exists, preserve path, key, and domain
  if (oldCookie) {
    return {
      ...cookieObj,
      // Preserve immutable properties from old cookie
      path: oldCookie.path,
      key: oldCookie.key,
      domain: oldCookie.domain,
      // Handle other mutable properties
      expires: cookieObj?.expires && moment(cookieObj.expires).isValid() ? new Date(cookieObj.expires) : Infinity,
      creation: oldCookie?.creation && moment(oldCookie.creation).isValid() ? new Date(oldCookie.creation) : new Date(),
      lastAccessed:
        oldCookie?.lastAccessed && moment(oldCookie.lastAccessed).isValid()
          ? new Date(oldCookie.lastAccessed)
          : new Date()
    };
  }

  // For new cookies, use provided values
  return {
    ...cookieObj,
    path: cookieObj.path || '/',
    expires: cookieObj?.expires && moment(cookieObj.expires).isValid() ? new Date(cookieObj.expires) : Infinity,
    creation: cookieObj?.creation && moment(cookieObj.creation).isValid() ? new Date(cookieObj.creation) : new Date(),
    lastAccessed:
      cookieObj?.lastAccessed && moment(cookieObj.lastAccessed).isValid()
        ? new Date(cookieObj.lastAccessed)
        : new Date()
  };
};

const addCookieForDomain = (domain, cookieObj) => {
  return new Promise((resolve, reject) => {
    try {
      const cookie = new Cookie(transformCookieObject(cookieObj));
      cookieJar.store.putCookie(cookie, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

const modifyCookieForDomain = (domain, oldCookieObj, cookieObj) => {
  return new Promise((resolve, reject) => {
    try {
      const oldCookie = new Cookie(transformCookieObject(oldCookieObj));
      const newCookie = new Cookie(transformCookieObject(cookieObj, oldCookie));
      cookieJar.store.updateCookie(oldCookie, newCookie, (removeErr) => {
        if (removeErr) {
          return reject(removeErr);
        }
        return resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

const parseCookieString = (cookieObj, cookieStr) => {
  try {
    const cookie = Cookie.parse(cookieStr);
    if (!cookie) return null;

    return {
      ...cookieObj,
      ...cookie,
      expires: cookie.expires === Infinity ? null : cookie.expires
    };
  } catch (err) {
    throw new Error(err);
  }
};

const createCookieString = (cookieObj) => {
  const cookie = new Cookie(transformCookieObject(cookieObj));

  // cookie.toString() omits the domain
  let cookieString = cookie.toString();

  // Manually append domain and hostOnly if they exist
  if (cookieObj.hostOnly && !cookieString.includes('Domain=')) {
    cookieString += `; Domain=${cookieObj.domain}`;
  }

  return cookieString;
};

module.exports = {
  addCookieToJar,
  getCookiesForUrl,
  getCookieStringForUrl,
  getDomainsWithCookies,
  deleteCookiesForDomain,
  addCookieForDomain,
  modifyCookieForDomain,
  parseCookieString,
  createCookieString
};
