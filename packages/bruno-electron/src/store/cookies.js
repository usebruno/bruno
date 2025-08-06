const Store = require('electron-store');
const { cookies: cookiesModule } = require('@usebruno/common');
const { cookieJar } = cookiesModule;
const { Cookie } = require('tough-cookie');
const { createCookieString } = cookiesModule;
const crypto = require('crypto');
const { encryptString, decryptString } = require('../utils/encryption');


class CookiesStore {
  constructor() {
    this.store = new Store({
      name: 'cookies',
      clearInvalidConfig: true,
      defaults: {
        encryptedPasskey: null,
        cookies: {}
      }
    });

    this.initializeEncryption();

  }

  generatePasskey() {
    // Generate 32 bytes (256 bits) of random data and convert to hex
    return crypto.randomBytes(32).toString('hex');
  }

  initializeEncryption() {
    try {
      let encryptedPasskey = this.store.get('encryptedPasskey');
      if (!encryptedPasskey) {
        // Generate cryptographically secure random passkey
        const passkey = this.generatePasskey();
        encryptedPasskey = encryptString(passkey);
        if (!encryptedPasskey) {
          console.warn('Failed to encrypt new passkey, falling back to unencrypted cookies');
          this.passkey = null;
          return;
        }
        this.store.set('encryptedPasskey', encryptedPasskey);
      }
      this.passkey = decryptString(encryptedPasskey);
      if (!this.passkey) {
        console.warn('Failed to decrypt passkey, falling back to unencrypted cookies');
      }
    } catch (err) {
      console.warn('Failed to initialize encryption, falling back to unencrypted cookies:', err);
      this.passkey = null;
    }
  }

  encryptCookieValue(value) {
    if (!value || !this.passkey) return value;
    const encrypted = encryptString(value, this.passkey);
    return encrypted || value; // Return original value if encryption fails
  }

  decryptCookieValue(value) {
    if (!value) return value;
    // Check if the value is encrypted (starts with $)
    if (!value.startsWith('$')) return value;
    
    // If we don't have a passkey or decryption fails, return empty string for encrypted values
    if (!this.passkey) return '';
    
    const decrypted = decryptString(value, this.passkey);
    return decrypted || ''; // Return empty string if decryption fails
  }

  getCookies() {
    const cookieStore = this.store.get('cookies', {});
    const decryptedCookies = [];

    // Filter and decrypt cookies
    Object.values(cookieStore).forEach(domainCookies => {
      if (!Array.isArray(domainCookies)) return;

      domainCookies.forEach(cookie => {
        try {

          // Create cookie with decrypted value
          const decryptedCookie = {
            ...cookie,
            value: this.decryptCookieValue(cookie.value)
          };
          decryptedCookies.push(decryptedCookie);
        } catch (err) {
          console.warn('Failed to process cookie:', cookie?.key, err);
          // Still add the cookie but with empty value if processing fails
          decryptedCookies.push({
            ...cookie,
            value: ''
          });
        }
      });
    });

    return decryptedCookies;
  }

  setCookies(cookies) {
    try {
      // Organize cookies by domain
      const cookiesByDomain = {};
      cookies.cookies.forEach(cookie => {
        try {
          if (!cookiesByDomain[cookie.domain]) {
            cookiesByDomain[cookie.domain] = [];
          }

          cookiesByDomain[cookie.domain].push({
            ...cookie,
            value: this.encryptCookieValue(cookie.value)
          });
        } catch (err) {
          console.warn('Failed to process cookie for storage:', cookie?.key, err);
          // Still store the cookie but with original value if encryption fails
          if (!cookiesByDomain[cookie.domain]) {
            cookiesByDomain[cookie.domain] = [];
          }
          cookiesByDomain[cookie.domain].push(cookie);
        }
      });

      return this.store.set('cookies', cookiesByDomain);
    } catch (err) {
      console.warn('Failed to set cookies:', err);
    }
  }

  // Initialize cookies from store into cookie jar
  initializeCookies() {
    try {
      const storedCookies = this.getCookies();

      if (Array.isArray(storedCookies) && storedCookies.length) {
        storedCookies.forEach((cookie) => this.loadCookieIntoJar(cookie));
      }
    } catch (err) {
      console.warn('Failed to initialize cookies:', err);
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

  // Save current cookie jar state to store with debouncing
  saveCookieJar() {
    try {
      const serialized = cookieJar.serializeSync();
      
      this.setCookies(serialized);
    } catch (err) {
      console.warn('Failed to save cookie jar:', err);
    }
  }

}

// Create singleton instance
const cookiesStore = new CookiesStore();

module.exports = {
  cookiesStore,
  saveCookieJar: () => cookiesStore.saveCookieJar(),
  CookiesStore
};