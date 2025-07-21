// @ts-nocheck
import { Cookie, CookieJar } from 'tough-cookie';
import each from 'lodash/each';
import moment from 'moment';

const { isPotentiallyTrustworthyOrigin } = require('@usebruno/requests').utils;

const cookieJar = new CookieJar();

const addCookieToJar = (setCookieHeader: string, requestUrl: string): void => {
  const cookie = Cookie.parse(setCookieHeader, { loose: true });
  if (!cookie) return;
  cookieJar.setCookieSync(cookie, requestUrl, {
    // Silently ignore parse errors / invalid domains – behaviour matches Postman
    ignoreError: true
  });
};

const getCookiesForUrl = (url: string) => {
  return cookieJar.getCookiesSync(url, {
    secure: isPotentiallyTrustworthyOrigin(url)
  });
};

const getCookieStringForUrl = (url: string): string => {
  const cookies = getCookiesForUrl(url);
  if (!Array.isArray(cookies) || !cookies.length) return '';

  const validCookies = cookies.filter((cookie: any) => !cookie.expires || (cookie.expires as any) > Date.now());
  return validCookies.map((cookie) => cookie.cookieString()).join('; ');
};

const getDomainsWithCookies = (): Promise<Array<{ domain: string; cookies: Cookie[]; cookieString: string }>> => {
  return new Promise((resolve, reject) => {
    const domainCookieMap: Record<string, Cookie[]> = {};

    (cookieJar as any).store.getAllCookies((err: Error, cookies: Cookie[]) => {
      if (err) return reject(err);

      cookies.forEach((cookie) => {
        if (!domainCookieMap[cookie.domain]) {
          domainCookieMap[cookie.domain] = [cookie];
        } else {
          domainCookieMap[cookie.domain].push(cookie);
        }
      });

      const domains = Object.keys(domainCookieMap);
      const domainsWithCookies: Array<{ domain: string; cookies: Cookie[]; cookieString: string }> = [];

      each(domains, (domain) => {
        const cookiesForDomain = domainCookieMap[domain];
        const validCookies = cookiesForDomain.filter((cookie: any) => !cookie.expires || (cookie.expires as any) > Date.now());

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

const deleteCookie = (domain: string, path: string, cookieKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    (cookieJar as any).store.removeCookie(domain, path, cookieKey, (err: Error) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const deleteCookiesForDomain = (domain: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    (cookieJar as any).store.removeCookies(domain, null, (err: Error) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const updateCookieObj = (cookieObj: any, oldCookie: Cookie) => {
  return {
    ...cookieObj,
    path: oldCookie.path,
    key: oldCookie.key,
    domain: oldCookie.domain,
    expires: cookieObj?.expires && moment(cookieObj.expires).isValid() ? new Date(cookieObj.expires) : Infinity,
    creation: oldCookie?.creation && moment(oldCookie.creation).isValid() ? new Date(oldCookie.creation) : new Date(),
    lastAccessed:
      oldCookie?.lastAccessed && moment(oldCookie.lastAccessed).isValid()
        ? new Date(oldCookie.lastAccessed)
        : new Date()
  } as any;
};

const createCookieObj = (cookieObj: any) => {
  return {
    ...cookieObj,
    path: cookieObj.path || '/',
    expires: cookieObj?.expires && moment(cookieObj.expires).isValid() ? new Date(cookieObj.expires) : Infinity,
    creation: cookieObj?.creation && moment(cookieObj.creation).isValid() ? new Date(cookieObj.creation) : new Date(),
    lastAccessed:
      cookieObj?.lastAccessed && moment(cookieObj.lastAccessed).isValid()
        ? new Date(cookieObj.lastAccessed)
        : new Date()
  } as any;
};

const addCookieForDomain = (domain: string, cookieObj: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const cookie = new Cookie(createCookieObj(cookieObj));
      (cookieJar as any).store.putCookie(cookie, (err: Error) => {
        if (err) return reject(err);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

const modifyCookieForDomain = (domain: string, oldCookieObj: any, cookieObj: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const oldCookie = new Cookie(createCookieObj(oldCookieObj));
      const newCookie = new Cookie(updateCookieObj(cookieObj, oldCookie));
      (cookieJar as any).store.updateCookie(oldCookie, newCookie, (removeErr: Error) => {
        if (removeErr) return reject(removeErr);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

const parseCookieString = (cookieStr: string): any | null => {
  try {
    const cookie = Cookie.parse(cookieStr);
    if (!cookie) return null;
    return {
      ...cookie,
      expires: cookie.expires === Infinity ? null : cookie.expires
    };
  } catch (err) {
    throw err;
  }
};

const createCookieString = (cookieObj: any): string => {
  const cookie = new Cookie(createCookieObj(cookieObj));
  let cookieString = cookie.toString(); // tough-cookie omits domain

  // Manually append domain if cookie is hostOnly but we still want Domain flag
  if (cookieObj.hostOnly && !cookieString.includes('Domain=')) {
    cookieString += `; Domain=${cookieObj.domain}`;
  }
  return cookieString;
}

const cookieJarWrapper = () => {
  return {
  
    // Get the full cookie object for the given URL & name.
    get: function (
      url: string,
      cookieName: string,
      callback: (err: Error | null, cookie?: Cookie | null) => void
    ) {
      if (!url || !cookieName) return callback(new Error('URL and cookie name are required'));

      cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
        if (err) return callback(err);
        const cookie = cookies.find((c) => c.key === cookieName);
        callback(null, cookie || null);
      });
    },
   
    // Get all cookies that would be sent to the given URL.
    getAll: function (url: string, callback: (err: Error | null, cookies?: Cookie[]) => void) {
      if (!url) return callback(new Error('URL is required'));
      cookieJar.getCookies(url, callback);
    },

    setCookie: function (
      url: string,
      cookieName: string,
      cookieValue: string,
      callback: (err?: Error) => void = () => {}
    ) {
      try {
        if (!url || !cookieName) throw new Error('URL and cookie name are required');

        const cookie = new Cookie({
          key: cookieName,
          value: cookieValue,
          domain: new URL(url).hostname,
          path: '/'
        });

        cookieJar.setCookieSync(cookie, url, { ignoreError: true });
        callback();
      } catch (err) {
        callback(err as Error);
      }
    },


    setCookies: function (
      url: string,
      cookieObject: any,
      callback: (err?: Error) => void = () => {}
    ) {
      try {
        if (!url || !cookieObject) throw new Error('URL and cookie object are required');

        const obj = { ...cookieObject } as any;
        if (!obj.key && obj.name) obj.key = obj.name;
        if (!obj.key) throw new Error('cookieObject.key (name) is required');

        const base = {
          domain: new URL(url).hostname,
          path: '/',
          ...obj
        } as any;

        const cookie = new Cookie(base);
        cookieJar.setCookieSync(cookie, url, { ignoreError: true });
        callback();
      } catch (err) {
        callback(err as Error);
      }
    },


    clear: function (url: string, callback: (err?: Error) => void = () => {}) {
      if (!url) return callback(new Error('URL is required'));

      const domain = new URL(url).hostname;
      (cookieJar as any).store.removeCookies(domain, null, callback);
    },

    unset: function (url: string, cookieName: string, callback: (err?: Error) => void = () => {}) {
      return this.clear(url, cookieName, callback);
    }
  } as const;
};


const cookiesModule = {
  cookieJar,
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
  jar: cookieJarWrapper
};

export default cookiesModule; 