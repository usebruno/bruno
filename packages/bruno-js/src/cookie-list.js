const PropertyList = require('./property-list');

/*
 * CookieList — the `bru.cookies` API for reading and writing cookies in scripts.
 *
 * Extends PropertyList in dynamic mode: the cookie list is freshly read from the
 * cookie jar on every access, and write operations delegate to the jar rather
 * than mutating an in-memory array.
 *
 * ---
 *
 * ## Cookie object shape
 *
 * Every cookie surfaced by this list is a plain object:
 *
 * ```js
 * { key, value, domain, path, secure, httpOnly, expires }
 * ```
 *
 * ---
 *
 * ## Read methods (inherited from ReadOnlyPropertyList)
 *
 * | Method             | Description                                      | Example return value                  |
 * |--------------------|--------------------------------------------------|---------------------------------------|
 * | `get(name)`        | Value of the first cookie with `key === name`    | `'abc123'`                            |
 * | `one(name)`        | Full cookie object for `key === name`            | `{ key: 'sid', value: 'abc123', … }`  |
 * | `all()`            | Cloned array of all cookie objects               | `[{ key: 'sid', … }, …]`             |
 * | `idx(index)`       | Cookie at positional index                       | `{ key: 'sid', … }`                   |
 * | `count()`          | Number of cookies for the current request URL    | `3`                                   |
 *
 * ## Search methods (inherited)
 *
 * | Method             | Description                                      | Example return value |
 * |--------------------|--------------------------------------------------|----------------------|
 * | `has(name)`        | `true` if a cookie with that key exists          | `true`               |
 * | `has(name, value)` | `true` if key exists **and** value matches        | `false`              |
 * | `find(predicate)`  | First cookie matching the predicate function     | `{ key: 'sid', … }` |
 * | `filter(predicate)`| Array of cookies matching the predicate          | `[{ key: … }, …]`   |
 * | `indexOf(item)`    | Index of a structurally-equal cookie, or `-1`    | `0`                  |
 *
 * ## Iteration methods (inherited)
 *
 * | Method                  | Description                                  |
 * |-------------------------|----------------------------------------------|
 * | `each(fn)`              | Calls `fn(cookie, index)` for every cookie   |
 * | `map(fn)`               | Returns a new array of mapped values         |
 * | `reduce(fn, initial?)`  | Reduces cookies to a single value            |
 *
 * ## Transform methods (inherited)
 *
 * | Method        | Description                                         | Example return value               |
 * |---------------|-----------------------------------------------------|-------------------------------------|
 * | `toObject()`  | `{ key: value }` map of all cookies                 | `{ sid: 'abc123', lang: 'en' }`     |
 * | `toString()`  | Semicolon-separated `key=value` string               | `'sid=abc123; lang=en'`             |
 * | `toJSON()`    | Same as `all()` — suitable for `JSON.stringify()`    | `[{ key: 'sid', … }]`              |
 *
 * ## Write methods (CookieList overrides)
 *
 * | Method                   | Description                                          |
 * |--------------------------|------------------------------------------------------|
 * | `add(cookieObj, cb?)`    | Alias for `upsert()` — sets a cookie in the jar      |
 * | `upsert(cookieObj, cb?)` | Sets (or replaces) a cookie in the jar                |
 * | `remove(name, cb?)`      | Deletes a single cookie by name (no-op if missing)    |
 * | `delete(name, cb?)`      | Alias for `remove()`                                  |
 * | `clear(cb?)`             | Removes **all** cookies for the current request URL   |
 *
 * ## Jar access
 *
 * | Method  | Description                                                              |
 * |---------|--------------------------------------------------------------------------|
 * | `jar()` | Returns a jar handle with URL interpolation for cross-URL cookie access  |
 *
 * The jar handle exposes: `getCookie`, `getCookies`, `setCookie`, `setCookies`,
 * `deleteCookie`, `deleteCookies`, `hasCookie`, and `clear`.
 */

/**
 * A cookie from the cookie jar.
 * @typedef {object} Cookie
 * @property {string} key - The cookie's name.
 * @property {string} value - The cookie's value.
 * @property {string | null} [domain] - The domain the cookie is sent to.
 * @property {string | null} [path] - The path the cookie is sent under.
 * @property {boolean} [secure] - Whether the cookie is only sent over HTTPS.
 * @property {boolean} [httpOnly] - Whether the cookie is marked `HttpOnly`.
 * @property {Date | string} [expires] - When the cookie expires, or `'Infinity'` for a session
 *   cookie. In Safe Mode a date arrives as an ISO string.
 */

/**
 * A cookie to store.
 * @typedef {object} CookieInput
 * @property {string} key - The cookie's name.
 * @property {string} value - The cookie's value.
 * @property {string} [domain] - The domain to send it to. Defaults to the URL's host; a
 *   `__Host-` cookie is always host-only.
 * @property {string} [path] - The path to send it under.
 * @property {Date | string | number} [expires] - When it expires. Without a valid date it is a
 *   session cookie.
 * @property {boolean} [secure] - Only send it over HTTPS.
 * @property {boolean} [httpOnly] - Mark it `HttpOnly`.
 * @property {number} [maxAge] - How many seconds it lives.
 * @property {'strict' | 'lax' | 'none'} [sameSite] - The SameSite policy.
 */

/**
 * The cookie jar, for cookies of any URL. URL arguments may contain `{{variables}}`.
 *
 * Every function returns a promise, unless you pass a callback: then it returns nothing and calls
 * the callback with an error, or on success with no error and the result.
 * @typedef {object} CookieJar
 * @property {(url: string, name: string, callback?: (error: Error | null | undefined, cookie?: Cookie | null) => void) => Promise<Cookie | null> | void} getCookie
 *   Get the cookie with this name that the jar would send to `url`, or `null` when there is none.
 * @property {(url: string, callback?: (error: Error | null | undefined, cookies?: Cookie[]) => void) => Promise<Cookie[]> | void} getCookies
 *   Get every cookie the jar would send to `url`.
 * @property {((url: string, name: string, value: string, callback?: (error?: Error | null) => void) => Promise<void> | void) & ((url: string, cookie: CookieInput, callback?: (error?: Error | null) => void) => Promise<void> | void)} setCookie
 *   Store a cookie for `url`, from a name and value or from a cookie object. It replaces a cookie
 *   with the same name, domain and path.
 * @property {(url: string, cookies: CookieInput[], callback?: (error?: Error | null) => void) => Promise<void> | void} setCookies
 *   Store several cookies for `url`.
 * @property {(url: string, name: string, callback?: (error: Error | null | undefined, exists?: boolean) => void) => Promise<boolean> | void} hasCookie
 *   Check whether the jar would send a cookie with this name to `url`.
 * @property {(url: string, name: string, callback?: (error?: Error | null) => void) => Promise<void> | void} deleteCookie
 *   Delete one cookie with this name that the jar would send to `url`: the one whose path is the
 *   URL's path, or else the one with the most specific path.
 * @property {(url: string, callback?: (error?: Error | null) => void) => Promise<void> | void} deleteCookies
 *   Delete every cookie the jar would send to `url`.
 * @property {(callback?: (error?: Error | null) => void) => Promise<void> | void} clear
 *   Delete every cookie in the jar, for every domain.
 */

/**
 * The cookies the current request sends, with methods to change them and `jar()` for other URLs.
 *
 * The list is read from the cookie jar each time, so it reflects every change at once.
 * @extends {PropertyList<Cookie>}
 */
class CookieList extends PropertyList {
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
   * Store a cookie for the request's URL, the same as `upsert`.
   * @param {CookieInput} cookieObj - The cookie.
   * @param {(error?: Error | null) => void} [callback] - Called with an error, or with none on success.
   *   Without it, the method returns a promise.
   * @returns {Promise<void> | void} A promise, unless `callback` is given.
   * @example
   * await bru.cookies.add({ key: 'lang', value: 'en' });
   * @category Write
   */
  add(cookieObj, callback) {
    return this.upsert(cookieObj, callback);
  }

  /**
   * Store a cookie for the request's URL.
   *
   * It replaces a cookie with the same name, domain and path. Fails when `cookieObj` is not an
   * object or has no `key`.
   * @param {CookieInput} cookieObj - The cookie.
   * @param {(error?: Error | null) => void} [callback] - Called with an error, or with none on success.
   *   Without it, the method returns a promise.
   * @returns {Promise<void> | void} A promise, unless `callback` is given.
   * @example
   * await bru.cookies.upsert({ key: 'sid', value: 'abc123', secure: true });
   * @category Write
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
   * Delete a cookie the request sends, by name.
   *
   * Of several cookies with that name, it deletes the one whose path is the request's path, or
   * else the one with the most specific path. Nothing happens when there is no such cookie.
   * @param {string} name - The cookie's name.
   * @param {(error?: Error | null) => void} [callback] - Called with an error, or with none on success.
   *   Without it, the method returns a promise.
   * @returns {Promise<void> | void} A promise, unless `callback` is given.
   * @example
   * await bru.cookies.remove('sid');
   * @category Write
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
   * Delete every cookie the request sends.
   *
   * Cookies for other URLs stay; `jar().clear()` deletes those too.
   * @param {(error?: Error | null) => void} [callback] - Called with an error, or with none on success.
   *   Without it, the method returns a promise.
   * @returns {Promise<void> | void} A promise, unless `callback` is given.
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
   * Delete a cookie the request sends, by name, the same as `remove`.
   * @param {string} name - The cookie's name.
   * @param {(error?: Error | null) => void} [callback] - Called with an error, or with none on success.
   *   Without it, the method returns a promise.
   * @returns {Promise<void> | void} A promise, unless `callback` is given.
   * @example
   * await bru.cookies.delete('sid');
   * @category Write
   */
  delete(name, callback) {
    return this.remove(name, callback);
  }

  // ── Cookie-specific method ────────────────────────────────────────────

  /**
   * Get the cookie jar, to read and write the cookies of any URL.
   *
   * URL arguments may contain `{{variables}}`.
   * @returns {CookieJar} The jar.
   * @category Cookie jar
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
