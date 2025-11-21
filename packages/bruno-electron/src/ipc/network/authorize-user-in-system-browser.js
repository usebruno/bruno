const { shell } = require('electron');
const { registerOauth2AuthorizationRequest, rejectOauth2AuthorizationRequest, BRUNO_OAUTH2_URL } = require('../../utils/oauth2-protocol-handler');

const authorizeUserInSystemBrowser = ({ authorizeUrl, grantType = 'authorization_code' }) => {
  return new Promise(async (resolve, reject) => {
    const brunoCallbackUrl = BRUNO_OAUTH2_URL;

    // Replace callback URL in authorization URL
    const authorizationUrlObj = new URL(authorizeUrl);
    authorizationUrlObj.searchParams.set('redirect_uri', brunoCallbackUrl);
    const modifiedAuthorizeUrl = authorizationUrlObj.toString();

    // Set timeout for the request (5 minutes)
    const timeout = setTimeout(() => {
      rejectOauth2AuthorizationRequest(new Error('Authorization timeout'));
    }, 5 * 60 * 1000);

    // Wrap resolve/reject to clear timeout
    const wrappedResolve = (value) => {
      clearTimeout(timeout);
      resolve(value);
    };

    const wrappedReject = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    // Register pending request with grant type
    registerOauth2AuthorizationRequest(wrappedResolve, wrappedReject, grantType);

    try {
      // Open system browser
      await shell.openExternal(modifiedAuthorizeUrl);
    } catch (error) {
      rejectOauth2AuthorizationRequest(error);
      wrappedReject(error);
    }
  });
};

module.exports = { authorizeUserInSystemBrowser };
