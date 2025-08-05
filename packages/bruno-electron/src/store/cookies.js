const Store = require('electron-store');
const { cookies: cookiesModule } = require('@usebruno/common');
const { cookieJar } = cookiesModule;
const { Cookie } = require('tough-cookie');
const { createCookieString } = cookiesModule;
const { app } = require('electron');

class CookiesStore {
  constructor() {
    this.store = new Store({
      name: 'cookies',
      clearInvalidConfig: true,
      defaults: {
        cookies: []
      }
    });

    // Initialize cookies when app is ready
    if (app.isReady()) {
      this.initializeCookies();
    } else {
      app.once('ready', () => this.initializeCookies());
    }
  }

  /**
   * Get all stored cookies
   * @returns {Array} Array of cookie objects
   */
  getCookies() {
    return this.store.get('cookies', []);
  }

  /**
   * Save cookies to store
   * @param {Array} cookies Array of cookie objects to save
   */
  setCookies(cookies) {
    return this.store.set('cookies', cookies);
  }

  /**
   * Initialize cookies from store into cookie jar
   */
  initializeCookies() {
    try {
      const storedCookies = this.getCookies();

      if (Array.isArray(storedCookies) && storedCookies.length) {
        storedCookies.forEach(this.loadCookieIntoJar);
      }
    } catch (err) {
      console.error('Failed to initialize cookies:', err);
    }
  }

  /**
   * Load a single cookie into the cookie jar
   * @param {Object} rawCookie Raw cookie object from store
   */
  loadCookieIntoJar(rawCookie) {
    try {
      const cookie = Cookie.fromJSON(rawCookie);
      if (!cookie) return;

      // Re-assemble request URL for tough-cookie
      const protocol = cookie.secure ? 'https' : 'http';
      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
      const url = `${protocol}://${domain}${cookie.path || '/'}`;
      const setCookieHeader = createCookieString(cookie);

      cookieJar.setCookieSync(setCookieHeader, url, { ignoreError: true });
    } catch (err) {
      console.warn('Failed to load cookie:', rawCookie?.key, err?.message);
    }
  }

  /**
   * Save current cookie jar state to store
   */
  saveCookieJar() {
    try {
      const serialized = cookieJar.serializeSync();
      const now = Date.now();

      // Filter out expired cookies
      const validCookies = (serialized.cookies || []).filter(cookie => 
        !cookie.expires || 
        cookie.expires === 'Infinity' || 
        cookie.expires === Infinity || 
        new Date(cookie.expires).getTime() > now
      );

      this.setCookies(validCookies);
    } catch (err) {
      console.error('Failed to save cookie jar:', err);
    }
  }

  /**
   * Clear all cookies from store and jar
   */
  clearAllCookies() {
    try {
      cookieJar.removeAllCookiesSync();
      this.setCookies([]);
    } catch (err) {
      console.error('Failed to clear cookies:', err);
    }
  }
}

// Create singleton instance
const cookiesStore = new CookiesStore();

module.exports = {
  cookiesStore,
  saveCookieJar: () => cookiesStore.saveCookieJar()
};
