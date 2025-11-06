const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const { authorizeUserInWindow } = require('../ipc/network/authorize-user-in-window');
const Oauth1Store = require('../store/oauth1');
const { makeAxiosInstance } = require('../ipc/network/axios-instance');
const { safeParseJSON, safeStringifyJSON } = require('./common');
const qs = require('qs');

const oauth1Store = new Oauth1Store();

const persistOauth1Credentials = ({ collectionUid, credentials, credentialsId }) => {
  if (!credentials?.accessToken || !credentials?.accessTokenSecret) return;
  oauth1Store.updateCredentialsForCollection({ collectionUid, credentials, credentialsId });
};

const clearOauth1Credentials = ({ collectionUid, credentialsId }) => {
  oauth1Store.clearCredentialsForCollection({ collectionUid, credentialsId });
};

const getStoredOauth1Credentials = ({ collectionUid, credentialsId }) => {
  try {
    const credentials = oauth1Store.getCredentialsForCollection({ collectionUid, credentialsId });
    return credentials;
  } catch (error) {
    return null;
  }
};

const safeParseJSONBuffer = (data) => {
  return safeParseJSON(Buffer.isBuffer(data) ? data.toString() : data);
};

const parseResponseBody = (responseData) => {
  // Try to parse as query string first (common for OAuth 1.0)
  try {
    const parsed = qs.parse(Buffer.isBuffer(responseData) ? responseData.toString() : responseData);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    // If query string parsing fails, try JSON
  }

  // Try JSON parsing
  return safeParseJSONBuffer(responseData);
};

const createOAuthInstance = ({ consumerKey, consumerSecret, signatureMethod, rsaPrivateKey }) => {
  let hashFunction;
  let signatureGenerator;

  // Convert escaped newlines to actual newlines in RSA private key
  // This handles cases where the key is stored with \n as literal characters
  let processedRsaKey = rsaPrivateKey;
  if (processedRsaKey && typeof processedRsaKey === 'string') {
    processedRsaKey = processedRsaKey.replace(/\\n/g, '\n');
  }

  // Determine hash function and signature type
  if (signatureMethod === 'PLAINTEXT') {
    hashFunction = null;
    signatureGenerator = 'PLAINTEXT';
  } else if (signatureMethod.startsWith('HMAC-')) {
    const algorithm = signatureMethod.replace('HMAC-', '').toLowerCase();
    hashFunction = (baseString, key) => {
      return crypto.createHmac(algorithm, key).update(baseString).digest('base64');
    };
    signatureGenerator = 'HMAC';
  } else if (signatureMethod.startsWith('RSA-')) {
    // crypto.createSign expects the full algorithm name like 'RSA-SHA256'
    hashFunction = (baseString) => {
      const sign = crypto.createSign(signatureMethod);
      sign.update(baseString);
      return sign.sign(processedRsaKey, 'base64');
    };
    signatureGenerator = 'RSA';
  } else {
    // Default to HMAC-SHA1
    hashFunction = (baseString, key) => {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    };
    signatureGenerator = 'HMAC';
  }

  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: signatureMethod,
    hash_function: signatureGenerator === 'RSA' ? hashFunction : hashFunction,
    version: '1.0'
  });
};

const makeOAuth1Request = async ({ url, method = 'POST', oauthData, oauth1Instance, certsAndProxyConfig, token = null }) => {
  const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
  const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });

  const requestData = {
    url,
    method
  };

  // Include oauth_callback in requestData for signature calculation (matches bruno-requests pattern)
  if (oauthData) {
    requestData.data = { ...oauthData };
  }

  const authData = oauth1Instance.authorize(requestData, token);

  // Add oauth_callback and oauth_verifier to authData (matches bruno-requests pattern)
  // This ensures they're included in the Authorization header/query params/body
  if (oauthData && oauthData.oauth_callback) {
    authData.oauth_callback = oauthData.oauth_callback;
  }
  if (oauthData && oauthData.oauth_verifier) {
    authData.oauth_verifier = oauthData.oauth_verifier;
  }

  let axiosRequestConfig = {
    method,
    url,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    responseType: 'arraybuffer'
  };

  if (oauthData) {
    axiosRequestConfig.data = qs.stringify(oauthData);
  }

  // Add OAuth parameters as Authorization header (matches bruno-requests pattern)
  axiosRequestConfig.headers['Authorization'] = oauth1Instance.toHeader(authData).Authorization;

  let requestDetails, parsedResponseData;
  try {
    const response = await axiosInstance(axiosRequestConfig);
    const { url: responseUrl, headers: responseHeaders, status: responseStatus, statusText: responseStatusText, data: responseData, timeline, config } = response || {};
    const { url: requestUrl, headers: requestHeaders, data: requestData } = config || {};

    parsedResponseData = parseResponseBody(responseData);

    requestDetails = {
      request: {
        url: requestUrl,
        headers: requestHeaders,
        data: requestData,
        method
      },
      response: {
        url: responseUrl,
        headers: responseHeaders,
        data: parsedResponseData,
        status: responseStatus,
        statusText: responseStatusText,
        timeline
      }
    };
  } catch (error) {
    if (error.response) {
      const { response, config } = error;
      const { url: responseUrl, headers: responseHeaders, status: responseStatus, statusText: responseStatusText, data: responseData, timeline } = response || {};
      const { url: requestUrl, headers: requestHeaders, data: requestData } = config || {};
      const errorResponseData = safeStringifyJSON(parseResponseBody(responseData));

      requestDetails = {
        request: {
          url: requestUrl,
          headers: requestHeaders,
          data: requestData,
          method
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
    } else if (error?.code) {
      const { url: requestUrl, headers: requestHeaders, data: requestData } = axiosRequestConfig;
      requestDetails = {
        request: {
          url: requestUrl,
          headers: requestHeaders,
          data: requestData,
          method
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

    throw error;
  }

  requestDetails = {
    ...requestDetails,
    requestId: Date.now().toString(),
    fromCache: false,
    completed: true,
    requests: []
  };

  return { data: parsedResponseData, requestDetails };
};

const getOAuth1Token = async ({ request, collectionUid, forceFetch = false, certsAndProxyConfig }) => {
  const oauth1Config = get(request, 'oauth1', {});
  const {
    consumerKey,
    consumerSecret,
    signatureMethod = 'HMAC-SHA1',
    requestTokenUrl,
    authorizeUrl,
    accessTokenUrl,
    callbackUrl,
    rsaPrivateKey,
    credentialsId = 'credentials'
  } = oauth1Config;

  // Validate required fields for 3-legged flow
  const is3LeggedFlow = requestTokenUrl || authorizeUrl || accessTokenUrl;

  if (is3LeggedFlow) {
    if (!requestTokenUrl) {
      return {
        error: 'Request Token URL is required for OAuth 1.0 3-legged flow',
        credentials: null,
        credentialsId
      };
    }

    if (!authorizeUrl) {
      return {
        error: 'Authorize URL is required for OAuth 1.0 3-legged flow',
        credentials: null,
        credentialsId
      };
    }

    if (!accessTokenUrl) {
      return {
        error: 'Access Token URL is required for OAuth 1.0 3-legged flow',
        credentials: null,
        credentialsId
      };
    }

    if (!callbackUrl) {
      return {
        error: 'Callback URL is required for OAuth 1.0 3-legged flow',
        credentials: null,
        credentialsId
      };
    }
  }

  if (!consumerKey) {
    return {
      error: 'Consumer Key is required for OAuth 1.0',
      credentials: null,
      credentialsId
    };
  }

  if (!consumerSecret) {
    return {
      error: 'Consumer Secret is required for OAuth 1.0',
      credentials: null,
      credentialsId
    };
  }

  if (signatureMethod.startsWith('RSA-') && !rsaPrivateKey) {
    return {
      error: 'RSA Private Key is required for RSA signature methods',
      credentials: null,
      credentialsId
    };
  }

  // Check stored credentials if not forcing fetch
  if (!forceFetch) {
    const storedCredentials = getStoredOauth1Credentials({ collectionUid, credentialsId });
    if (storedCredentials && storedCredentials.accessToken && storedCredentials.accessTokenSecret) {
      return { collectionUid, credentials: storedCredentials, credentialsId };
    }
  }

  // If not 3-legged flow, we can't fetch tokens automatically
  if (!is3LeggedFlow) {
    return {
      error: 'No stored credentials found. Please provide access token manually or configure 3-legged flow URLs.',
      credentials: null,
      credentialsId
    };
  }

  // Proceed with 3-legged OAuth 1.0 flow
  let debugInfo = { data: [] };

  try {
    const oauth1Instance = createOAuthInstance({ consumerKey, consumerSecret, signatureMethod, rsaPrivateKey });

    // Step 1: Get request token
    const requestTokenData = { oauth_callback: callbackUrl };
    const { data: requestTokenResponse, requestDetails: requestTokenDetails } = await makeOAuth1Request({
      url: requestTokenUrl,
      method: 'POST',
      oauthData: requestTokenData,
      oauth1Instance,
      certsAndProxyConfig
    });

    debugInfo.data.push(requestTokenDetails);

    if (!requestTokenResponse.oauth_token) {
      return {
        error: 'Failed to obtain request token',
        credentials: null,
        credentialsId,
        debugInfo
      };
    }

    const oauthToken = requestTokenResponse.oauth_token;
    const oauthTokenSecret = requestTokenResponse.oauth_token_secret;

    // Step 2: User authorization
    const authorizationUrlWithParams = new URL(authorizeUrl);
    authorizationUrlWithParams.searchParams.append('oauth_token', oauthToken);

    const { verifier, debugInfo: authDebugInfo } = await authorizeUserInWindow({
      authorizeUrl: authorizationUrlWithParams.toString(),
      callbackUrl,
      session: oauth1Store.getSessionIdOfCollection({ collectionUid, credentialsId }),
      grantType: 'oauth1'
    });

    if (authDebugInfo) {
      debugInfo = { data: [...debugInfo.data, ...authDebugInfo.data] };
    }

    if (!verifier) {
      return {
        error: 'Failed to obtain verifier from authorization',
        credentials: null,
        credentialsId,
        debugInfo
      };
    }

    // Step 3: Exchange for access token
    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    const accessTokenData = { oauth_verifier: verifier };
    const { data: accessTokenResponse, requestDetails: accessTokenDetails } = await makeOAuth1Request({
      url: accessTokenUrl,
      method: 'POST',
      oauthData: accessTokenData,
      oauth1Instance,
      certsAndProxyConfig,
      token
    });

    debugInfo.data.push(accessTokenDetails);

    if (!accessTokenResponse.oauth_token || !accessTokenResponse.oauth_token_secret) {
      return {
        error: 'Failed to obtain access token',
        credentials: null,
        credentialsId,
        debugInfo
      };
    }

    const credentials = {
      consumerKey,
      consumerSecret,
      accessToken: accessTokenResponse.oauth_token,
      accessTokenSecret: accessTokenResponse.oauth_token_secret,
      signatureMethod,
      rsaPrivateKey,
      credentialsId
    };

    persistOauth1Credentials({ collectionUid, credentials, credentialsId });

    return { collectionUid, credentials, credentialsId, debugInfo };
  } catch (error) {
    return {
      error: error.message || 'OAuth 1.0 authentication failed',
      credentials: null,
      credentialsId,
      debugInfo
    };
  }
};

const signOAuth1Request = ({ request, oauth1Config, requestUrl, requestMethod, requestHeaders, requestBody }) => {
  const {
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    signatureMethod = 'HMAC-SHA1',
    parameterTransmission = 'authorization_header',
    rsaPrivateKey,
    callbackUrl
  } = oauth1Config;

  if (!consumerKey || !consumerSecret) {
    return { requestHeaders, requestUrl, requestBody };
  }

  const oauth1Instance = createOAuthInstance({ consumerKey, consumerSecret, signatureMethod, rsaPrivateKey });

  const requestData = {
    url: requestUrl,
    method: requestMethod
  };

  // Include body parameters in signature for form-encoded POST requests
  if (requestMethod === 'POST' && requestHeaders['content-type'] === 'application/x-www-form-urlencoded' && requestBody) {
    requestData.data = qs.parse(requestBody);
  }

  // Include callback URL if provided (for request token requests)
  // This ensures oauth_callback is included in the signature
  if (callbackUrl) {
    if (!requestData.data) {
      requestData.data = {};
    }
    requestData.data.oauth_callback = callbackUrl;
  }

  const token = accessToken && accessTokenSecret ? { key: accessToken, secret: accessTokenSecret } : null;
  const authData = oauth1Instance.authorize(requestData, token);

  // Add oauth_callback to authData if provided (matches bruno-requests pattern)
  if (callbackUrl) {
    authData.oauth_callback = callbackUrl;
  }

  const modifiedHeaders = { ...requestHeaders };
  let modifiedUrl = requestUrl;
  let modifiedBody = requestBody;

  switch (parameterTransmission) {
    case 'authorization_header':
      modifiedHeaders['Authorization'] = oauth1Instance.toHeader(authData).Authorization;
      break;

    case 'query_param':
      const urlObj = new URL(requestUrl);
      Object.keys(authData).forEach((key) => {
        urlObj.searchParams.append(key, authData[key]);
      });
      modifiedUrl = urlObj.toString();
      break;

    case 'request_body':
      if (requestMethod === 'POST') {
        const bodyParams = requestBody ? qs.parse(requestBody) : {};
        const combinedParams = { ...bodyParams, ...authData };
        modifiedBody = qs.stringify(combinedParams);
        modifiedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else {
        // Fallback to header if not POST
        modifiedHeaders['Authorization'] = oauth1Instance.toHeader(authData).Authorization;
      }
      break;

    default:
      modifiedHeaders['Authorization'] = oauth1Instance.toHeader(authData).Authorization;
  }

  return {
    requestHeaders: modifiedHeaders,
    requestUrl: modifiedUrl,
    requestBody: modifiedBody
  };
};

const updateCollectionOauth1Credentials = ({ collectionUid, itemUid, collectionOauth1Credentials = [], requestOauth1Credentials = {} }) => {
  const { credentialsId, folderUid, credentials, debugInfo } = requestOauth1Credentials;

  // Remove existing credentials for the same combination
  const filteredOauth1Credentials = cloneDeep(collectionOauth1Credentials).filter((creds) => !(creds.collectionUid === collectionUid && creds.credentialsId === credentialsId));

  // Add the new credential with folderUid and itemUid
  filteredOauth1Credentials.push({
    collectionUid,
    folderUid: folderUid,
    itemUid: folderUid ? null : itemUid,
    credentials,
    credentialsId,
    debugInfo
  });

  return filteredOauth1Credentials;
};

module.exports = {
  persistOauth1Credentials,
  clearOauth1Credentials,
  getStoredOauth1Credentials,
  getOAuth1Token,
  signOAuth1Request,
  updateCollectionOauth1Credentials
};
