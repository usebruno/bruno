let oauth2AuthorizationRequest = null;

const registerOauth2AuthorizationRequest = (resolve, reject, grantType = 'authorization_code') => {
  // Cancel any existing pending request
  if (oauth2AuthorizationRequest) {
    oauth2AuthorizationRequest.reject(new Error('Authorization cancelled: new request started'));
  }

  oauth2AuthorizationRequest = {
    resolve,
    reject,
    grantType,
    timestamp: Date.now()
  };
};

const isOauth2AuthorizationRequestInProgress = () => {
  return oauth2AuthorizationRequest !== null;
};

const resolveOauth2AuthorizationRequest = (data, grantType = null) => {
  if (oauth2AuthorizationRequest) {
    const effectiveGrantType = grantType || oauth2AuthorizationRequest.grantType || 'authorization_code';

    if (effectiveGrantType === 'implicit') {
      // For implicit grant, data should be implicitTokens object
      oauth2AuthorizationRequest.resolve({ implicitTokens: data, debugInfo: { data: [] } });
    } else {
      // For authorization code grant, data is the authorization code string
      oauth2AuthorizationRequest.resolve({ authorizationCode: data, debugInfo: { data: [] } });
    }
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

const handleOauth2ProtocolUrl = (url) => {
  try {
    const urlObj = new URL(url);
    // Check for errors in query params (authorization code flow) or hash (implicit flow)
    const error = urlObj.searchParams.get('error') || (urlObj.hash ? new URLSearchParams(urlObj.hash.substring(1)).get('error') : null);
    const errorDescription = urlObj.searchParams.get('error_description') || (urlObj.hash ? new URLSearchParams(urlObj.hash.substring(1)).get('error_description') : null);

    if (error) {
      const errorData = {
        message: 'Authorization Failed!',
        error,
        errorDescription
      };
      rejectOauth2AuthorizationRequest(new Error(JSON.stringify(errorData)));
      return;
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
        resolveOauth2AuthorizationRequest(implicitTokens, 'implicit');
        return;
      }
    }

    // Check for authorization code in query params (authorization code flow)
    const code = urlObj.searchParams.get('code');
    if (code) {
      resolveOauth2AuthorizationRequest(code, 'authorization_code');
      return;
    }
  } catch (err) {
    console.error('Error handling protocol URL:', err);
  }
};

const BRUNO_OAUTH2_URL = 'https://lohit-bruno.github.io/bruno-oauth2-uri-redirect';

module.exports = {
  registerOauth2AuthorizationRequest,
  rejectOauth2AuthorizationRequest,
  cancelOAuth2AuthorizationRequest,
  isOauth2AuthorizationRequestInProgress,
  handleOauth2ProtocolUrl,
  BRUNO_OAUTH2_URL
};
