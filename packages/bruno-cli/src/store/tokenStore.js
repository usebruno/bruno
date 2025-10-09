// In-memory credential store implementation for OAuth2 credentials
const tokenStore = {
  credentials: {},

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
  }
};

module.exports = tokenStore;
