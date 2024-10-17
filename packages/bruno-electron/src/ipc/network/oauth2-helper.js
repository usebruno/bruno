const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const { authorizeUserInWindow } = require('./authorize-user-in-window');
const Oauth2Store = require('../../store/oauth2');

const encodeClientCredentials = (clientId, clientSecret) => {
  return 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');
};

const generateCodeVerifier = () => {
  return crypto.randomBytes(22).toString('hex');
};

const generateCodeChallenge = (codeVerifier) => {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  const base64Hash = hash.digest('base64');
  return base64Hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// AUTHORIZATION CODE

const resolveOAuth2AuthorizationCodeAccessToken = async (request, collectionUid) => {
  let codeVerifier = generateCodeVerifier();
  let codeChallenge = generateCodeChallenge(codeVerifier);

  let requestCopy = cloneDeep(request);
  const { authorizationCode } = await getOAuth2AuthorizationCode(requestCopy, codeChallenge, collectionUid);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, clientSecretMethod, callbackUrl, pkce } = oAuth;

  const accessTokenRequestHeaders = request.headers;
  accessTokenRequestHeaders['content-type'] = 'application/x-www-form-urlencoded';
  if (clientSecretMethod === 'client_credentials_basic') {
    accessTokenRequestHeaders['authorization'] = encodeClientCredentials(clientId, clientSecret);
  }

  const accessTokenRequestData = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: callbackUrl
  };

  if (clientSecretMethod === 'client_credentials_post') {
    accessTokenRequestData['client_id'] = clientId;
    accessTokenRequestData['client_secret'] = clientSecret;
  }

  if (pkce) {
    accessTokenRequestData['code_verifier'] = codeVerifier;
  }

  const accessTokenRequestUrl = requestCopy?.oauth2?.accessTokenUrl;
  return {
    accessTokenRequestHeaders,
    accessTokenRequestData,
    accessTokenRequestUrl
  };
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
      const oauth2Store = new Oauth2Store();
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

const transformClientCredentialsRequest = async (request) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, clientSecretMethod, scope } = oAuth;

  const accessTokenRequestHeaders = request.headers;
  accessTokenRequestHeaders['content-type'] = 'application/x-www-form-urlencoded';
  if (clientSecretMethod === 'client_credentials_basic') {
    accessTokenRequestHeaders['authorization'] = encodeClientCredentials(clientId, clientSecret);
  }

  const accessTokenRequestData = {
    grant_type: 'client_credentials'
  };
  if (scope) {
    accessTokenRequestData.scope = scope;
  }
  if (clientSecretMethod === 'client_credentials_post') {
    accessTokenRequestData['client_id'] = clientId;
    accessTokenRequestData['client_secret'] = clientSecret;
  }

  const accessTokenRequestUrl = requestCopy?.oauth2?.accessTokenUrl;
  return {
    accessTokenRequestHeaders,
    accessTokenRequestData,
    accessTokenRequestUrl
  };
};

// PASSWORD CREDENTIALS

const transformPasswordCredentialsRequest = async (request) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { username, password, clientId, clientSecret, clientSecretMethod, scope } = oAuth;

  const accessTokenRequestHeaders = request.headers;
  accessTokenRequestHeaders['content-type'] = 'application/x-www-form-urlencoded';
  if (clientSecretMethod === 'client_credentials_basic') {
    accessTokenRequestHeaders['authorization'] = encodeClientCredentials(clientId, clientSecret);
  }

  const accessTokenRequestData = {
    grant_type: 'password',
    username,
    password
  };
  if (scope) {
    accessTokenRequestData.scope = scope;
  }
  if (clientSecretMethod === 'client_credentials_post') {
    accessTokenRequestData['client_id'] = clientId;
    if(clientSecret) {
      accessTokenRequestData['client_secret'] = clientSecret;
    }
  }

  const accessTokenRequestUrl = requestCopy?.oauth2?.accessTokenUrl;
  return {
    accessTokenRequestHeaders,
    accessTokenRequestData,
    accessTokenRequestUrl
  };
};

module.exports = {
  resolveOAuth2AuthorizationCodeAccessToken,
  getOAuth2AuthorizationCode,
  transformClientCredentialsRequest,
  transformPasswordCredentialsRequest
};
