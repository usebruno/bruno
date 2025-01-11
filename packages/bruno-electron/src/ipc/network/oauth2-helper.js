const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const { authorizeUserInWindow } = require('./authorize-user-in-window');
const Oauth2Store = require('../../store/oauth2');
const { makeAxiosInstance } = require('./axios-instance');

const oauth2Store = new Oauth2Store();

const generateCodeVerifier = () => {
  return crypto.randomBytes(22).toString('hex');
};

const generateCodeChallenge = (codeVerifier) => {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  const base64Hash = hash.digest('base64');
  return base64Hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const getPersistedOauth2Credentials = (collectionUid) => {
  const collectionOauthStore = oauth2Store.getOauth2DataOfCollection(collectionUid);
  const cachedCredentials = collectionOauthStore.credentials;
  return { cachedCredentials };
};

const persistOauth2Credentials = (credentials, collectionUid) => {
  const collectionOauthStore = oauth2Store.getOauth2DataOfCollection(collectionUid);
  collectionOauthStore.credentials = credentials;
  oauth2Store.updateOauth2DataOfCollection(collectionUid, collectionOauthStore);
};

// AUTHORIZATION CODE

const oauth2AuthorizeWithAuthorizationCode = async (request, collectionUid) => {
  const { cachedCredentials } = getPersistedOauth2Credentials(collectionUid);
  if (cachedCredentials?.access_token) {
    console.log('Reusing Stored access token');
    return { credentials: cachedCredentials, authRequest: null, authResponse: null };
  }

  let codeVerifier = generateCodeVerifier();
  let codeChallenge = generateCodeChallenge(codeVerifier);

  let requestCopy = cloneDeep(request);
  const { authorizationCode } = await getOAuth2AuthorizationCode(requestCopy, codeChallenge, collectionUid);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, callbackUrl, pkce } = oAuth;
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

  request.method = 'POST';
  request.headers['content-type'] = 'application/x-www-form-urlencoded';
  request.data = data;
  request.url = request?.oauth2?.accessTokenUrl;

  const axiosInstance = makeAxiosInstance();
  const authResponse = await axiosInstance(request);
  const credentials = JSON.parse(authResponse.data);
  persistOauth2Credentials(credentials, collectionUid);

  return { credentials, authRequest: request, authResponse };
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
      const { authorizationCode } = await authorizeUserInWindow({
        authorizeUrl: authorizationUrlWithQueryParams.toString(),
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

const oauth2AuthorizeWithClientCredentials = async (request, collectionUid) => {
  const { cachedCredentials } = getPersistedOauth2Credentials(collectionUid);
  if (cachedCredentials?.access_token) {
    console.log('Reusing Stored access token');
    return { credentials: cachedCredentials, authRequest: null, authResponse: null };
  }

  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, scope } = oAuth;
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  };
  if (scope) {
    data.scope = scope;
  }

  request.method = 'POST';
  request.headers['content-type'] = 'application/x-www-form-urlencoded';
  request.data = data;
  request.url = request?.oauth2?.accessTokenUrl;

  const axiosInstance = makeAxiosInstance();
  let authResponse = await axiosInstance(request);
  let credentials = JSON.parse(authResponse.data);
  persistOauth2Credentials(credentials, collectionUid);
  return { credentials, authRequest: request, authResponse };
};

// PASSWORD CREDENTIALS

const oauth2AuthorizeWithPasswordCredentials = async (request, collectionUid) => {
  const { cachedCredentials } = getPersistedOauth2Credentials(collectionUid);
  if (cachedCredentials?.access_token) {
    console.log('Reusing Stored access token');
    return { credentials: cachedCredentials, authRequest: null, authResponse: null };
  }

  const oAuth = get(request, 'oauth2', {});
  const { username, password, clientId, clientSecret, scope } = oAuth;
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

  request.method = 'POST';
  request.headers['content-type'] = 'application/x-www-form-urlencoded';
  request.data = data;
  request.url = request?.oauth2?.accessTokenUrl;

  const axiosInstance = makeAxiosInstance();
  let authResponse = await axiosInstance(request);
  let credentials = JSON.parse(authResponse.data);
  persistOauth2Credentials(credentials, collectionUid);
  return { credentials, authRequest: request, authResponse };
};
module.exports = {
  oauth2AuthorizeWithAuthorizationCode,
  oauth2AuthorizeWithClientCredentials,
  oauth2AuthorizeWithPasswordCredentials
};
