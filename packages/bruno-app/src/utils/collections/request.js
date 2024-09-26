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
      const oauth2Fields = [
        'username',
        'password',
        'clientId',
        'clientSecret',
        'scope',
        'accessTokenUrl',
        'callbackUrl',
        'authorizationUrl',
        'state',
        'pkce'
      ];
      oauth2Fields.forEach((field) => {
        if (oauth2[field]) {
          oauth2[field] = interpolate(oauth2[field], combinedVars);
        }
      });
    } else if (auth.type === 'basic') {
      auth.username = interpolate(auth.username, combinedVars);
      auth.password = interpolate(auth.password, combinedVars);
    } else if (auth.type === 'bearer') {
      auth.token = interpolate(auth.token, combinedVars);
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
