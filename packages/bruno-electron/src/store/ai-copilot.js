const Store = require('electron-store');

class AiCopilotStore {
  constructor() {
    this.store = new Store({
      name: 'ai-copilot',
      clearInvalidConfig: true
    });
  }

  getSession() {
    const session = this.store.get('session');
    return session && typeof session === 'object' ? session : null;
  }

  setSession(session) {
    this.store.set('session', session);
  }

  clearSession() {
    this.store.delete('session');
  }

  getAuthSource() {
    return this.store.get('authSource') || null;
  }

  setAuthSource(source) {
    this.store.set('authSource', source);
  }

  clearAuthSource() {
    this.store.delete('authSource');
  }
}

const aiCopilotStore = new AiCopilotStore();

module.exports = { aiCopilotStore };
