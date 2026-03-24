const PropertyList = require('./property-list');

/**
 * CookieList - A PropertyList subclass for cookie management.
 *
 * All read/iteration/search/transformation methods (get, one, all, idx, count,
 * indexOf, has, find, filter, each, map, reduce, toObject, toString, toJSON)
 * are inherited from ReadOnlyPropertyList in dynamic mode.
 *
 * Write methods (add, upsert, remove, clear, delete) override PropertyList's
 * sync mutations with async cookie jar delegation.
 *
 * jar() provides direct access to the underlying cookie jar with URL
 * interpolation applied to all URL arguments.
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

  add(cookieObj, callback) {
    return this.upsert(cookieObj, callback);
  }

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

  // Removing a non-existent or empty-named cookie is a no-op (like Map.delete),
  // unlike upsert() which rejects invalid input since it's a programming error.
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

  delete(name, callback) {
    return this.remove(name, callback);
  }

  // ── Cookie-specific method ────────────────────────────────────────────

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
