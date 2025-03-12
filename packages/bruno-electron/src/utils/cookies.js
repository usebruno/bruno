const { Cookie, CookieJar, MemoryCookieStore } = require('tough-cookie');
const each = require('lodash/each');
const moment = require('moment');
const CookiePersistentStore = require('../store/cookies');
const { encryptString, decryptString } = require('./encryption');

const createCookieObj = (cookieObj) => {
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

class EncryptedCookieStore extends MemoryCookieStore {
  constructor() {
    super();
    this.persistentStore = new CookiePersistentStore();
    const cookieIdx = this.persistentStore.getCookieIdx();
    if (cookieIdx && typeof cookieIdx === 'object') {
      
      this.idx = Object.create(null);
      
      for (const domain in cookieIdx) {
        for (const path in cookieIdx[domain]) {
          for (const key in cookieIdx[domain][path]) {
            const cookie = cookieIdx[domain][path][key];
            const cookieObj = Cookie.fromJSON(createCookieObj(cookie));
            if (cookieObj) {
              super.putCookie(cookieObj);
            }
          }
        }
      }
    }
  }

  putCookie(cookie, cb) {
    try {
      super.putCookie(cookie, cb);
      this.persistentStore.setCookie(cookie);
    } catch (err) {
      console.error('Error putting cookie', err);
      cb && cb(err);
    }
  }

  removeCookie(domain, path, key, cb) {
    super.removeCookie(domain, path, key, (err) => {
      if (!err) {
        this.persistentStore.deleteCookie(domain, path, key);
      }
      cb && cb(err);
    });
  }

  removeCookies(domain, path, cb) {
    super.removeCookies(domain, path, (err) => {
      if (!err) {
        this.persistentStore.deleteCookies(domain, path);
      }
      cb && cb(err);
    });
  }

  removeAllCookies(cb) {
    super.removeAllCookies(cb);
    this.persistentStore.removeAllCookies();
  }

}

const cookieStore = new EncryptedCookieStore();
const cookieJar = new CookieJar(cookieStore);

const addCookieToJar = async (setCookieHeader, requestUrl) => {
  const cookie = Cookie.parse(setCookieHeader, { loose: true });
  cookieJar.setCookieSync(cookie, requestUrl, {
    ignoreError: true // silently ignore things like parse errors and invalid domains
  });
};

// Allow access to the cookie store instance for app shutdown
const getEncryptedCookieStore = () => cookieStore;

const getCookiesForUrl = async (url) => {
  return cookieJar.getCookiesSync(url);
};

const getCookieStringForUrl = async (url) => {
  const cookies = await getCookiesForUrl(url);

  if (!Array.isArray(cookies) || !cookies.length) {
    return '';
  }

  const validCookies = cookies.filter((cookie) => !cookie.expires || cookie.expires > Date.now());

  return validCookies.map((cookie) => cookie.cookieString()).join('; ');
};

const getDomainsWithCookies = async () => {
  return new Promise((resolve, reject) => {
    if (!cookieJar || !cookieJar.store) {
      return resolve([]);
    }

    cookieJar.store.getAllCookies((err, cookies) => {
      if (err) {
        return reject(err);
      }

      const domainCookieMap = {};

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

const deleteCookie = async (domain, path, cookieKey) => {
  
  return new Promise((resolve, reject) => {
    cookieJar.store.removeCookie(domain, path, cookieKey, async (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
};

const deleteCookiesForDomain = async (domain) => {
  
  return new Promise((resolve, reject) => {   
    cookieJar.store.removeCookies(domain, null, async (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
};

const updateCookieObj = (cookieObj, oldCookie) => {
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
};

const addCookieForDomain = async (domain, cookieObj) => {
  
  return new Promise((resolve, reject) => {
    try {
      const cookie = new Cookie(createCookieObj(cookieObj));
      cookieJar.store.putCookie(cookie, async (err) => {
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

const modifyCookieForDomain = async (domain, oldCookieObj, cookieObj) => {
  
  return new Promise((resolve, reject) => {
    try {
      const oldCookie = new Cookie(createCookieObj(oldCookieObj));
      const newCookie = new Cookie(updateCookieObj(cookieObj, oldCookie));
      cookieJar.store.updateCookie(oldCookie, newCookie, async (removeErr) => {
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

const parseCookieString = (cookieStr) => {
  try {
    const cookie = Cookie.parse(cookieStr);
    if (!cookie) return null;

    return {
      ...cookie,
      expires: cookie.expires === Infinity ? null : cookie.expires
    };
  } catch (err) {
    throw new Error(err);
  }
};

const createCookieString = (cookieObj) => {
  const cookie = new Cookie(createCookieObj(cookieObj));

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
  deleteCookie,
  deleteCookiesForDomain,
  addCookieForDomain,
  modifyCookieForDomain,
  parseCookieString,
  createCookieString,
  updateCookieObj,
  createCookieObj,
  getEncryptedCookieStore
};
