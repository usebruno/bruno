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
    getCookie: function (
      url: string,
      cookieName: string,
      callback?: (err: Error | null | undefined, cookie?: Cookie | null) => void
    ) {
      if (!url || !cookieName) {
        const error = new Error('URL and cookie name are required');
        if (callback) return callback(error);
        return Promise.reject(error);
      }

      if (callback) {
        // Callback mode
        return cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
          if (err) return callback(err);
          const cookie = cookies.find((c) => c.key === cookieName);
          callback(null, cookie || null);
        });
      }

      // Promise mode
      return new Promise<Cookie | null>((resolve, reject) => {
        cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
          if (err) return reject(err);
          const cookie = cookies.find((c) => c.key === cookieName);
          resolve(cookie || null);
        });
      });
    },
   
    // Get all cookies that would be sent to the given URL.
    getCookies: function (url: string, callback?: (err: Error | null | undefined, cookies?: Cookie[]) => void) {
      if (!url) {
        const error = new Error('URL is required');
        if (callback) return callback(error);
        return Promise.reject(error);
      }

      if (callback) {
        // Callback mode
        return cookieJar.getCookies(url, callback);
      }

      // Promise mode
      return new Promise<Cookie[]>((resolve, reject) => {
        cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
          if (err) return reject(err);
          resolve(cookies);
        });
      });
    },

    setCookie: function (
      url: string,
      nameOrCookieObj: string | Record<string, any>,
      valueOrCallback?: string | ((err?: Error | undefined) => void),
      maybeCallback?: (err?: Error | undefined) => void
    ) {
      // Determine the callback
      let callback: ((err?: Error | undefined) => void) | undefined;
      if (typeof maybeCallback === 'function') {
        callback = maybeCallback;
      } else if (typeof valueOrCallback === 'function') {
        callback = valueOrCallback as (err?: Error | undefined) => void;
      }

      const executeSetCookie = () => {
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
          return;
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
          return;
        }

        // If we reach here, arguments were invalid
        throw new Error('Invalid arguments passed to setCookie');
      };

      if (callback) {
        // Callback mode
        try {
          executeSetCookie();
          callback(null);
        } catch (err) {
          callback(err as Error);
        }
        return;
      }

      // Promise mode
      return new Promise<void>((resolve, reject) => {
        try {
          executeSetCookie();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    },


    setCookies: function (
      url: string,
      cookiesArray: any[],
      callback?: (err?: Error | undefined) => void
    ) {
      const executeSetCookies = () => {
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
      };

      if (callback) {
        // Callback mode
        try {
          executeSetCookies();
          callback(null);
        } catch (err) {
          callback(err as Error);
        }
        return;
      }

      // Promise mode
      return new Promise<void>((resolve, reject) => {
        try {
          executeSetCookies();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    },


    clear: function (callback?: (err?: Error | undefined) => void) {
      if (callback) {
        // Callback mode
        return (cookieJar as any).store.removeAllCookies(callback);
      }

      // Promise mode
      return new Promise<void>((resolve, reject) => {
        (cookieJar as any).store.removeAllCookies((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },

    deleteCookies: function (url: string, callback?: (err?: Error | undefined) => void) {
      if (!url) {
        const error = new Error('URL is required');
        if (callback) return callback(error);
        return Promise.reject(error);
      }

      if (callback) {
        // Callback mode
        return cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
          if (err) return callback(err);
          if (!cookies || !cookies.length) return callback(null);

          let pending = cookies.length;
          const done = (removeErr?: Error) => {
            if (removeErr) return callback(removeErr);
            if (--pending === 0) {
              callback(null);
            }
          };

          cookies.forEach((cookie) => {
            (cookieJar as any).store.removeCookie(cookie.domain, cookie.path, cookie.key, done);
          });
        });
      }

      // Promise mode
      return new Promise<void>((resolve, reject) => {
        cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
          if (err) return reject(err);
          if (!cookies || !cookies.length) return resolve();

          let pending = cookies.length;
          const done = (removeErr?: Error) => {
            if (removeErr) return reject(removeErr);
            if (--pending === 0) {
              resolve();
            }
          };

          cookies.forEach((cookie) => {
            (cookieJar as any).store.removeCookie(cookie.domain, cookie.path, cookie.key, done);
          });
        });
      });
    },

    deleteCookie: function (url: string, cookieName: string, callback?: (err?: Error | undefined) => void) {
      if (!url || !cookieName) {
        const error = new Error('URL and cookie name are required');
        if (callback) return callback(error);
        return Promise.reject(error);
      }

      const executeDelete = (callback: (err?: Error) => void) => {
        cookieJar.getCookies(url, (err: Error, cookies: Cookie[]) => {
          if (err) return callback(err);

          // Filter cookies matching key
          const matchingCookies = (cookies || []).filter((c) => c.key === cookieName);
          if (!matchingCookies.length) return callback(null);

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
      };

      if (callback) {
        // Callback mode
        return executeDelete(callback);
      }

      // Promise mode
      return new Promise<void>((resolve, reject) => {
        executeDelete((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
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