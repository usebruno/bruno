// In-memory token store implementation for OAuth2 tokens
const tokenStore = {
  tokens: new Map(),

  // Save a token with optional expiry information
  async saveToken(serviceId, account, token) {
    this.tokens.set(`${serviceId}:${account}`, token);
    return true;
  },

  // Get a token
  async getToken(serviceId, account) {
    return this.tokens.get(`${serviceId}:${account}`);
  },

  // Delete a token
  async deleteToken(serviceId, account) {
    return this.tokens.delete(`${serviceId}:${account}`);
  }
};

module.exports = tokenStore; 