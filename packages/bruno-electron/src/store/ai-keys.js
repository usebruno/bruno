const Store = require('electron-store');
const { encryptString, decryptString } = require('../utils/encryption');

class AiKeyStore {
  constructor() {
    this.store = new Store({
      name: 'ai-keys',
      clearInvalidConfig: true
    });
  }

  setKey(providerId, apiKey) {
    if (!apiKey) {
      this.clearKey(providerId);
      return;
    }
    const encrypted = encryptString(apiKey);
    this.store.set(`keys.${providerId}`, encrypted);
  }

  getKey(providerId) {
    const encrypted = this.store.get(`keys.${providerId}`);
    if (!encrypted) return null;
    try {
      return decryptString(encrypted);
    } catch (err) {
      console.error(`Failed to decrypt AI key for ${providerId}:`, err.message);
      return null;
    }
  }

  hasKey(providerId) {
    return Boolean(this.getKey(providerId));
  }

  clearKey(providerId) {
    this.store.delete(`keys.${providerId}`);
  }

  getKeyStatus() {
    const stored = this.store.get('keys', {}) || {};
    const status = {};
    for (const providerId of Object.keys(stored)) {
      status[providerId] = { configured: Boolean(this.getKey(providerId)) };
    }
    return status;
  }
}

const aiKeyStore = new AiKeyStore();

module.exports = { aiKeyStore };
