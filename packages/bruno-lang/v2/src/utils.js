// safely parse json
const safeParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const indentString = (str) => {
  if (!str || !str.length) {
    return str || '';
  }

  return str
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n');
};

const outdentString = (str) => {
  if (!str || !str.length) {
    return str || '';
  }

  return str
    .split('\n')
    .map((line) => line.replace(/^  /, ''))
    .join('\n');
};

const mergeOauth2AdditionalParameters = (ast) => {
  let additionalParameters = {};
  const authorizationHeaders = ast?.oauth2_additional_parameters_authorization_headers;
  const authorizationQueryParams = ast?.oauth2_additional_parameters_authorization_queryparams;
  const tokenHeaders = ast?.oauth2_additional_parameters_token_headers;
  const tokenQueryParams = ast?.oauth2_additional_parameters_token_queryparams;
  const tokenBodyValues = ast?.oauth2_additional_parameters_token_bodyvalues;
  const refreshHeaders = ast?.oauth2_additional_parameters_refresh_headers;
  const refreshQueryParams = ast?.oauth2_additional_parameters_refresh_queryparams;
  const refreshBodyValues = ast?.oauth2_additional_parameters_refresh_bodyvalues;

  if (ast?.auth?.oauth2?.grantType == 'authorization_code') {
    if (authorizationHeaders?.length || authorizationQueryParams?.length) {
      additionalParameters['authorization'] = []
    }
    if (authorizationHeaders?.length) {
      additionalParameters['authorization'] = [
        ...authorizationHeaders?.map(_ => ({ ..._, sendIn: 'headers' }))
      ]
    }
    if (authorizationQueryParams?.length) {
      additionalParameters['authorization'] = [
        ...additionalParameters['authorization'] || [],
        ...authorizationQueryParams?.map(_ => ({ ..._, sendIn: 'queryparams' }))
      ]
    }
  }
  
  if (tokenHeaders?.length || tokenQueryParams?.length || tokenBodyValues?.length) {
    additionalParameters['token'] = []
  }
  if (tokenHeaders?.length) {
    additionalParameters['token'] = [
      ...tokenHeaders?.map(_ => ({ ..._, sendIn: 'headers' }))
    ]
  }
  if (tokenQueryParams?.length) {
    additionalParameters['token'] = [
      ...additionalParameters['token'] || [],
      ...tokenQueryParams?.map(_ => ({ ..._, sendIn: 'queryparams' }))
    ]
  }
  if (tokenBodyValues?.length) {
    additionalParameters['token'] = [
      ...additionalParameters['token'] || [],
      ...tokenBodyValues?.map(_ => ({ ..._, sendIn: 'body' }))
    ]
  }

  if (refreshHeaders?.length || refreshQueryParams?.length || refreshBodyValues?.length) {
    additionalParameters['refresh'] = []
  }
  if (refreshHeaders?.length) {
    additionalParameters['refresh'] = [
      ...refreshHeaders?.map(_ => ({ ..._, sendIn: 'headers' }))
    ]
  }
  if (refreshQueryParams?.length) {
    additionalParameters['refresh'] = [
      ...additionalParameters['refresh'] || [],
      ...refreshQueryParams?.map(_ => ({ ..._, sendIn: 'queryparams' }))
    ]
  }
  if (refreshBodyValues?.length) {
    additionalParameters['refresh'] = [
      ...additionalParameters['refresh'] || [],
      ...refreshBodyValues?.map(_ => ({ ..._, sendIn: 'body' }))
    ]
  }

  if(ast?.auth?.oauth2 && Object.keys(additionalParameters)?.length) {
    ast.auth.oauth2.additionalParameters = additionalParameters;
  }
  
  return ast;
}

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  mergeOauth2AdditionalParameters
};
