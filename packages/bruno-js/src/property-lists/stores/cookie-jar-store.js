/**
 * CookieJarStore — StoreAdapter over the shared cookie jar, scoped to the current
 * request URL. Reads snapshot the jar on every call; writes delegate to the jar
 * using its callback-or-promise convention (a Promise is returned when no callback
 * is given).
 */
class CookieJarStore {
  #getUrl;
  #interpolate;
  #createCookieJar;
  #getCookiesForUrl;

  /**
   * @param {object} options
   * @param {Function} options.getUrl - Returns the interpolated request URL (or falsy if unavailable)
   * @param {Function} options.interpolate - Interpolates variables in a string
   * @param {Function} options.createCookieJar - Factory that returns a cookie jar instance
   * @param {Function} options.getCookiesForUrl - Returns cookies array for a given URL
   */
  constructor({ getUrl, interpolate, createCookieJar, getCookiesForUrl }) {
    this.#getUrl = getUrl;
    this.#interpolate = interpolate;
    this.#createCookieJar = createCookieJar;
    this.#getCookiesForUrl = getCookiesForUrl;
  }

  read() {
    const url = this.#getUrl();
    if (!url) return [];
    // Normalize tough-cookie Cookie instances to plain objects to avoid
    // circular references and exposing internal library structures.
    return this.#getCookiesForUrl(url).map(({ key, value, domain, path, secure, httpOnly, expires }) =>
      ({ key, value, domain, path, secure, httpOnly, expires })
    );
  }

  // ── Write methods (cookie jar delegation) ─────────────────────────────

  /**
   * Add a cookie to the jar (alias for upsert).
   * @param {object} cookieObj - Cookie object with at least `key` and `value`
   * @param {Function} [callback] - Optional `(error) => void` callback. If omitted, returns a Promise.
   * @returns {Promise<void>|void}
   */
  add(cookieObj, callback) {
    return this.upsert(cookieObj, callback);
  }

  /**
   * Set (or replace) a cookie in the jar for the current request URL.
   * Rejects with an error if `cookieObj` is not a non-null object.
   * @param {object} cookieObj
   * @param {Function} [callback]
   * @returns {Promise<void>|void}
   */
  upsert(cookieObj, callback) {
    if (!cookieObj || typeof cookieObj !== 'object') {
      const error = new Error('cookieObj must be a non-null object');
      if (callback) return callback(error);
      return Promise.reject(error);
    }
    const url = this.#getUrl();
    if (!url) {
      if (callback) return callback(undefined);
      return Promise.resolve();
    }
    const jar = this.#createCookieJar();
    return jar.setCookie(url, cookieObj, callback);
  }

  /**
   * Remove a single cookie by name from the current request URL.
   * A no-op if `name` is falsy or no such cookie exists.
   * @param {string} name
   * @param {Function} [callback]
   * @returns {Promise<void>|void}
   */
  remove(name, callback) {
    const url = this.#getUrl();
    if (!url || !name) {
      if (callback) return callback(undefined);
      return Promise.resolve();
    }
    const jar = this.#createCookieJar();
    return jar.deleteCookie(url, name, callback);
  }

  /**
   * Remove cookies scoped to the current request URL only.
   * Unlike jar().clear() which removes ALL cookies globally, this only
   * removes cookies matching the current request's domain and path.
   * @param {Function} [callback]
   * @returns {Promise<void>|void}
   */
  clear(callback) {
    const url = this.#getUrl();
    if (!url) {
      if (callback) return callback(undefined);
      return Promise.resolve();
    }
    const jar = this.#createCookieJar();
    return jar.deleteCookies(url, callback);
  }

  /**
   * Delete a cookie by name (alias for remove).
   * @param {string} name
   * @param {Function} [callback]
   * @returns {Promise<void>|void}
   */
  delete(name, callback) {
    return this.remove(name, callback);
  }

  // ── Cookie-specific extra ─────────────────────────────────────────────

  /**
   * Returns a jar handle for cross-URL cookie operations. Unlike the list methods
   * (scoped to the current request URL), the jar handle reads/writes cookies for
   * any URL; URL arguments are interpolated with environment/collection variables.
   *
   * @returns {{ getCookie, getCookies, setCookie, setCookies, deleteCookie, deleteCookies, hasCookie, clear }}
   */
  jar() {
    const cookieJar = this.#createCookieJar();

    return {
      getCookie: (url, cookieName, callback) => {
        return cookieJar.getCookie(this.#interpolate(url), cookieName, callback);
      },

      getCookies: (url, callback) => {
        return cookieJar.getCookies(this.#interpolate(url), callback);
      },

      setCookie: (url, nameOrCookieObj, valueOrCallback, maybeCallback) => {
        return cookieJar.setCookie(this.#interpolate(url), nameOrCookieObj, valueOrCallback, maybeCallback);
      },

      setCookies: (url, cookiesArray, callback) => {
        return cookieJar.setCookies(this.#interpolate(url), cookiesArray, callback);
      },

      clear: (callback) => {
        return cookieJar.clear(callback);
      },

      deleteCookies: (url, callback) => {
        return cookieJar.deleteCookies(this.#interpolate(url), callback);
      },

      deleteCookie: (url, cookieName, callback) => {
        return cookieJar.deleteCookie(this.#interpolate(url), cookieName, callback);
      },

      hasCookie: (url, cookieName, callback) => {
        return cookieJar.hasCookie(this.#interpolate(url), cookieName, callback);
      }
    };
  }
}

module.exports = CookieJarStore;
