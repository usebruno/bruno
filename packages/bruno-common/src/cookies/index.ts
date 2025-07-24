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
  console.log('cookieObj: ', cookieObj);
  return {
    ...cookieObj,
    path: cookieObj.path,
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

const saveCookies = (url: string, headers: any) => {
  if (headers['set-cookie']) {
    let setCookieHeaders = Array.isArray(headers['set-cookie'])
      ? headers['set-cookie']
      : [headers['set-cookie']];
    for (let setCookieHeader of setCookieHeaders) {
      if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
        addCookieToJar(setCookieHeader, url);
      }
    }
  }
};

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
      nameOrCookieObj: string | Record<string, any>,
      valueOrCallback?: string | ((err?: Error) => void),
      maybeCallback?: (err?: Error) => void
    ) {
      // Normalize callback & params
      let callback: (err?: Error) => void = () => {};

      if (typeof maybeCallback === 'function') {
        callback = maybeCallback;
      } else if (typeof valueOrCallback === 'function') {
        callback = valueOrCallback as (err?: Error) => void;
      }

      try {
        if (!url) throw new Error('URL is required');

        // CASE 1: name/value pair provided
        if (typeof nameOrCookieObj === 'string') {
          const cookieName = nameOrCookieObj;
          const cookieValue = typeof valueOrCallback === 'string' ? valueOrCallback : '';

          if (!cookieName) throw new Error('Cookie name is required');

          const cookie = new Cookie({
            key: cookieName,
            value: cookieValue,
            domain: new URL(url).hostname,
          });

          cookieJar.setCookieSync(cookie, url, { ignoreError: true });
          return callback();
        }

        // CASE 2: cookie object provided
        if (typeof nameOrCookieObj === 'object' && nameOrCookieObj !== null) {
          const obj = { ...(nameOrCookieObj as any) } as any;

          if (!obj.key && obj.name) obj.key = obj.name;
          if (!obj.key) throw new Error('cookieObject.key (name) is required');

          const base = {
            domain: new URL(url).hostname,
            ...obj,
          } as any;

          const processedCookie = createCookieObj(base);
          const cookie = new Cookie(processedCookie);
          cookieJar.setCookieSync(cookie, url, { ignoreError: true });
          return callback();
        }

        // If we reach here, arguments were invalid
        throw new Error('Invalid arguments passed to setCookie');
      } catch (err) {
        callback(err as Error);
      }
    },


    setCookies: function (
      url: string,
      cookiesArray: any[],
      callback: (err?: Error) => void = () => {}
    ) {
      try {
        if (!url) throw new Error('URL is required');
        if (!Array.isArray(cookiesArray)) {
          throw new Error('setCookies expects an array of cookie objects');
        }

        for (const cookieObject of cookiesArray) {
          const obj = { ...(cookieObject as any) } as any;

          if (!obj.key && obj.name) obj.key = obj.name;
          if (!obj.key) throw new Error('cookieObject.key (name) is required');

          const base = {
            domain: new URL(url).hostname,
            ...obj
          } as any;

          const processedCookie = createCookieObj(base);
          const cookie = new Cookie(processedCookie);
          cookieJar.setCookieSync(cookie, url, { ignoreError: true });
        }

        callback();
      } catch (err) {
        callback(err as Error);
      }
    },


    clear: function (callback: (err?: Error) => void = () => {}) {
      (cookieJar as any).store.removeAllCookies(callback);
    },

    deleteCookies: function (url: string, callback: (err?: Error) => void = () => {}) {
      if (!url) return callback(new Error('URL is required'));

      cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
        if (err) return callback(err);
        if (!cookies || !cookies.length) return callback();

        let pending = cookies.length;
        const done = (removeErr?: Error) => {
          if (removeErr) return callback(removeErr);
          if (--pending === 0) {
            callback();
          }
        };

        cookies.forEach((cookie) => {
          (cookieJar as any).store.removeCookie(cookie.domain, cookie.path, cookie.key, done);
        });
      });
    },

    unset: function (url: string, cookieName: string, callback: (err?: Error) => void = () => {}) {
      if (!url) return callback(new Error('URL is required'));
      if (!cookieName) return callback(new Error('Cookie name is required'));

      // Retrieve cookies applicable for the URL and choose **one** to delete.
      cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
        if (err) return callback(err);

        // Filter cookies matching key
        const matchingCookies = (cookies || []).filter((c) => c.key === cookieName);
        if (!matchingCookies.length) return callback();

        const urlPath = new URL(url).pathname || '/';

        // Prioritise a cookie whose path exactly matches the URL path
        let cookieToDelete = matchingCookies.find((c) => c.path === urlPath);

        // If not found, fall back to the first matching cookie (most specific path first)
        if (!cookieToDelete) {
          // tough-cookie sorts cookies by path length desc, preserve that order
          cookieToDelete = matchingCookies[0];
        }

        (cookieJar as any).store.removeCookie(
          cookieToDelete.domain,
          cookieToDelete.path,
          cookieToDelete.key,
          callback
        );
      });
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
  jar: cookieJarWrapper,
  saveCookies
};

export default cookiesModule; 