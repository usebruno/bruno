const _ = require('lodash');
const Store = require('electron-store');
// const { encryptString, decryptString } = require('../utils/encryption');

const defaultCookies = {
  cookies: [],
  version: 'tough-cookie@4.0.0',
  storeType: 'MemoryCookieStore'
};

class CookiesStore {
  constructor() {
    try {
      this.store = new Store({
        name: 'cookies',
        clearInvalidConfig: true,
        defaults: {
          cookies: defaultCookies
        }
      });
    } catch (err) {
      // If store creation fails due to corrupt file, create a new store with defaults
      console.error('Error creating cookie store:', err);
      // Delete the corrupted file
      Store.clear({
        name: 'cookies'
      });
      // Recreate store with defaults
      this.store = new Store({
        name: 'cookies',
        defaults: {
          cookies: defaultCookies
        }
      });
    }
  }

  /*
  * Cookies are global to the app, so we don't need to pass in a collection pathname
  * We might want to store cookies for a specific environment in the future
  */
  setCookies(cookies) {
    this.store.set('cookies', cookies);
  }

  getCookies() {
    try {
      return this.store.get('cookies') || defaultCookies;
    } catch (err) {
      console.error('Error reading cookies:', err);
      return defaultCookies;
    }
  }
}

module.exports = CookiesStore;