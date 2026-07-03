const { getParamFromUrl } = require('./common');

let oauth2AuthorizationRequest = null;

const registerOauth2AuthorizationRequest = (resolve, reject, debugInfo = null, expectedState = null) => {
  // Cancel any existing pending request
  if (oauth2AuthorizationRequest) {
    oauth2AuthorizationRequest.reject(new Error('Authorization cancelled: new request started'));
  }

  oauth2AuthorizationRequest = {
    resolve,
    reject,
    debugInfo,
    expectedState,
    timestamp: Date.now()
  };
};

const isOauth2AuthorizationRequestInProgress = () => {
  return oauth2AuthorizationRequest !== null;
};

const resolveOauth2AuthorizationRequest = (data) => {
  if (oauth2AuthorizationRequest) {
    oauth2AuthorizationRequest.resolve(data);
    oauth2AuthorizationRequest = null;
    return true;
  }
  return false;
};

const rejectOauth2AuthorizationRequest = (error) => {
  if (oauth2AuthorizationRequest) {
    oauth2AuthorizationRequest.reject(error);
    oauth2AuthorizationRequest = null;
    return true;
  }
  return false;
};

const cancelOAuth2AuthorizationRequest = () => {
  return rejectOauth2AuthorizationRequest(new Error('Authorization cancelled by user'));
};

// Read a param from the query string, falling back to the URL hash fragment
// (implicit flow returns values in the hash rather than query params).
const getParamFromUrl = (urlObj, param) => {
  return (
    urlObj.searchParams.get(param)
    || (urlObj.hash ? new URLSearchParams(urlObj.hash.substring(1)).get(param) : null)
  );
};

const handleOauth2ProtocolUrl = (url) => {
  try {
    const urlObj = new URL(url);

    // Add callback URL details to debugInfo if available
    if (oauth2AuthorizationRequest?.debugInfo) {
      const callbackRequest = {
        request: {
          url: url,
          method: '',
          headers: {},
          error: null
        },
        response: {
          url: url,
          headers: {},
          status: '',
          statusText: 'BRUNO_OAUTH2_PROTOCOL',
          error: null
        },
        fromCache: false,
        completed: true
      };
      oauth2AuthorizationRequest.debugInfo.data.push(callbackRequest);
    }

    // Check for errors in query params (authorization code flow) or hash (implicit flow)
    const error = getParamFromUrl(urlObj, 'error');
    const errorDescription = getParamFromUrl(urlObj, 'error_description');

    if (error) {
      const errorData = {
        message: 'Authorization Failed!',
        error,
        errorDescription
      };
      rejectOauth2AuthorizationRequest(new Error(JSON.stringify(errorData)));
      return;
    }

    // Validate the state parameter to protect against CSRF / authorization code
    // injection. The returned state must match the cryptographically random state
    // issued when the flow was initiated.
    const expectedState = oauth2AuthorizationRequest?.expectedState;
    if (expectedState) {
      const returnedState = getParamFromUrl(urlObj, 'state');

      if (returnedState !== expectedState) {
        rejectOauth2AuthorizationRequest(
          new Error('OAuth2 state mismatch: the returned state does not match the issued state.')
        );
        return;
      }
    }

    // Check if this is an implicit grant (tokens in hash fragment)
    if (urlObj.hash) {
      const hash = urlObj.hash.substring(1); // Remove the leading #
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        // Extract tokens from hash fragment for implicit grant
        const implicitTokens = {
          access_token: accessToken,
          token_type: hashParams.get('token_type'),
          expires_in: hashParams.get('expires_in'),
          state: hashParams.get('state'),
          scope: hashParams.get('scope')
        };
        resolveOauth2AuthorizationRequest(implicitTokens);
        return;
      }
    }

    // Check for authorization code in query params (authorization code flow)
    const code = urlObj.searchParams.get('code');
    if (code) {
      resolveOauth2AuthorizationRequest(code);
      return;
    }

    // No code or access_token found - reject with error
    rejectOauth2AuthorizationRequest(new Error('Invalid OAuth2 callback: missing code or access_token'));
  } catch (err) {
    console.error('Error handling protocol URL:', err);
    rejectOauth2AuthorizationRequest(err);
  }
};

module.exports = {
  registerOauth2AuthorizationRequest,
  rejectOauth2AuthorizationRequest,
  cancelOAuth2AuthorizationRequest,
  isOauth2AuthorizationRequestInProgress,
  handleOauth2ProtocolUrl
};
