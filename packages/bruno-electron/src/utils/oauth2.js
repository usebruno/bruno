const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const { authorizeUserInWindow } = require('../ipc/network/authorize-user-in-window');
const Oauth2Store = require('../store/oauth2');
const { makeAxiosInstance } = require('./axios-instance');
const { safeParseJSON, safeStringifyJSON } = require('./common');

const oauth2Store = new Oauth2Store();

// temp: this should be removed when more complex scenarios for fetching tokens are handled (refershing, automatic fetch, ...)
const ALWAYS_REUSE_ACCESS_TOKEN____UNLESS_FETCHED_MANUALLY = true;

const persistOauth2Credentials = ({ collectionUid, url, credentials, credentialsId }) => {
  oauth2Store.updateCredentialsForCollection({ collectionUid, url, credentials, credentialsId });
}

const clearOauth2Credentials = ({ collectionUid, url, credentialsId }) => {
  oauth2Store.clearCredentialsForCollection({ collectionUid, url, credentialsId });
}

const getStoredOauth2Credentials = ({ collectionUid, url, credentialsId }) => {
  const credentials = oauth2Store.getCredentialsForCollection({ collectionUid, url, credentialsId });
  return credentials;
}

// AUTHORIZATION CODE

const getOAuth2TokenUsingAuthorizationCode = async ({ request, collectionUid, forceFetch = false }) => {
  let codeVerifier = generateCodeVerifier();
  let codeChallenge = generateCodeChallenge(codeVerifier);

  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, callbackUrl, scope, pkce, credentialsPlacement, authorizationUrl, credentialsId, reuseToken } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;

  if ((reuseToken || ALWAYS_REUSE_ACCESS_TOKEN____UNLESS_FETCHED_MANUALLY) && !forceFetch) {
    const credentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId }) || {};
    return { collectionUid, url, credentials, credentialsId };
  }
  const { authorizationCode } = await getOAuth2AuthorizationCode(requestCopy, codeChallenge, collectionUid);

  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.headers['Accept'] = 'application/json';
  if (credentialsPlacement == "basic_auth_header") {
    requestCopy.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const data = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: callbackUrl,
    client_id: clientId,
    client_secret: clientSecret
  };
  if (pkce) {
    data['code_verifier'] = codeVerifier;
  }
  requestCopy.data = data;
  requestCopy.url = url;
  try {
    const axiosInstance = makeAxiosInstance();
    const response = await axiosInstance(requestCopy);
    const responseData = Buffer.isBuffer(response.data) ? response.data?.toString() : response.data;
    const parsedResponseData = safeParseJSON(responseData);
    persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
    return { collectionUid, url, credentials: parsedResponseData, credentialsId };
  }
  catch (error) {
    return Promise.reject(safeStringifyJSON(error?.response?.data));
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
      const { authorizationCode } = await authorizeUserInWindow({
        authorizeUrl,
        callbackUrl,
        session: oauth2Store.getSessionIdOfCollection({ collectionUid, url: accessTokenUrl })
      });
      resolve({ authorizationCode });
    } catch (err) {
      reject(err);
    }
  });
};

// CLIENT CREDENTIALS

const getOAuth2TokenUsingClientCredentials = async ({ request, collectionUid, forceFetch = false }) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, scope, credentialsPlacement, credentialsId, reuseToken } = oAuth;

  const url = requestCopy?.oauth2?.accessTokenUrl;

  if ((reuseToken || ALWAYS_REUSE_ACCESS_TOKEN____UNLESS_FETCHED_MANUALLY) && !forceFetch) {
    const credentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId }) || {};
    return { collectionUid, url, credentials, credentialsId };
  }

  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.headers['Accept'] = 'application/json';
  if (credentialsPlacement == "basic_auth_header") {
    requestCopy.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  };
  if (scope) {
    data.scope = scope;
  }
  requestCopy.data = data;
  requestCopy.url = url;

  const axiosInstance = makeAxiosInstance();

  try {
    const response = await axiosInstance(requestCopy);
    const responseData = Buffer.isBuffer(response.data) ? response.data?.toString() : response.data;
    const parsedResponseData = safeParseJSON(responseData);
    persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
    return { collectionUid, url, credentials: parsedResponseData, credentialsId };
  }
  catch (error) {
    return Promise.reject(safeStringifyJSON(error?.response?.data));
  }
};

// PASSWORD CREDENTIALS

const getOAuth2TokenUsingPasswordCredentials = async ({ request, collectionUid, forceFetch = false }) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { username, password, clientId, clientSecret, scope, credentialsPlacement, credentialsId, reuseToken } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;

  if ((reuseToken || ALWAYS_REUSE_ACCESS_TOKEN____UNLESS_FETCHED_MANUALLY) && !forceFetch) {
    const credentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId }) || {};
    return { collectionUid, url, credentials, credentialsId };
  }

  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.headers['Accept'] = 'application/json';
  if (credentialsPlacement == "basic_auth_header") {
    requestCopy.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const data = {
    grant_type: 'password',
    username,
    password,
    client_id: clientId,
    client_secret: clientSecret
  };
  if (scope) {
    data.scope = scope;
  }
  requestCopy.data = data;
  requestCopy.url = url;

  try {
    const axiosInstance = makeAxiosInstance();
    const response = await axiosInstance(requestCopy);
    const responseData = Buffer.isBuffer(response.data) ? response.data?.toString() : response.data;
    const parsedResponseData = safeParseJSON(responseData);
    persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
    return { collectionUid, url, credentials: parsedResponseData, credentialsId };
  }
  catch (error) {
    return Promise.reject(safeStringifyJSON(error?.response?.data));
  }
};

const refreshOauth2Token = async (request, collectionUid) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, credentialsId } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;

  const credentials = getStoredOauth2Credentials({ collectionUid, url, credentialsId });
  if (!credentials?.refresh_token) {
    clearOauth2Credentials({ collectionUid, url, credentialsId });
    let error = new Error('no refresh token found');
    return Promise.reject(error);
  }
  else {
    const data = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentials?.refresh_token
    };
    requestCopy.method = 'POST';
    requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
    requestCopy.headers['Accept'] = 'application/json';
    requestCopy.data = data;
    requestCopy.url = url;

    const axiosInstance = makeAxiosInstance();
    try {
      const response = await axiosInstance(requestCopy);
      const responseData = Buffer.isBuffer(response.data) ? response.data?.toString() : response.data;
      const parsedResponseData = safeParseJSON(responseData);
      persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
      return { collectionUid, url, credentials: parsedResponseData, credentialsId };
    }
    catch (error) {
      clearOauth2Credentials({ collectionUid, url, credentialsId });
      return Promise.reject(safeStringifyJSON(error?.response?.data));
    }
  }
}


// HELPER FUNCTIONS

const generateCodeVerifier = () => {
  return crypto.randomBytes(22).toString('hex');
};

const generateCodeChallenge = (codeVerifier) => {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  const base64Hash = hash.digest('base64');
  return base64Hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

module.exports = {
  getOAuth2TokenUsingAuthorizationCode,
  getOAuth2AuthorizationCode,
  getOAuth2TokenUsingClientCredentials,
  getOAuth2TokenUsingPasswordCredentials,
  refreshOauth2Token
};
