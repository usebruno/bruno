const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const { authorizeUserInWindow } = require('../ipc/network/authorize-user-in-window');
const Oauth2Store = require('../store/oauth2');
const { makeAxiosInstance } = require('./axios-instance');
const { safeParseJSON } = require('./common');

const oauth2Store = new Oauth2Store();

const persistOauth2Credentials = ({ collectionUid, url, credentials, credentialsId }) => {
  console.log("persist credentials", credentials, collectionUid, url);
  oauth2Store.updateCredentialsForCollection({ collectionUid, url, credentials, credentialsId });
}

const getOauth2Credentials = ({ collectionUid, url, credentialsId }) => {
  const credentials = oauth2Store.getCredentialsForCollection({ collectionUid, url, credentialsId });
  return credentials;
}

// AUTHORIZATION CODE

const getOAuth2TokenUsingAuthorizationCode = async (request, collectionUid) => {
  let codeVerifier = generateCodeVerifier();
  let codeChallenge = generateCodeChallenge(codeVerifier);

  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, callbackUrl, scope, pkce, authorizationUrl, credentialsId, reuseToken } = oAuth;
  const url = requestCopy?.oauth2?.accessTokenUrl;

  if (reuseToken) {
    const credentials = getOauth2Credentials({ collectionUid, url, credentialsId });
    if (credentials) {
      return credentials;
    }
  }

  const { authorizationCode } = await getOAuth2AuthorizationCode(requestCopy, codeChallenge, collectionUid);
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

  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.data = data;
  requestCopy.url = url;

  console.log("get auth token", data, url, oAuth);

  const axiosInstance = makeAxiosInstance();
  const response = await axiosInstance(requestCopy);
  console.log("response", response.data, response.data.toString());
  const parsedResponseData = safeParseJSON(response.data?.toString());
  persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
  return parsedResponseData;
};

const getOAuth2AuthorizationCode = (request, codeChallenge, collectionUid) => {
  return new Promise(async (resolve, reject) => {
    const { oauth2 } = request;
    const { callbackUrl, clientId, authorizationUrl, scope, state, pkce } = oauth2;

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
        session: oauth2Store.getSessionIdOfCollection(collectionUid)
      });
      resolve({ authorizationCode });
    } catch (err) {
      reject(err);
    }
  });
};

// CLIENT CREDENTIALS

const getOAuth2TokenUsingClientCredentials = async (request) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, scope, credentialsId } = oAuth;
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  };
  if (scope) {
    data.scope = scope;
  }

  const url = requestCopy?.oauth2?.accessTokenUrl;

  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.data = data;
  requestCopy.url = url;

  const axiosInstance = makeAxiosInstance();
  const response = await axiosInstance(requestCopy);
  const parsedResponseData = safeParseJSON(response.data);
  persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
  return parsedResponseData;
};

// PASSWORD CREDENTIALS

const getOAuth2TokenUsingPasswordCredentials = async (request) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { username, password, clientId, clientSecret, scope, credentialsId } = oAuth;
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
  const url = requestCopy?.oauth2?.accessTokenUrl;

  requestCopy.method = 'POST';
  requestCopy.headers['content-type'] = 'application/x-www-form-urlencoded';
  requestCopy.data = data;
  requestCopy.url = url;

  const axiosInstance = makeAxiosInstance();
  const response = await axiosInstance(requestCopy);
  const parsedResponseData = safeParseJSON(response.data);
  persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
  return parsedResponseData;
};


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
  getOAuth2TokenUsingPasswordCredentials
};
