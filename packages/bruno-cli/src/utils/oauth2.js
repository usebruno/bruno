const { getOAuth2Token: _getOAuth2Token } = require('@usebruno/requests');
const tokenStore = require('../store/tokenStore');
const { getOptions } = require('./bru');

/**
 * Formats OAuth2 credentials into variables that can be accessed via bru.getOauth2CredentialVar()
 * @returns {Object} Formatted OAuth2 credential variables
 */
const getFormattedOauth2Credentials = () => {
  const oauth2Credentials = tokenStore.getAllCredentials();
  let credentialsVariables = {};

  oauth2Credentials.forEach(({ credentialsId, credentials }) => {
    if (credentials) {
      Object.entries(credentials).forEach(([key, value]) => {
        credentialsVariables[`$oauth2.${credentialsId}.${key}`] = value;
      });
    }
  });

  return credentialsVariables;
};

const getOAuth2Token = (oauth2Config, axiosInstance) => {
  let options = getOptions();
  let verbose = options?.verbose;
  return _getOAuth2Token(oauth2Config, tokenStore, verbose, axiosInstance);
};

module.exports = {
  getFormattedOauth2Credentials,
  getOAuth2Token
};
