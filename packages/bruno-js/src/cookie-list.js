const ReadOnlyPropertyList = require('./readonly-property-list');

/*
 * CookieList — the `bru.cookies` API for reading and writing cookies in scripts.
 *
 * Extends ReadOnlyPropertyList in dynamic mode: the cookie list is freshly read from the
 * cookie jar on every access, and write operations delegate to the jar rather
 * than mutating an in-memory array.
 */

/**
 * A cookie in the cookie jar.
 * @typedef {object} Cookie
 * @property {string} key - The cookie's name.
 * @property {string} value - Its value.
 * @property {string} [domain] - The domain it is sent to.
 * @property {string} [path] - The path it is sent to.
 * @property {boolean} [secure] - Whether it is only sent over HTTPS.
 * @property {boolean} [httpOnly] - Whether it is hidden from browser scripts.
 * @property {Date | 'Infinity'} [expires] - When it expires; `'Infinity'` for a session cookie.
 */

/**
 * A cookie to write to the jar. `domain` defaults to the URL's host and `path` to `/`.
 * @typedef {object} CookieInput
 * @property {string} key - The cookie's name.
 * @property {string} value - Its value.
 * @property {string} [domain] - The domain to send it to.
 * @property {string} [path] - The path to send it to.
 * @property {boolean} [secure] - Only send it over HTTPS.
 * @property {boolean} [httpOnly] - Hide it from browser scripts.
 * @property {Date | string | number} [expires] - When it expires. Without it, it never does.
 * @property {number} [maxAge] - How many seconds it lives.
 * @property {'strict' | 'lax' | 'none'} [sameSite] - The SameSite policy.
 */

/**
 * Cookies of any URL. Every method takes the URL first, which may contain `{{variables}}`, and
 * returns a promise, or calls `callback` instead when one is passed.
 * @typedef {object} CookieJar
 * @property {((url: string, name: string) => Promise<Cookie | null>) & ((url: string, name: string, callback: (error: Error | null, cookie?: Cookie | null) => void) => void)} getCookie - Get the cookie with the given name that would be sent to the URL, or `null`.
 * @property {((url: string) => Promise<Cookie[]>) & ((url: string, callback: (error: Error | null, cookies?: Cookie[]) => void) => void)} getCookies - Get every cookie that would be sent to the URL.
 * @property {((url: string, cookie: CookieInput) => Promise<void>) & ((url: string, cookie: CookieInput, callback: (error?: Error) => void) => void) & ((url: string, name: string, value: string) => Promise<void>) & ((url: string, name: string, value: string, callback: (error?: Error) => void) => void)} setCookie - Set a cookie for the URL, from a cookie object or a name and value.
 * @property {((url: string, cookies: CookieInput[]) => Promise<void>) & ((url: string, cookies: CookieInput[], callback: (error?: Error) => void) => void)} setCookies - Set several cookies for the URL.
 * @property {((url: string, name: string) => Promise<boolean>) & ((url: string, name: string, callback: (error: Error | null, exists?: boolean) => void) => void)} hasCookie - Check whether a cookie with the given name would be sent to the URL.
 * @property {((url: string, name: string) => Promise<void>) & ((url: string, name: string, callback: (error?: Error) => void) => void)} deleteCookie - Delete the cookie with the given name for the URL.
 * @property {((url: string) => Promise<void>) & ((url: string, callback: (error?: Error) => void) => void)} deleteCookies - Delete every cookie that would be sent to the URL.
 * @property {(() => Promise<void>) & ((callback: (error?: Error) => void) => void)} clear - Delete every cookie in the jar, for every URL.
 */

/**
 * The cookies of the current request's URL, as a list of {@link Cookie} entries.
 *
 * Reads come straight from the app's cookie jar. Writes return a promise, or call the callback
 * when one is passed. `jar()` reaches the cookies of any URL.
 * @extends {ReadOnlyPropertyList<Cookie>}
 */
class CookieList extends ReadOnlyPropertyList {
  /**
   * @param {object} options
   * @param {Function} options.getUrl - Returns the interpolated request URL (or falsy if unavailable)
   * @param {Function} options.interpolate - Interpolates variables in a string
   * @param {Function} options.createCookieJar - Factory that returns a cookie jar instance
   * @param {Function} options.getCookiesForUrl - Returns cookies array for a given URL
   */
  constructor({ getUrl, interpolate, createCookieJar, getCookiesForUrl }) {
    super({
      keyProperty: 'key',
      dataSource: () => {
        const url = getUrl();
        if (!url) return [];
        // Normalize tough-cookie Cookie instances to plain objects to avoid
        // circular references and exposing internal library structures.
        return getCookiesForUrl(url).map(({ key, value, domain, path, secure, httpOnly, expires }) =>
          ({ key, value, domain, path, secure, httpOnly, expires })
        );
      }
    });
    /** @protected */
    this._getUrl = getUrl;
    /** @protected */
    this._interpolateFn = interpolate;
    // Factory function — returns a wrapper around the module-level cookie jar singleton
    /** @protected */
    this._createCookieJar = createCookieJar;
  }

  // ── Write methods (cookie jar delegation) ─────────────────────────────

  /**
   * Set a cookie for the current request's URL. The same as `upsert()`.
   *
   * @param {CookieInput} cookieObj - The cookie, with at least `key` and `value`.
   * @param {(error?: Error) => void} [callback] - Called once the cookie is set. Without it, a promise is returned.
   * @returns {Promise<void> | void} A promise when no callback is given.
   * @category Write
   * @example
   * // Promise usage
   * await bru.cookies.add({ key: 'lang', value: 'en' });
   *
   * // Callback usage
   * bru.cookies.add({ key: 'lang', value: 'en' }, (err) => { if (err) throw err; });
   */
  add(cookieObj, callback) {
    return this.upsert(cookieObj, callback);
  }

  /**
   * Set a cookie for the current request's URL, replacing a cookie of the same name.
   *
   * Rejects when `cookieObj` is not an object.
   * @param {CookieInput} cookieObj - The cookie, with at least `key` and `value`.
   * @param {(error?: Error) => void} [callback] - Called once the cookie is set. Without it, a promise is returned.
   * @returns {Promise<void> | void} A promise when no callback is given.
   * @category Write
   * @example
   * await bru.cookies.upsert({ key: 'sid', value: 'abc123', secure: true });
   */
  upsert(cookieObj, callback) {
    if (!cookieObj || typeof cookieObj !== 'object') {
      const error = new Error('cookieObj must be a non-null object');
      if (callback) return callback(error);
      return Promise.reject(error);
    }
    const url = this._getUrl();
    if (!url) {
      if (callback) return callback(undefined);
      return Promise.resolve();
    }
    const jar = this._createCookieJar();
    return jar.setCookie(url, cookieObj, callback);
  }

  /**
   * Delete a cookie of the current request's URL by name. Nothing happens when there is none.
   *
   * @param {string} name - The cookie's name.
   * @param {(error?: Error) => void} [callback] - Called once the cookie is deleted. Without it, a promise is returned.
   * @returns {Promise<void> | void} A promise when no callback is given.
   * @category Write
   * @example
   * await bru.cookies.remove('sid');
   */
  remove(name, callback) {
    const url = this._getUrl();
    if (!url || !name) {
      if (callback) return callback(undefined);
      return Promise.resolve();
    }
    const jar = this._createCookieJar();
    return jar.deleteCookie(url, name, callback);
  }

  /**
   * Delete every cookie of the current request's URL.
   *
   * Cookies of other domains and paths are kept; `jar().clear()` deletes those too.
   * @param {(error?: Error) => void} [callback] - Called once the cookies are deleted. Without it, a promise is returned.
   * @returns {Promise<void> | void} A promise when no callback is given.
   * @category Write
   */
  clear(callback) {
    const url = this._getUrl();
    if (!url) {
      if (callback) return callback(undefined);
      return Promise.resolve();
    }
    const jar = this._createCookieJar();
    return jar.deleteCookies(url, callback);
  }

  /**
   * Delete a cookie of the current request's URL by name. The same as `remove()`.
   *
   * @param {string} name - The cookie's name.
   * @param {(error?: Error) => void} [callback] - Called once the cookie is deleted. Without it, a promise is returned.
   * @returns {Promise<void> | void} A promise when no callback is given.
   * @category Write
   * @example
   * await bru.cookies.delete('sid');
   */
  delete(name, callback) {
    return this.remove(name, callback);
  }

  // ── Cookie-specific method ────────────────────────────────────────────

  /**
   * Get the cookie jar, to read and write the cookies of any URL.
   *
   * Every URL argument may contain `{{variables}}`.
   * @returns {CookieJar} The jar.
   * @category Jar
   * @example
   * const jar = bru.cookies.jar();
   *
   * // Read a cookie from a different URL
   * const token = await jar.getCookie('{{authBaseUrl}}/login', 'access_token');
   *
   * // Set a cookie on a specific URL
   * await jar.setCookie('{{apiBaseUrl}}', { key: 'sid', value: 'abc' });
   * await jar.setCookie('{{apiBaseUrl}}', 'theme', 'dark');
   *
   * // Check if a cookie exists
   * const exists = await jar.hasCookie('{{apiBaseUrl}}', 'sid');
   *
   * // Clear ALL cookies globally
   * await jar.clear();
   */
  jar() {
    const cookieJar = this._createCookieJar();

    return {
      getCookie: (url, cookieName, callback) => {
        const interpolatedUrl = this._interpolateFn(url);
        return cookieJar.getCookie(interpolatedUrl, cookieName, callback);
      },

      getCookies: (url, callback) => {
        const interpolatedUrl = this._interpolateFn(url);
        return cookieJar.getCookies(interpolatedUrl, callback);
      },

      setCookie: (url, nameOrCookieObj, valueOrCallback, maybeCallback) => {
        const interpolatedUrl = this._interpolateFn(url);
        return cookieJar.setCookie(interpolatedUrl, nameOrCookieObj, valueOrCallback, maybeCallback);
      },

      setCookies: (url, cookiesArray, callback) => {
        const interpolatedUrl = this._interpolateFn(url);
        return cookieJar.setCookies(interpolatedUrl, cookiesArray, callback);
      },

      clear: (callback) => {
        return cookieJar.clear(callback);
      },

      deleteCookies: (url, callback) => {
        const interpolatedUrl = this._interpolateFn(url);
        return cookieJar.deleteCookies(interpolatedUrl, callback);
      },

      deleteCookie: (url, cookieName, callback) => {
        const interpolatedUrl = this._interpolateFn(url);
        return cookieJar.deleteCookie(interpolatedUrl, cookieName, callback);
      },

      hasCookie: (url, cookieName, callback) => {
        const interpolatedUrl = this._interpolateFn(url);
        return cookieJar.hasCookie(interpolatedUrl, cookieName, callback);
      }
    };
  }
}

module.exports = CookieList;
