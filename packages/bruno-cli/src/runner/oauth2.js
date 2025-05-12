const { getOAuth2Token } = require('@usebruno/requests');
const tokenStore = require('./tokenStore');

module.exports = {
  getOAuth2Token: (oauth2Config) => getOAuth2Token(oauth2Config, tokenStore)
}; 