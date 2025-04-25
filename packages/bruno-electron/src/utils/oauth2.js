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
  catch(error) {
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
  } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;
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

  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.headers['Accept'] = 'application/json';
  if (credentialsPlacement === "basic_auth_header") {
    requestCopy.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
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
  if (scope) {
    data.scope = scope;
  }
  requestCopy.data = qs.stringify(data);
  requestCopy.url = url;
  requestCopy.responseType = 'arraybuffer';
  try {
    const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
    const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });
    let responseInfo, parsedResponseData;
    try {
      const response = await axiosInstance(requestCopy);
      parsedResponseData = safeParseJSONBuffer(response.data);
      responseInfo = {
        url: response?.url,
        status: response?.status,
        statusText: response?.statusText,
        headers: response?.headers,
        data: parsedResponseData,
        timestamp: Date.now(),
        timeline: response?.timeline
      };
    }
    catch(error) {
      if (error.response) {
        responseInfo = {
          url: error?.response?.url,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          headers: error?.response?.headers,
          data: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
          timestamp: Date.now(),
          timeline: error?.response?.timeline,
          error: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
        };
      }
      else if(error?.code) {
        responseInfo = {
          status: '-',
          statusText: error?.code,
          headers: error?.config?.headers,
          data: safeStringifyJSON(error?.errors),
          timeline: error?.response?.timeline
        };
      }
    }
    // Ensure debugInfo.data is initialized
    if (!debugInfo) {
      debugInfo = { data: [] };
    } else if (!debugInfo.data) {
      debugInfo.data = [];
    }

    // Add the axios request and response info as a main request in debugInfo
    const axiosMainRequest = {
      requestId: Date.now().toString(),
      request: {
        url: url,
        method: 'POST',
        headers: requestCopy?.headers,
        data: requestCopy?.data,
        error: null
      },
      response: {
        url: responseInfo?.url,
        headers: responseInfo?.headers,
        data: responseInfo?.data,
        status: responseInfo?.status,
        statusText: responseInfo?.statusText,
        error: responseInfo?.error,
        timeline: responseInfo?.timeline
      },
      fromCache: false,
      completed: true,
      requests: [], // No sub-requests in this context
    };
    debugInfo.data.push(axiosMainRequest);

    parsedResponseData && persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });

    return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
  } catch (error) {
    return Promise.reject(error);
  }
};

const getOAuth2AuthorizationCode = (request, codeChallenge, collectionUid) => {
  return new Promise(async (resolve, reject) => {
    const { oauth2 } = request;
    const { callbackUrl, clientId, authorizationUrl, scope, state, pkce, accessTokenUrl } = oauth2;

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
    try {
      const authorizeUrl = authorizationUrlWithQueryParams.toString();
      const { authorizationCode, debugInfo } = await authorizeUserInWindow({
        authorizeUrl,
        callbackUrl,
        session: oauth2Store.getSessionIdOfCollection({ collectionUid, url: accessTokenUrl })
      });
      resolve({ authorizationCode, debugInfo });
    } catch (err) {
      reject(err);
    }
  });
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
  } = oAuth;

  const url = requestCopy?.oauth2?.accessTokenUrl;

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
  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.headers['Accept'] = 'application/json';
  if (credentialsPlacement === "basic_auth_header") {
    requestCopy.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
  };
  if (clientSecret && credentialsPlacement !== "basic_auth_header") {
    data.client_secret = clientSecret;
  }
  if (scope) {
    data.scope = scope;
  }
  requestCopy.data = qs.stringify(data);
  requestCopy.url = url;
  requestCopy.responseType = 'arraybuffer';
  let debugInfo = { data: [] };
  try {
    const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
    const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });
    let responseInfo, parsedResponseData;
    try {
      const response = await axiosInstance(requestCopy);
      parsedResponseData = safeParseJSONBuffer(response.data);
      responseInfo = {
        url: response?.url,
        status: response?.status,
        statusText: response?.statusText,
        headers: response?.headers,
        data: parsedResponseData,
        timestamp: Date.now(),
        timeline: response?.timeline
      };
    }
    catch(error) {
      if (error.response) {
        responseInfo = {
          url: error?.response?.url,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          headers: error?.response?.headers,
          data: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
          timestamp: Date.now(),
          timeline: error?.response?.timeline,
          error: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
        };
      }
      else if(error?.code) {
        responseInfo = {
          status: '-',
          statusText: error?.code,
          headers: error?.config?.headers,
          data: safeStringifyJSON(error?.errors),
          timeline: error?.response?.timeline
        };
      }
    }
    if (!debugInfo) {
      debugInfo = { data: [] };
    } else if (!debugInfo.data) {
      debugInfo.data = [];
    }

    // Add the axios request and response info as a main request in debugInfo
    const axiosMainRequest = {
      requestId: Date.now().toString(),
      request: {
        url: url,
        method: 'POST',
        headers: requestCopy?.headers,
        data: requestCopy?.data,
        error: null
      },
      response: {
        url: responseInfo?.url,
        headers: responseInfo?.headers,
        data: responseInfo?.data,
        status: responseInfo?.status,
        statusText: responseInfo?.statusText,
        error: responseInfo?.error,
        timeline: responseInfo?.timeline
      },
      fromCache: false,
      completed: true,
      requests: [], // No sub-requests in this context
    };
    debugInfo.data.push(axiosMainRequest);

    parsedResponseData && persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
    return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
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
  } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;

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
  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.headers['Accept'] = 'application/json';
  if (credentialsPlacement === "basic_auth_header") {
    requestCopy.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
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
  if (scope) {
    data.scope = scope;
  }
  requestCopy.data = qs.stringify(data);
  requestCopy.url = url;
  requestCopy.responseType = 'arraybuffer';
  let debugInfo = { data: [] };
  try {
    const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
    const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });
    let responseInfo, parsedResponseData;
    try {
      const response = await axiosInstance(requestCopy);
      parsedResponseData = safeParseJSONBuffer(response.data);
      responseInfo = {
        url: response?.url,
        status: response?.status,
        statusText: response?.statusText,
        headers: response?.headers,
        data: parsedResponseData,
        timestamp: Date.now(),
        timeline: response?.timeline
      };
    }
    catch(error) {
      if (error.response) {
        responseInfo = {
          url: error?.response?.url,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          headers: error?.response?.headers,
          data: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
          timestamp: Date.now(),
          timeline: error?.response?.timeline,
          error: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
        };
      }
      else if(error?.code) {
        responseInfo = {
          status: '-',
          statusText: error?.code,
          headers: error?.config?.headers,
          data: safeStringifyJSON(error?.errors),
          timeline: error?.response?.timeline
        };
      }
    }
    if (!debugInfo) {
      debugInfo = { data: [] };
    } else if (!debugInfo.data) {
      debugInfo.data = [];
    }

    // Add the axios request and response info as a main request in debugInfo
    const axiosMainRequest = {
      requestId: Date.now().toString(),
      request: {
        url: url,
        method: 'POST',
        headers: requestCopy?.headers,
        data: requestCopy?.data,
        error: null
      },
      response: {
        url: responseInfo?.url,
        headers: responseInfo?.headers,
        data: responseInfo?.data,
        status: responseInfo?.status,
        statusText: responseInfo?.statusText,
        error: responseInfo?.error,
        timeline: responseInfo?.timeline
      },
      fromCache: false,
      completed: true,
      requests: [], // No sub-requests in this context
    };
    debugInfo.data.push(axiosMainRequest);

    parsedResponseData && persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
    return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
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
    requestCopy.method = 'POST';
    requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
    requestCopy.headers['Accept'] = 'application/json';
    requestCopy.data = qs.stringify(data);
    requestCopy.url = url;
    requestCopy.responseType = 'arraybuffer';
    let debugInfo = { data: [] };
    try {
      const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
      const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });
      let responseInfo, parsedResponseData;
      try {
        const response = await axiosInstance(requestCopy);
        parsedResponseData = safeParseJSONBuffer(response.data);
        responseInfo = {
          url: response?.url,
          status: response?.status,
          statusText: response?.statusText,
          headers: response?.headers,
          data: parsedResponseData,
          timestamp: Date.now(),
          timeline: response?.timeline
        };
      }
      catch(error) {
        if (error.response) {
          responseInfo = {
            url: error?.response?.url,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            headers: error?.response?.headers,
            data: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
            timestamp: Date.now(),
            timeline: error?.response?.timeline,
            error: safeStringifyJSON(safeParseJSONBuffer(error?.response?.data)),
          };
        }
        else if(error?.code) {
          responseInfo = {
            status: '-',
            statusText: error?.code,
            headers: error?.config?.headers,
            data: safeStringifyJSON(error?.errors),
            timeline: error?.response?.timeline
          };
        }
      }
      if (!debugInfo) {
        debugInfo = { data: [] };
      } else if (!debugInfo.data) {
        debugInfo.data = [];
      }
  
      // Add the axios request and response info as a main request in debugInfo
      const axiosMainRequest = {
        requestId: Date.now().toString(),
        request: {
          url: url,
          method: 'POST',
          headers: requestCopy?.headers,
          data: requestCopy?.data,
          error: null
        },
        response: {
          url: responseInfo?.url,
          headers: responseInfo?.headers,
          data: responseInfo?.data,
          status: responseInfo?.status,
          statusText: responseInfo?.statusText,
          error: responseInfo?.error,
          timeline: responseInfo?.timeline
        },
        fromCache: false,
        completed: true,
        requests: [], // No sub-requests in this context
      };
      debugInfo.data.push(axiosMainRequest);
      if (!parsedResponseData || parsedResponseData?.error) {
        clearOauth2Credentials({ collectionUid, url, credentialsId });
        return { collectionUid, url, credentials: null, credentialsId, debugInfo }; 
      }
      parsedResponseData && persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
      return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
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

module.exports = {
  getOAuth2TokenUsingAuthorizationCode,
  getOAuth2AuthorizationCode,
  getOAuth2TokenUsingClientCredentials,
  getOAuth2TokenUsingPasswordCredentials,
  refreshOauth2Token
};