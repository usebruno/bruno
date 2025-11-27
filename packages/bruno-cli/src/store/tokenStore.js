// In-memory credential store implementation for OAuth2 and OAuth1 credentials
const tokenStore = {
  credentials: {},
  oauth1Credentials: {},

  // OAuth2 methods
  // Save credentials
  async saveCredential({ url, credentialsId, credentials }) {
    if (!this.credentials[credentialsId]) {
      this.credentials[credentialsId] = {};
    }
    this.credentials[credentialsId][url] = credentials;
    return true;
  },

  // Get credentials
  async getCredential({ url, credentialsId }) {
    return this.credentials[credentialsId]?.[url];
  },

  // Delete credentials
  async deleteCredential({ url, credentialsId }) {
    if (this.credentials[credentialsId]?.[url]) {
      delete this.credentials[credentialsId][url];
      // Clean up empty credentialsId objects
      if (Object.keys(this.credentials[credentialsId]).length === 0) {
        delete this.credentials[credentialsId];
      }
      return true;
    }
    return false;
  },

  // Get all stored OAuth2 credentials
  getAllCredentials() {
    const result = [];
    for (const [credentialsId, urlMap] of Object.entries(this.credentials)) {
      for (const [url, credentials] of Object.entries(urlMap)) {
        if (credentials) {
          result.push({
            url,
            credentialsId,
            credentials
          });
        }
      }
    }
    return result;
  },

  // OAuth1 methods
  // Save OAuth1 credentials
  async saveOAuth1Credential({ credentialsId, credentials }) {
    this.oauth1Credentials[credentialsId] = credentials;
    return true;
  },

  // Get OAuth1 credentials
  async getOAuth1Credential({ credentialsId }) {
    return this.oauth1Credentials[credentialsId];
  },

  // Delete OAuth1 credentials
  async deleteOAuth1Credential({ credentialsId }) {
    if (this.oauth1Credentials[credentialsId]) {
      delete this.oauth1Credentials[credentialsId];
      return true;
    }
    return false;
  },

  // Get all stored OAuth1 credentials
  getAllOAuth1Credentials() {
    const result = [];
    for (const [credentialsId, credentials] of Object.entries(this.oauth1Credentials)) {
      if (credentials) {
        result.push({
          credentialsId,
          credentials
        });
      }
    }
    return result;
  }
};

module.exports = tokenStore;
