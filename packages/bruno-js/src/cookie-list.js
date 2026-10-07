const PropertyList = require('./property-list');

/**
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
    this._getUrl = getUrl;
    this._interpolateFn = interpolate;
    // Factory function — returns a wrapper around the module-level cookie jar singleton
    this._createCookieJar = createCookieJar;
  }

  // ── Write methods (cookie jar delegation) ─────────────────────────────

  /**
   * Add a cookie to the jar (alias for {@link CookieList#upsert}).
   *
   * @param {object} cookieObj - Cookie object with at least `key` and `value`.
   * @param {Function} [callback] - Optional `(error) => void` callback. If omitted, returns a Promise.
   * @returns {Promise<void>|void} A Promise when no callback is given.
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
   * Set (or replace) a cookie in the jar for the current request URL.
   *
   * If a cookie with the same key already exists for this URL, it is overwritten.
   * Rejects with an error if `cookieObj` is not a non-null object.
   *
   * @param {object} cookieObj - Cookie object with at least `key` and `value`.
   * @param {Function} [callback] - Optional `(error) => void` callback. If omitted, returns a Promise.
   * @returns {Promise<void>|void} A Promise when no callback is given.
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
   * Remove a single cookie by name from the current request URL.
   *
   * A no-op if `name` is falsy or if no cookie with that name exists
   * (analogous to `Map.prototype.delete`).
   *
   * @param {string} name - The cookie key to remove.
   * @param {Function} [callback] - Optional `(error) => void` callback. If omitted, returns a Promise.
   * @returns {Promise<void>|void} A Promise when no callback is given.
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
   * Remove cookies scoped to the current request URL only.
   * Unlike jar().clear() which removes ALL cookies globally, this only
   * removes cookies matching the current request's domain and path.
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
   * Delete a cookie by name (alias for {@link CookieList#remove}).
   *
   * @param {string} name - The cookie key to delete.
   * @param {Function} [callback] - Optional `(error) => void` callback. If omitted, returns a Promise.
   * @returns {Promise<void>|void} A Promise when no callback is given.
   * @example
   * await bru.cookies.delete('sid');
   */
  delete(name, callback) {
    return this.remove(name, callback);
  }

  // ── Cookie-specific method ────────────────────────────────────────────

  /**
   * Returns a jar handle for cross-URL cookie operations.
   *
   * Unlike the CookieList methods (which are scoped to the current request URL),
   * the jar handle lets you read/write cookies for **any** URL. All URL arguments
   * are automatically interpolated with environment/collection variables.
   *
   * @returns {{ getCookie, getCookies, setCookie, setCookies, deleteCookie, deleteCookies, hasCookie, clear }}
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
