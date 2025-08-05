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


  getCookies() {
    return this.store.get('cookies', []);
  }


  setCookies(cookies) {
    return this.store.set('cookies', cookies);
  }

  // Initialize cookies from store into cookie jar
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

 
  // Load a single cookie into the cookie jar
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

  // Save current cookie jar state to store
  saveCookieJar() {
    try {
      const serialized = cookieJar.serializeSync();
      this.setCookies(serialized);
    } catch (err) {
      console.error('Failed to save cookie jar:', err);
    }
  }
}

// Create singleton instance
const cookiesStore = new CookiesStore();

module.exports = {
  cookiesStore,
  saveCookieJar: () => cookiesStore.saveCookieJar()
};
