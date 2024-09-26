import { interpolateUrlPathParams } from 'utils/url';
import brunoCommon from '@usebruno/common';
const { interpolate } = brunoCommon;

const interpolateRequest = (request, combinedVars) => {
  if (!request) return;

  const interpolateParams = (params) => {
    params.forEach((param) => {
      if (param.enabled) {
        param.value = interpolate(param.value, combinedVars);
      }
    });
  };

  const interpolateHeaders = (headers) => {
    const newHeaders = {};
    headers
      .filter((header) => header.enabled)
      .forEach((header) => {
        const interpolatedKey = interpolate(header.key, combinedVars);
        const interpolatedValue = interpolate(header.value, combinedVars);
        newHeaders[interpolatedKey] = interpolatedValue;
      });
    return newHeaders;
  };

  const interpolateAuth = (auth) => {
    if (auth.type === 'oauth2') {
      const { oauth2 } = auth;
      if (oauth2?.grantType) {
        let username, password, scope, clientId, clientSecret;
        switch (oauth2.grantType) {
          case 'password':
            username = interpolate(oauth2.username, combinedVars) || '';
            password = interpolate(oauth2.password, combinedVars) || '';
            clientId = interpolate(oauth2.clientId, combinedVars) || '';
            clientSecret = interpolate(oauth2.clientSecret, combinedVars) || '';
            scope = interpolate(oauth2.scope, combinedVars) || '';
            oauth2.accessTokenUrl = interpolate(oauth2.accessTokenUrl, combinedVars) || '';
            oauth2.username = username;
            oauth2.password = password;
            oauth2.clientId = clientId;
            oauth2.clientSecret = clientSecret;
            oauth2.scope = scope;
            request.data = {
              grant_type: 'password',
              username,
              password,
              client_id: clientId,
              client_secret: clientSecret,
              scope
            };
            break;
          case 'authorization_code':
            oauth2.callbackUrl = interpolate(oauth2.callbackUrl, combinedVars) || '';
            oauth2.authorizationUrl = interpolate(oauth2.authorizationUrl, combinedVars) || '';
            oauth2.accessTokenUrl = interpolate(oauth2.accessTokenUrl, combinedVars) || '';
            oauth2.clientId = interpolate(oauth2.clientId, combinedVars) || '';
            oauth2.clientSecret = interpolate(oauth2.clientSecret, combinedVars) || '';
            oauth2.scope = interpolate(oauth2.scope, combinedVars) || '';
            oauth2.state = interpolate(oauth2.state, combinedVars) || '';
            oauth2.pkce = interpolate(oauth2.pkce, combinedVars) || false;
            break;
          case 'client_credentials':
            clientId = interpolate(oauth2.clientId, combinedVars) || '';
            clientSecret = interpolate(oauth2.clientSecret, combinedVars) || '';
            scope = interpolate(oauth2.scope, combinedVars) || '';
            oauth2.accessTokenUrl = interpolate(oauth2.accessTokenUrl, combinedVars) || '';
            oauth2.clientId = clientId;
            oauth2.clientSecret = clientSecret;
            oauth2.scope = scope;
            request.data = {
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: clientSecret,
              scope
            };
            break;
          default:
            break;
        }
      }
    } else if (auth.type === 'basic') {
      auth.username = interpolate(auth.username, combinedVars);
      auth.password = interpolate(auth.password, combinedVars);
    } else if (auth.type === 'bearer') {
      auth.token = interpolate(auth.token, combinedVars);
    } else if (auth.type === 'wsse') {
      auth.username = interpolate(auth.username, combinedVars);
      auth.password = interpolate(auth.password, combinedVars);
    } else if (auth.type === 'digest') {
      auth.username = interpolate(auth.username, combinedVars);
      auth.password = interpolate(auth.password, combinedVars);
    }
  };

  // Interpolate URL
  if (request.url) {
    request.url = interpolate(request.url, combinedVars);
  }

  // Interpolate path params
  const pathParams = request.params.filter((param) => param.type === 'path');
  if (pathParams.length > 0) {
    interpolateParams(pathParams);
    request.url = interpolateUrlPathParams(request.url, pathParams);
  }

  // Interpolate headers
  if (request.headers) {
    request.headers = interpolateHeaders(request.headers);
  }

  // Interpolate body
  if (request.body) {
    if (request.body.mode === 'graphql-request') {
      request.body.graphql = interpolate(request.body.graphql, combinedVars);
    } else if (['formUrlEncoded', 'multipartForm'].includes(request.body.mode)) {
      interpolateParams(request.body[request.body.mode]);
    } else {
      request.body[request.body.mode] = interpolate(request.body[request.body.mode], combinedVars);
    }
  }

  // Interpolate auth
  if (request.auth) {
    interpolateAuth(request.auth);
  }

  return request;
};

export default interpolateRequest;
