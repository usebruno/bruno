const keytar = require('keytar');

class TokenStore {
  constructor() {
    this.SERVICE_NAME = 'bruno-cli';
    this.ACCOUNT_NAME = 'oauth-tokens';
  }

  async saveTokens(tokens) {
    await keytar.setPassword(this.SERVICE_NAME, this.ACCOUNT_NAME, JSON.stringify(tokens));
  }

  async getTokens() {
    const tokensStr = await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
    return tokensStr ? JSON.parse(tokensStr) : null;
  }

  async clearTokens() {
    await keytar.deletePassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
  }
}

module.exports = TokenStore;