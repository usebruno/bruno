const { getOAuth2Token: _getOAuth2Token, OAUTH2_ERROR_CODES } = require('@usebruno/requests');
const tokenStore = require('../store/tokenStore');
const { getOptions } = require('./bru');
const { createCliAuthorizer, AUTHORIZATION_ERROR_CODES } = require('./oauth2-authorize');

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

// Authorization code sign-ins that ended definitively, keyed exactly like the token store, so requests
// sharing an OAuth2 config re-throw the first error instead of prompting again. Like the token store
// (and run options), this lives for the process, which the CLI entry point uses for a single command.
const failedAuthorizations = new Map();

// IdP errors that RFC 6749 (4.1.2.1) defines as transient, so a later request may retry sign-in
const RETRYABLE_AUTHORIZATION_ERRORS = ['server_error', 'temporarily_unavailable'];

/**
 * Whether prompting again in this run would only repeat the same outcome: the IdP or user refused,
 * or the user never completed sign-in. Token endpoint, network and listener failures stay retryable.
 */
const isDefinitiveAuthorizationFailure = (error) => {
  if (error?.code === OAUTH2_ERROR_CODES.AUTHORIZATION_DENIED) {
    return !RETRYABLE_AUTHORIZATION_ERRORS.includes(error.oauth2Error);
  }
  return error?.code === AUTHORIZATION_ERROR_CODES.CANCELLED || error?.code === AUTHORIZATION_ERROR_CODES.TIMED_OUT;
};

const authorize = createCliAuthorizer();

const getOAuth2Token = async (oauth2Config, axiosInstance) => {
  let options = getOptions();
  let verbose = options?.verbose;

  if (oauth2Config.grantType !== 'authorization_code') {
    return _getOAuth2Token(oauth2Config, tokenStore, verbose, axiosInstance);
  }

  // Same defaulting as getOAuth2Token, so an empty credentialsId is not merged into 'default'
  const { credentialsId = 'default', accessTokenUrl } = oauth2Config;
  const authorizationKey = JSON.stringify([credentialsId, accessTokenUrl]);
  if (failedAuthorizations.has(authorizationKey)) {
    throw failedAuthorizations.get(authorizationKey);
  }

  try {
    return await _getOAuth2Token(oauth2Config, tokenStore, verbose, axiosInstance, { authorize });
  } catch (error) {
    if (isDefinitiveAuthorizationFailure(error)) {
      failedAuthorizations.set(authorizationKey, error);
    }
    throw error;
  }
};

module.exports = {
  getFormattedOauth2Credentials,
  getOAuth2Token
};
