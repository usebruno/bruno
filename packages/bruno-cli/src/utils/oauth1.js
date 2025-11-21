const { getOAuth1Token: _getOAuth1Token, signOAuth1Request: _signOAuth1Request } = require('@usebruno/requests');
const tokenStore = require('../store/tokenStore');
const { getOptions } = require('./bru');

/**
 * Formats OAuth1 credentials into variables that can be accessed via bru.getOauth1CredentialVar()
 * @returns {Object} Formatted OAuth1 credential variables
 */
const getFormattedOauth1Credentials = () => {
  const oauth1Credentials = tokenStore.getAllOAuth1Credentials();
  let credentialsVariables = {};

  oauth1Credentials.forEach(({ credentialsId, credentials }) => {
    if (credentials) {
      Object.entries(credentials).forEach(([key, value]) => {
        credentialsVariables[`$oauth1.${credentialsId}.${key}`] = value;
      });
    }
  });

  return credentialsVariables;
};

const getOAuth1Token = (oauth1Config) => {
  let options = getOptions();
  let verbose = options?.verbose;
  return _getOAuth1Token(oauth1Config, tokenStore, verbose);
};

const signOAuth1Request = (params) => {
  return _signOAuth1Request(params);
};

module.exports = {
  getFormattedOauth1Credentials,
  getOAuth1Token,
  signOAuth1Request
};
