const { get, cloneDeep } = require('lodash');
const { authorizeUserInWindow } = require('./authorize-user-in-window');

const resolveOAuth2AuthorizationCodecessToken = async (request) => {
  let requestCopy = cloneDeep(request);
  const authorization_code = await getOAuth2AuthorizationCode(requestCopy);
  const oAuth = get(requestCopy, 'oauth2', {});
  const { clientId, clientSecret, callbackUrl, scope } = oAuth;
  const data = {
    grant_type: 'authorization_code',
    code: authorization_code,
    redirect_uri: callbackUrl,
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope
  };
  const url = requestCopy?.oauth2?.accessTokenUrl;
  return {
    data,
    url
  };
};

const getOAuth2AuthorizationCode = (request) => {
  return new Promise(async (resolve, reject) => {
    const { oauth2 } = request;
    const { callbackUrl, clientId, authorizationUrl, scope } = oauth2;
    const authorizationUrlWithQueryParams = `${authorizationUrl}?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}`;
    try {
      const code = await authorizeUserInWindow({ authorizeUrl: authorizationUrlWithQueryParams, callbackUrl });
      resolve(code);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  resolveOAuth2AuthorizationCodecessToken,
  getOAuth2AuthorizationCode
};
