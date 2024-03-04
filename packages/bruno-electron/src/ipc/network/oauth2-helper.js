const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const { authorizeUserInWindow } = require('./authorize-user-in-window');
const Oauth2Store = require('../../store/oauth2');

const generateCodeVerifier = () => {
  return crypto.randomBytes(16).toString('hex');
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
  const { clientId, clientSecret, callbackUrl, scope, pkce } = oAuth;
  const data = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: callbackUrl,
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope
  };
  if (pkce) {
    data['code_verifier'] = codeVerifier;
  }

  const url = requestCopy?.oauth2?.accessTokenUrl;
  return {
    data,
    url
  };
};

const getOAuth2AuthorizationCode = (request, codeChallenge, collectionUid) => {
  return new Promise(async (resolve, reject) => {
    const { oauth2 } = request;
    const { callbackUrl, clientId, authorizationUrl, scope, pkce } = oauth2;

    let oauth2QueryParams =
      (authorizationUrl.indexOf('?') > -1 ? '&' : '?') +
      `client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}`;
    if (pkce) {
      oauth2QueryParams += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    }
    const authorizationUrlWithQueryParams = authorizationUrl + oauth2QueryParams;
    try {
      const oauth2Store = Oauth2Store(collectionUid);
      const { authorizationCode } = await authorizeUserInWindow({
        authorizeUrl: authorizationUrlWithQueryParams,
        callbackUrl,
        session: oauth2Store.getSession()
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
  const { clientId, clientSecret, scope } = oAuth;
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope
  };
  const url = requestCopy?.oauth2?.accessTokenUrl;
  return {
    data,
    url
  };
};

// PASSWORD CREDENTIALS

const transformPasswordCredentialsRequest = async (request) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { username, password, scope } = oAuth;
  const data = {
    grant_type: 'password',
    username,
    password,
    scope
  };
  const url = requestCopy?.oauth2?.accessTokenUrl;
  return {
    data,
    url
  };
};

module.exports = {
  resolveOAuth2AuthorizationCodeAccessToken,
  getOAuth2AuthorizationCode,
  transformClientCredentialsRequest,
  transformPasswordCredentialsRequest
};
