const Store = require('electron-store');
const { encryptString, decryptString } = require('../utils/encryption');

class OAuthCredentialsStore {
  constructor() {
    this.store = new Store({
      name: 'oauth-credentials',
      clearInvalidConfig: true
    });
  }

  setCredential(key, { token, method }) {
    this.store.set(`credentials.${key}`, { token: encryptString(token), method });
  }

  getCredential(key) {
    const entry = this.store.get(`credentials.${key}`);
    if (!entry?.token) return null;
    try {
      return { token: decryptString(entry.token), method: entry.method || null };
    } catch (err) {
      console.error(`Failed to decrypt OAuth credential for ${key}:`, err.message);
      return null;
    }
  }

  clearCredential(key) {
    this.store.delete(`credentials.${key}`);
  }
}

const oauthCredentialsStore = new OAuthCredentialsStore();

module.exports = { oauthCredentialsStore };
