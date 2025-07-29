const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const { authorizeUserInWindow } = require('../ipc/network/authorize-user-in-window');
const Oauth2Store = require('../store/oauth2');
const { makeAxiosInstance } = require('../ipc/network/axios-instance');
const { safeParseJSON, safeStringifyJSON } = require('./common');
const qs = require('qs');

const oauth2Store = new Oauth2Store();

const persistOauth2Credentials = ({ collectionUid, url, credentials, credentialsId }) => {
  if (credentials?.error || !credentials?.access_token) return;
  const enhancedCredentials = {
    ...credentials,
    created_at: Date.now(),
  };
  oauth2Store.updateCredentialsForCollection({ collectionUid, url, credentials: enhancedCredentials, credentialsId });
};

const clearOauth2Credentials = ({ collectionUid, url, credentialsId }) => {
  oauth2Store.clearCredentialsForCollection({ collectionUid, url, credentialsId });
};

const getStoredOauth2Credentials = ({ collectionUid, url, credentialsId }) => {
  try {
    const credentials = oauth2Store.getCredentialsForCollection({ collectionUid, url, credentialsId });
    return credentials;
  }
  catch (error) {
    return null;
  }
};

const isTokenExpired = (credentials) => {
  if (!credentials?.access_token) {
    return true;
  }
  if (!credentials?.expires_in || !credentials.created_at) {
    return false;
  }
  const expiryTime = credentials.created_at + credentials.expires_in * 1000;
  return Date.now() > expiryTime;
};

const safeParseJSONBuffer = (data) => {
  return safeParseJSON(Buffer.isBuffer(data) ? data.toString() : data);
}

const getCredentialsFromTokenUrl = async ({ requestConfig, certsAndProxyConfig }) => {
  const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
  const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });
  let requestDetails, parsedResponseData;
  try {
    const response = await axiosInstance(requestConfig);
    const { url: responseUrl, headers: responseHeaders, status: responseStatus, statusText: responseStatusText, data: responseData, timeline, config } = response || {};
    const { url: requestUrl, headers: requestHeaders, data: requestData } = config || {};
    parsedResponseData = safeParseJSONBuffer(responseData);
    requestDetails = {
      request: {
        url: requestUrl,
        headers: requestHeaders,
        data: requestData,
        method: 'POST'
      },
      response: {
        url: responseUrl,
        headers: responseHeaders,
        data: parsedResponseData,
        status: responseStatus,
        statusText: responseStatusText,
        timeline
      }
    }
  }
  catch (error) {
    if (error.response) {
      const { response, config } = error;
      const { url: responseUrl, headers: responseHeaders, status: responseStatus, statusText: responseStatusText, data: responseData, timeline } = response || {};
      const { url: requestUrl, headers: requestHeaders, data: requestData } = config || {};
      const errorResponseData = safeStringifyJSON(safeParseJSONBuffer(responseData))
      requestDetails = {
        request: {
          url: requestUrl,
          headers: requestHeaders,
          data: requestData,
          method: 'POST'
        },
        response: {
          url: responseUrl,
          headers: responseHeaders,
          data: errorResponseData,
          status: responseStatus,
          statusText: responseStatusText,
          timeline,
          error: errorResponseData,
          timestamp: Date.now()
        }
      };
    }
    else if (error?.code) {
      // error.config is not available here
      const { url: requestUrl, headers: requestHeaders, data: requestData } = requestConfig;
      requestDetails = {
        request: {
          url: requestUrl,
          headers: requestHeaders,
          data: requestData
        },
        response: {
          status: '-',
          statusText: error?.code,
          headers: {},
          data: safeStringifyJSON(error?.errors),
          timeline: error?.response?.timeline
        }
      };
    }
  }

  // Add the axios request and response info as a main request in debugInfo
  requestDetails = {
    ...requestDetails,
    requestId: Date.now().toString(),
    fromCache: false,
    completed: true,
    requests: [], // No sub-requests in this context
  };

  return { credentials: parsedResponseData, requestDetails };
}

// AUTHORIZATION CODE

const getOAuth2TokenUsingAuthorizationCode = async ({ request, collectionUid, forceFetch = false, certsAndProxyConfig }) => {
  let codeVerifier = generateCodeVerifier();
  let codeChallenge = generateCodeChallenge(codeVerifier);

  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const {
    clientId,
    clientSecret,
    callbackUrl,
    scope,
    pkce,
    credentialsPlacement,
    authorizationUrl,
    credentialsId,
    autoRefreshToken,
    autoFetchToken,
    additionalParameters,
  } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;
  
  // Validate required fields
  if (!authorizationUrl) {
    return {
      error: 'Authorization URL is required for OAuth2 authorization code flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!url) {
    return {
      error: 'Access Token URL is required for OAuth2 authorization code flow',
      credentials: null,
      url: authorizationUrl,
      credentialsId
    };
  }

  if (!callbackUrl) {
    return {
      error: 'Callback URL is required for OAuth2 authorization code flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!clientId) {
    return {
      error: 'Client ID is required for OAuth2 authorization code flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!forceFetch) {
    const storedCredentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId });

    if (storedCredentials) {
      // Token exists
      if (!isTokenExpired(storedCredentials)) {
        // Token is valid, use it
        return { collectionUid, url, credentials: storedCredentials, credentialsId };
      } else {
        // Token is expired
        if (autoRefreshToken && storedCredentials.refresh_token) {
          // Try to refresh token
          try {
            const refreshedCredentialsData = await refreshOauth2Token({ requestCopy, collectionUid, certsAndProxyConfig });
            return { collectionUid, url, credentials: refreshedCredentialsData.credentials, credentialsId };
          } catch (error) {
            // Refresh failed
            clearOauth2Credentials({ collectionUid, url, credentialsId });
            if (autoFetchToken) {
              // Proceed to fetch new token
            } else {
              // Proceed with expired token
              return { collectionUid, url, credentials: storedCredentials, credentialsId };
            }
          }
        } else if (autoRefreshToken && !storedCredentials.refresh_token) {
          // Cannot refresh; try autoFetchToken
          if (autoFetchToken) {
            // Proceed to fetch new token
            clearOauth2Credentials({ collectionUid, url, credentialsId });
          } else {
            // Proceed with expired token
            return { collectionUid, url, credentials: storedCredentials, credentialsId };
          }
        } else if (!autoRefreshToken && autoFetchToken) {
          // Proceed to fetch new token
          clearOauth2Credentials({ collectionUid, url, credentialsId });
        } else {
          // Proceed with expired token
          return { collectionUid, url, credentials: storedCredentials, credentialsId };
        }
      }
    } else {
      // No stored credentials
      if (autoFetchToken && !storedCredentials) {
        // Proceed to fetch new token
      } else {
        // Proceed without token
        return { collectionUid, url, credentials: storedCredentials, credentialsId };
      }
    }
  }

  // Fetch new token process
  const { authorizationCode, debugInfo } = await getOAuth2AuthorizationCode(requestCopy, codeChallenge, collectionUid);

  let axiosRequestConfig = {};
  axiosRequestConfig.method = 'POST';
  axiosRequestConfig.headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };
  if (credentialsPlacement === "basic_auth_header") {
    axiosRequestConfig.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const data = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: callbackUrl,
    client_id: clientId,
  };
  if (clientSecret && credentialsPlacement !== "basic_auth_header") {
    data.client_secret = clientSecret;
  }
  if (pkce) {
    data['code_verifier'] = codeVerifier;
  }
  if (scope && scope.trim() !== '') {
    data.scope = scope;
  }
  axiosRequestConfig.url = url;
  axiosRequestConfig.responseType = 'arraybuffer';
  // Apply additional parameters to token request
  if (additionalParameters?.token?.length) {
    applyAdditionalParameters(axiosRequestConfig, data, additionalParameters.token);
  }
  axiosRequestConfig.data = qs.stringify(data);
  try {
    const { credentials, requestDetails } = await getCredentialsFromTokenUrl({ requestConfig: axiosRequestConfig, certsAndProxyConfig });

    // Ensure debugInfo.data is initialized
    if (!debugInfo) {
      debugInfo = { data: [] };
    } else if (!debugInfo.data) {
      debugInfo.data = [];
    }

    debugInfo.data.push(requestDetails);
    credentials && persistOauth2Credentials({ collectionUid, url, credentials, credentialsId });
    return { collectionUid, url, credentials, credentialsId, debugInfo };
  } catch (error) {
    return Promise.reject(error);
  }
};

const getOAuth2AuthorizationCode = (request, codeChallenge, collectionUid) => {
  return new Promise(async (resolve, reject) => {
    const { oauth2 } = request;
    const { callbackUrl, clientId, authorizationUrl, scope, state, pkce, accessTokenUrl, additionalParameters } = oauth2;

    const authorizationUrlWithQueryParams = new URL(authorizationUrl);
    authorizationUrlWithQueryParams.searchParams.append('response_type', 'code');
    authorizationUrlWithQueryParams.searchParams.append('client_id', clientId);
    if (callbackUrl) {
      authorizationUrlWithQueryParams.searchParams.append('redirect_uri', callbackUrl);
    }
    if (scope) {
      authorizationUrlWithQueryParams.searchParams.append('scope', scope);
    }
    if (pkce) {
      authorizationUrlWithQueryParams.searchParams.append('code_challenge', codeChallenge);
      authorizationUrlWithQueryParams.searchParams.append('code_challenge_method', 'S256');
    }
    if (state) {
      authorizationUrlWithQueryParams.searchParams.append('state', state);
    }
    if (additionalParameters?.authorization?.length) {
      additionalParameters.authorization.forEach(param => {
        if (param.enabled && param.name) {
          if (param.sendIn === 'queryparams') {
            authorizationUrlWithQueryParams.searchParams.append(param.name, param.value || '');
          }
        }
      });
    }
    
    try {
      const authorizeUrl = authorizationUrlWithQueryParams.toString();
      const { authorizationCode, debugInfo } = await authorizeUserInWindow({
        authorizeUrl,
        callbackUrl,
        session: oauth2Store.getSessionIdOfCollection({ collectionUid, url: accessTokenUrl }),
        additionalHeaders: getAdditionalHeaders(additionalParameters?.authorization)
      });
      resolve({ authorizationCode, debugInfo });
    } catch (err) {
      reject(err);
    }
  });
};

const getAdditionalHeaders = (params) => {
  if (!params || !params.length) {
    return {};
  }
  
  const headers = {};
  params.forEach(param => {
    if (param.enabled && param.name && param.sendIn === 'headers') {
      headers[param.name] = param.value || '';
    }
  });
  
  return headers;
};

// CLIENT CREDENTIALS

const getOAuth2TokenUsingClientCredentials = async ({ request, collectionUid, forceFetch = false, certsAndProxyConfig }) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const {
    clientId,
    clientSecret,
    scope,
    credentialsPlacement,
    credentialsId,
    autoRefreshToken,
    autoFetchToken,
    additionalParameters,
  } = oAuth;

  const url = requestCopy?.oauth2?.accessTokenUrl;

  // Validate required fields
  if (!url) {
    return {
      error: 'Access Token URL is required for OAuth2 client credentials flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!clientId) {
    return {
      error: 'Client ID is required for OAuth2 client credentials flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!clientSecret) {
    return {
      error: 'Client Secret is required for OAuth2 client credentials flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!forceFetch) {
    const storedCredentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId });

    if (storedCredentials) {
      // Token exists
      if (!isTokenExpired(storedCredentials)) {
        // Token is valid, use it
        return { collectionUid, url, credentials: storedCredentials, credentialsId };
      } else {
        // Token is expired
        if (autoRefreshToken && storedCredentials.refresh_token) {
          // Try to refresh token
          try {
            const refreshedCredentialsData = await refreshOauth2Token({ requestCopy, collectionUid, certsAndProxyConfig });
            return { collectionUid, url, credentials: refreshedCredentialsData.credentials, credentialsId };
          } catch (error) {
            clearOauth2Credentials({ collectionUid, url, credentialsId });
            if (autoFetchToken) {
              // Proceed to fetch new token
            } else {
              // Proceed with expired token
              return { collectionUid, url, credentials: storedCredentials, credentialsId };
            }
          }
        } else if (autoRefreshToken && !storedCredentials.refresh_token) {
          if (autoFetchToken) {
            // Proceed to fetch new token
            clearOauth2Credentials({ collectionUid, url, credentialsId });
          } else {
            // Proceed with expired token
            return { collectionUid, url, credentials: storedCredentials, credentialsId };
          }
        } else if (!autoRefreshToken && autoFetchToken) {
          // Proceed to fetch new token
          clearOauth2Credentials({ collectionUid, url, credentialsId });
        } else {
          // Proceed with expired token
          return { collectionUid, url, credentials: storedCredentials, credentialsId };
        }
      }
    } else {
      // No stored credentials
      if (autoFetchToken && !storedCredentials) {
        // Proceed to fetch new token
      } else {
        // Proceed without token
        return { collectionUid, url, credentials: storedCredentials, credentialsId };
      }
    }
  }

  // Fetch new token process
  let axiosRequestConfig = {};
  axiosRequestConfig.method = 'POST';
  axiosRequestConfig.headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };
  if (credentialsPlacement === "basic_auth_header") {
    axiosRequestConfig.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
  };
  if (clientSecret && credentialsPlacement !== "basic_auth_header") {
    data.client_secret = clientSecret;
  }
  if (scope && scope.trim() !== '') {
    data.scope = scope;
  }
  axiosRequestConfig.url = url;
  axiosRequestConfig.responseType = 'arraybuffer';
  if (additionalParameters?.token?.length) {
    applyAdditionalParameters(axiosRequestConfig, data, additionalParameters.token);
  }
  axiosRequestConfig.data = qs.stringify(data);
  let debugInfo = { data: [] };
  try {
    const { credentials, requestDetails } = await getCredentialsFromTokenUrl({ requestConfig: axiosRequestConfig, certsAndProxyConfig });
    debugInfo.data.push(requestDetails);
    credentials && persistOauth2Credentials({ collectionUid, url, credentials, credentialsId });
    return { collectionUid, url, credentials, credentialsId, debugInfo };
  } catch (error) {
    return Promise.reject(safeStringifyJSON(error?.response?.data));
  }
};

// PASSWORD CREDENTIALS

const getOAuth2TokenUsingPasswordCredentials = async ({ request, collectionUid, forceFetch = false, certsAndProxyConfig }) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const {
    username,
    password,
    clientId,
    clientSecret,
    scope,
    credentialsPlacement,
    credentialsId,
    autoRefreshToken,
    autoFetchToken,
    additionalParameters,
  } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;

  // Validate required fields
  if (!url) {
    return {
      error: 'Access Token URL is required for OAuth2 password credentials flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!username) {
    return {
      error: 'Username is required for OAuth2 password credentials flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!password) {
    return {
      error: 'Password is required for OAuth2 password credentials flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!clientId) {
    return {
      error: 'Client ID is required for OAuth2 password credentials flow',
      credentials: null,
      url,
      credentialsId
    };
  }

  if (!forceFetch) {
    const storedCredentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId });

    if (storedCredentials) {
      // Token exists
      if (!isTokenExpired(storedCredentials)) {
        // Token is valid, use it
        return { collectionUid, url, credentials: storedCredentials, credentialsId };
      } else {
        // Token is expired
        if (autoRefreshToken && storedCredentials.refresh_token) {
          // Try to refresh token
          try {
            const refreshedCredentialsData = await refreshOauth2Token({ requestCopy, collectionUid, certsAndProxyConfig });
            return { collectionUid, url, credentials: refreshedCredentialsData.credentials, credentialsId };
          } catch (error) {
            clearOauth2Credentials({ collectionUid, url, credentialsId });
            if (autoFetchToken) {
              // Proceed to fetch new token
            } else {
              // Proceed with expired token
              return { collectionUid, url, credentials: storedCredentials, credentialsId };
            }
          }
        } else if (autoRefreshToken && !storedCredentials.refresh_token) {
          // Cannot refresh; try autoFetchToken
          if (autoFetchToken) {
            // Proceed to fetch new token
            clearOauth2Credentials({ collectionUid, url, credentialsId });
          } else {
            // Proceed with expired token
            return { collectionUid, url, credentials: storedCredentials, credentialsId };
          }
        } else if (!autoRefreshToken && autoFetchToken) {
          // Proceed to fetch new token
          clearOauth2Credentials({ collectionUid, url, credentialsId });
        } else {
          // Proceed with expired token
          return { collectionUid, url, credentials: storedCredentials, credentialsId };
        }
      }
    } else {
      // No stored credentials
      if (autoFetchToken && !storedCredentials) {
        // Proceed to fetch new token
      } else {
        // Proceed without token
        return { collectionUid, url, credentials: storedCredentials, credentialsId };
      }
    }
  }

  // Fetch new token process
  let axiosRequestConfig = {};
  axiosRequestConfig.method = 'POST';
  axiosRequestConfig.headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };
  if (credentialsPlacement === "basic_auth_header") {
    axiosRequestConfig.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const data = {
    grant_type: 'password',
    username,
    password,
    client_id: clientId,
  };
  if (clientSecret && credentialsPlacement !== "basic_auth_header") {
    data.client_secret = clientSecret;
  }
  if (scope && scope.trim() !== '') {
    data.scope = scope;
  }
  axiosRequestConfig.url = url;
  axiosRequestConfig.responseType = 'arraybuffer';
  if (additionalParameters?.token?.length) {
    applyAdditionalParameters(axiosRequestConfig, data, additionalParameters.token);
  }
  axiosRequestConfig.data = qs.stringify(data);
  let debugInfo = { data: [] };
  try {
    const { credentials, requestDetails } = await getCredentialsFromTokenUrl({ requestConfig: axiosRequestConfig, certsAndProxyConfig });
    debugInfo.data.push(requestDetails);
    credentials && persistOauth2Credentials({ collectionUid, url, credentials, credentialsId });
    return { collectionUid, url, credentials, credentialsId, debugInfo };
  } catch (error) {
    return Promise.reject(safeStringifyJSON(error?.response?.data));
  }
};

const refreshOauth2Token = async ({ requestCopy, collectionUid, certsAndProxyConfig }) => {
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, credentialsId } = oAuth;
  const url = oAuth.refreshTokenUrl ? oAuth.refreshTokenUrl : oAuth.accessTokenUrl;

  const credentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId });
  if (!credentials?.refresh_token) {
    clearOauth2Credentials({ collectionUid, url, credentialsId });
    // Proceed without token
    return { collectionUid, url, credentials: null, credentialsId };
  } else {
    const data = {
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: credentials.refresh_token,
    };
    if (clientSecret) {
      data.client_secret = clientSecret;
    }
    let axiosRequestConfig = {};
    axiosRequestConfig.method = 'POST';
    axiosRequestConfig.headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };
    axiosRequestConfig.url = url;
    axiosRequestConfig.responseType = 'arraybuffer';
    if (oAuth.additionalParameters?.refresh?.length) {
      applyAdditionalParameters(axiosRequestConfig, data, oAuth.additionalParameters.refresh);
    }
    axiosRequestConfig.data = qs.stringify(data);
    let debugInfo = { data: [] };
    try {
      const { credentials, requestDetails } = await getCredentialsFromTokenUrl({ requestConfig: axiosRequestConfig, certsAndProxyConfig });
      debugInfo.data.push(requestDetails);
      if (!credentials || credentials?.error) {
        clearOauth2Credentials({ collectionUid, url, credentialsId });
        return { collectionUid, url, credentials: null, credentialsId, debugInfo };
      }
      credentials && persistOauth2Credentials({ collectionUid, url, credentials, credentialsId });
      return { collectionUid, url, credentials, credentialsId, debugInfo };
    } catch (error) {
      clearOauth2Credentials({ collectionUid, url, credentialsId });
      // Proceed without token
      return { collectionUid, url, credentials: null, credentialsId, debugInfo };
    }
  }
};

// HELPER FUNCTIONS

const generateCodeVerifier = () => {
  return crypto.randomBytes(22).toString('hex');
};

const generateCodeChallenge = (codeVerifier) => {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  const base64Hash = hash.digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return base64Hash;
};

// Apply additional parameters to a request
const applyAdditionalParameters = (requestCopy, data, params = []) => {
  params.forEach(param => {
    if (!param.enabled || !param.name) {
      return;
    }

    switch (param.sendIn) {
      case 'headers':
        requestCopy.headers[param.name] = param.value || '';
        break;
      case 'queryparams':
        // For query params, add to URL
        try {
          let url = new URL(requestCopy.url);
          url.searchParams.append(param.name, param.value);
          requestCopy.url = url.href;
        }
        catch (error) {
          console.error('invalid token/refresh url', requestCopy.url);
        }
        break;
      case 'body':
        // For body, add to data object
        data[param.name] = param.value || '';
        break;
    }
  });
}

const getOAuth2TokenUsingImplicitGrant = async ({ request, collectionUid, forceFetch = false }) => {
  const { oauth2 = {} } = request;
  const {
    authorizationUrl,
    clientId,
    scope,
    state = '',
    callbackUrl,
    credentialsId = 'credentials',
    autoFetchToken = true
  } = oauth2;

  // Validate required fields
  if (!authorizationUrl) {
    return {
      error: 'Authorization URL is required for OAuth2 implicit flow',
      credentials: null,
      url: authorizationUrl,
      credentialsId
    };
  }

  if (!callbackUrl) {
    return {
      error: 'Callback URL is required for OAuth2 implicit flow',
      credentials: null,
      url: authorizationUrl,
      credentialsId
    };
  }

  // Check if we already have valid credentials
  if (!forceFetch) {
    try {
      const storedCredentials = getStoredOauth2Credentials({ 
        collectionUid, 
        url: authorizationUrl, 
        credentialsId 
      });
      
      if (storedCredentials) {
        // Token exists
        if (!isTokenExpired(storedCredentials)) {
          // Token is valid, use it
          return { 
            collectionUid,
            credentials: storedCredentials, 
            url: authorizationUrl, 
            credentialsId 
          };
        } else {
          // Token is expired - unlike other grant types, implicit flow doesn't support refresh tokens
          if (autoFetchToken) {
            // Proceed to fetch new token
            clearOauth2Credentials({ collectionUid, url: authorizationUrl, credentialsId });
          } else {
            // Proceed with expired token
            return { 
              collectionUid,
              credentials: storedCredentials, 
              url: authorizationUrl, 
              credentialsId 
            };
          }
        }
      } else {
        // No stored credentials
        if (!autoFetchToken) {
          // Don't fetch token if autoFetchToken is disabled
          return { 
            collectionUid,
            credentials: null, 
            url: authorizationUrl, 
            credentialsId 
          };
        }
        // Otherwise proceed to fetch new token
      }
    } catch (error) {
      console.error('Error retrieving oauth2 credentials from cache', error);
      clearOauth2Credentials({ collectionUid, url: authorizationUrl, credentialsId });
    }
  }

  const authorizationUrlWithQueryParams = new URL(authorizationUrl);
  authorizationUrlWithQueryParams.searchParams.append('response_type', 'token');
  authorizationUrlWithQueryParams.searchParams.append('client_id', clientId);
  authorizationUrlWithQueryParams.searchParams.append('redirect_uri', callbackUrl);
  if (scope) {
    authorizationUrlWithQueryParams.searchParams.append('scope', scope);
  }
  if (state) {
    authorizationUrlWithQueryParams.searchParams.append('state', state);
  }

  const authorizeUrl = authorizationUrlWithQueryParams.toString();
  
  try {
    const { implicitTokens, debugInfo } = await authorizeUserInWindow({
      authorizeUrl,
      callbackUrl,
      session: oauth2Store.getSessionIdOfCollection({ collectionUid, url: authorizationUrl }),
      grantType: 'implicit'
    });

    if (!implicitTokens || !implicitTokens.access_token) {
      return {
        error: 'No access token received from authorization server',
        credentials: null,
        url: authorizationUrl,
        credentialsId,
        debugInfo
      };
    }
    
    const credentials = {
      access_token: implicitTokens.access_token,
      token_type: implicitTokens.token_type || 'Bearer',
      state: implicitTokens.state || '',
      ...(implicitTokens.expires_in ? { expires_in: parseInt(implicitTokens.expires_in) } : {}),
      created_at: Date.now()
    };

    if (implicitTokens.scope) {
      credentials.scope = implicitTokens.scope;
    }

    // Store the credentials
    persistOauth2Credentials({
      collectionUid,
      url: authorizationUrl,
      credentials,
      credentialsId
    });
    
    return {
      collectionUid,
      credentials,
      url: authorizationUrl,
      credentialsId,
      debugInfo
    };
  } catch (error) {
    return {
      error: error.message || 'Failed to obtain token',
      credentials: null,
      url: authorizationUrl,
      credentialsId
    };
  }
};

module.exports = {
  persistOauth2Credentials,
  clearOauth2Credentials,
  getStoredOauth2Credentials,
  getOAuth2TokenUsingAuthorizationCode,
  getOAuth2TokenUsingClientCredentials,
  getOAuth2TokenUsingPasswordCredentials,
  getOAuth2TokenUsingImplicitGrant,
  refreshOauth2Token,
  generateCodeVerifier,
  generateCodeChallenge
};