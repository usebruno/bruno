const { shell } = require('electron');
const { registerOauth2AuthorizationRequest, rejectOauth2AuthorizationRequest } = require('../../utils/oauth2-protocol-handler');

const authorizeUserInSystemBrowser = ({ authorizeUrl, callbackUrl, grantType = 'authorization_code' }) => {
  return new Promise(async (resolve, reject) => {
    // Replace callback URL in authorization URL
    const authorizationUrlObj = new URL(authorizeUrl);
    authorizationUrlObj.searchParams.set('redirect_uri', callbackUrl);
    const modifiedAuthorizeUrl = authorizationUrlObj.toString();

    // Set timeout for the request (5 minutes)
    const timeout = setTimeout(() => {
      rejectOauth2AuthorizationRequest(new Error('Authorization timeout'));
    }, 5 * 60 * 1000);

    // Wrap resolve/reject to clear timeout and add debugInfo
    const debugInfo = {
      data: []
    };

    const authorizationRequest = {
      request: {
        url: modifiedAuthorizeUrl,
        method: 'GET',
        headers: {},
        error: null
      },
      response: {
        headers: {},
        status: null,
        statusText: null,
        error: null
      },
      fromCache: false,
      completed: false
    };

    debugInfo.data.push(authorizationRequest);

    const wrappedResolve = (value) => {
      clearTimeout(timeout);
      if (grantType === 'implicit') {
        resolve({ implicitTokens: value, debugInfo });
      } else {
        resolve({ authorizationCode: value, debugInfo });
      }
    };

    const wrappedReject = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    registerOauth2AuthorizationRequest(wrappedResolve, wrappedReject, debugInfo);

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
