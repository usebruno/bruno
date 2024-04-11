const { get, cloneDeep } = require('lodash');
const crypto = require('crypto');
const { authorizeUserInWindow, authorizeUserInWindowImplicit } = require('./authorize-user-in-window');
const Oauth2Store = require('../../store/oauth2');
const { makeAxiosInstance } = require('./axios-instance');

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

const getOAuth2AuthorizationCodeAccessToken = async (request, collectionUid) => {
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

  request.method = 'POST';
  request.headers['content-type'] = 'application/x-www-form-urlencoded';
  request.data = data;
  request.url = url;

  const axiosInstance = makeAxiosInstance();
  let response = await axiosInstance(request);
  let accessToken = JSON.parse(response.data).access_token;
  return { accessToken };
};

const getOAuth2AuthorizationCode = (request, codeChallenge, collectionUid) => {
  return new Promise(async (resolve, reject) => {
    const { oauth2 } = request;
    const { callbackUrl, clientId, authorizationUrl, scope, pkce } = oauth2;

    let oauth2QueryParams =
      (authorizationUrl.indexOf('?') > -1 ? '&' : '?') + `client_id=${clientId}&response_type=code`;
    if (callbackUrl) {
      oauth2QueryParams += `&redirect_uri=${callbackUrl}`;
    }
    if (scope) {
      oauth2QueryParams += `&scope=${scope}`;
    }
    if (pkce) {
      oauth2QueryParams += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    }
    const authorizationUrlWithQueryParams = authorizationUrl + oauth2QueryParams;
    try {
      const oauth2Store = new Oauth2Store();
      const { authorizationCode } = await authorizeUserInWindow({
        authorizeUrl: authorizationUrlWithQueryParams,
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

const getOAuth2ClientCredentialsAccessToken = async (request) => {
  let requestCopy = cloneDeep(request);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, scope } = oAuth;
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope
  };
  request.method = 'POST';
  request.headers['content-type'] = 'application/x-www-form-urlencoded';
  request.data = data;
  request.url = requestCopy?.oauth2?.accessTokenUrl;

  const axiosInstance = makeAxiosInstance();
  let response = await axiosInstance(request);
  let accessToken = JSON.parse(response.data).access_token;

  return { accessToken };
};

// PASSWORD CREDENTIALS

const getOAuth2PasswordCredentialsAccessToken = async (request) => {
  const oAuth = get(request, 'oauth2', {});
  const { username, password, clientId, clientSecret, scope } = oAuth;
  const data = {
    grant_type: 'password',
    username,
    password,
    client_id: clientId,
    client_secret: clientSecret,
    scope
  };
  request.method = 'POST';
  request.headers['content-type'] = 'application/x-www-form-urlencoded';
  request.data = data;
  request.url = request?.oauth2?.accessTokenUrl;

  const axiosInstance = makeAxiosInstance();
  let response = await axiosInstance(request);
  let accessToken = JSON.parse(response.data).access_token;
  return { accessToken };
};

// IMPLICIT

const getOAuth2ImplicitAccessToken = async (request, collectionUid) => {
  return new Promise(async (resolve, reject) => {
    const { oauth2 } = request;
    const { callbackUrl, authorizationUrl, clientId, scope } = oauth2;
    let oauth2QueryParams =
      (authorizationUrl.indexOf('?') > -1 ? '&' : '?') + `client_id=${clientId}&response_type=token`;
    if (callbackUrl) {
      oauth2QueryParams += `&redirect_uri=${callbackUrl}`;
    }
    if (scope) {
      oauth2QueryParams += `&scope=${scope}`;
    }
    const authorizationUrlWithQueryParams = authorizationUrl + oauth2QueryParams;
    try {
      const oauth2Store = new Oauth2Store();
      const { accessToken } = await authorizeUserInWindowImplicit({
        authorizeUrl: authorizationUrlWithQueryParams,
        session: oauth2Store.getSessionIdOfCollection(collectionUid)
      });
      resolve({ accessToken });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  getOAuth2AuthorizationCodeAccessToken,
  getOAuth2ClientCredentialsAccessToken,
  getOAuth2PasswordCredentialsAccessToken,
  getOAuth2ImplicitAccessToken
};
