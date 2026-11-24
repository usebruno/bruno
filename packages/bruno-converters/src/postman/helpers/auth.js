import { ensureString } from './values';

export const emptyAuth = (mode) => ({
  mode,
  basic: null,
  bearer: null,
  awsv4: null,
  apikey: null,
  oauth1: null,
  oauth2: null,
  digest: null,
  ntlm: null
});

const ensureMaxBodySize = (value) => {
  if (value == null || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

const OAUTH2_GRANT_TYPES = {
  authorization_code_with_pkce: 'authorization_code',
  authorization_code: 'authorization_code',
  client_credentials: 'client_credentials',
  password_credentials: 'password',
  implicit: 'implicit'
};

const OAUTH2_SEND_AS_TO_SEND_IN = {
  request_header: 'headers',
  request_url: 'queryparams',
  request_body: 'body'
};

const toOAuth2AdditionalParams = (params) => (Array.isArray(params) ? params : []).map((param) => ({
  name: ensureString(param.key),
  value: ensureString(param.value),
  sendIn: OAUTH2_SEND_AS_TO_SEND_IN[param.send_as] || 'headers',
  enabled: param.enabled !== false
}));

const toBrunoOAuth2 = (values) => {
  const valueOf = (key) => ensureString(values[key]);
  // Postman omits `grant_type` until it is explicitly picked, leaving its default: authorization code.
  const postmanGrantType = valueOf('grant_type') || 'authorization_code';
  const grantType = OAUTH2_GRANT_TYPES[postmanGrantType] || 'client_credentials';

  const additionalParameters = {};
  if (Array.isArray(values.authRequestParams)) {
    additionalParameters.authorization = toOAuth2AdditionalParams(values.authRequestParams);
  }
  if (Array.isArray(values.tokenRequestParams)) {
    additionalParameters.token = toOAuth2AdditionalParams(values.tokenRequestParams);
  }
  if (Array.isArray(values.refreshRequestParams)) {
    additionalParameters.refresh = toOAuth2AdditionalParams(values.refreshRequestParams);
  }
  const hasAdditionalParameters = Object.keys(additionalParameters).length > 0;
  // The schema requires an `authorization` array for the authorization_code grant whenever
  // additional params are attached.
  if (hasAdditionalParameters && grantType === 'authorization_code' && !additionalParameters.authorization) {
    additionalParameters.authorization = [];
  }

  // Postman defaults an unspecified token placement to the header
  const tokenPlacement = valueOf('addTokenTo') === 'queryParams' ? 'url' : 'header';
  const tokenHeaderPrefix = tokenPlacement === 'header' && values.headerPrefix == null ? 'Bearer' : valueOf('headerPrefix');

  const oauth2 = {
    ...(hasAdditionalParameters ? { additionalParameters } : {}),
    grantType,
    accessTokenUrl: valueOf('accessTokenUrl'),
    refreshTokenUrl: valueOf('refreshTokenUrl'),
    clientId: valueOf('clientId'),
    clientSecret: valueOf('clientSecret'),
    scope: valueOf('scope'),
    state: valueOf('state'),
    tokenPlacement,
    tokenHeaderPrefix,
    tokenQueryKey: 'access_token',
    credentialsPlacement: valueOf('client_authentication') === 'body' ? 'body' : 'basic_auth_header',
    credentialsId: valueOf('tokenName')
  };

  switch (postmanGrantType) {
    case 'authorization_code':
    case 'authorization_code_with_pkce':
      return {
        ...oauth2,
        authorizationUrl: valueOf('authUrl'),
        callbackUrl: valueOf('redirect_uri'),
        pkce: postmanGrantType === 'authorization_code_with_pkce'
      };
    case 'password_credentials':
      return {
        ...oauth2,
        username: valueOf('username'),
        password: valueOf('password')
      };
    case 'implicit':
      return {
        ...oauth2,
        authorizationUrl: valueOf('authUrl'),
        callbackUrl: valueOf('redirect_uri')
      };
    default:
      return oauth2;
  }
};

const AUTH_MAPPERS = {
  noauth: () => ({ mode: 'none' }),
  basic: (values) => ({
    mode: 'basic',
    basic: {
      username: ensureString(values.username),
      password: ensureString(values.password)
    }
  }),
  bearer: (values) => ({
    mode: 'bearer',
    bearer: {
      token: ensureString(values.token)
    }
  }),
  awsv4: (values) => ({
    mode: 'awsv4',
    awsv4: {
      accessKeyId: ensureString(values.accessKey),
      secretAccessKey: ensureString(values.secretKey),
      sessionToken: ensureString(values.sessionToken),
      service: ensureString(values.service),
      region: ensureString(values.region),
      profileName: ''
    }
  }),
  apikey: (values) => ({
    mode: 'apikey',
    apikey: {
      key: ensureString(values.key),
      value: ensureString(values.value),
      placement: values.in === 'query' ? 'queryparams' : 'header'
    }
  }),
  digest: (values) => ({
    mode: 'digest',
    digest: {
      username: ensureString(values.username),
      password: ensureString(values.password)
    }
  }),
  edgegrid: (values) => ({
    mode: 'akamai-edgegrid',
    akamaiEdgegrid: {
      accessToken: ensureString(values.accessToken),
      clientToken: ensureString(values.clientToken),
      clientSecret: ensureString(values.clientSecret),
      nonce: ensureString(values.nonce),
      timestamp: ensureString(values.timestamp),
      baseURL: ensureString(values.baseURL),
      headersToSign: ensureString(values.headersToSign),
      maxBodySize: ensureMaxBodySize(values.maxBodySize)
    }
  }),
  // Postman's `workstation` field has no Bruno equivalent, so it is dropped.
  ntlm: (values) => ({
    mode: 'ntlm',
    ntlm: {
      username: ensureString(values.username),
      password: ensureString(values.password),
      domain: ensureString(values.domain)
    }
  }),
  oauth1: (values) => ({
    mode: 'oauth1',
    oauth1: {
      consumerKey: ensureString(values.consumerKey),
      consumerSecret: ensureString(values.consumerSecret),
      accessToken: ensureString(values.token),
      accessTokenSecret: ensureString(values.tokenSecret),
      callbackUrl: ensureString(values.callback, null),
      verifier: ensureString(values.verifier, null),
      signatureMethod: ensureString(values.signatureMethod, 'HMAC-SHA1'),
      privateKey: ensureString(values.privateKey, null),
      privateKeyType: 'text',
      timestamp: ensureString(values.timestamp, null),
      nonce: ensureString(values.nonce, null),
      version: ensureString(values.version, '1.0'),
      realm: ensureString(values.realm, null),
      placement: values.addParamsToHeader === false ? 'query' : 'header',
      includeBodyHash: values.includeBodyHash || false
    }
  }),
  oauth2: (values) => ({
    mode: 'oauth2',
    oauth2: toBrunoOAuth2(values)
  })
};

export const isSupportedAuthType = (type) => Object.hasOwn(AUTH_MAPPERS, type);

// Unsupported types yield `mode: 'none'`; check `isSupportedAuthType` first to report them.
export const toBrunoAuth = (type, values = {}) => {
  const mapper = isSupportedAuthType(type) ? AUTH_MAPPERS[type] : null;
  return {
    ...emptyAuth('none'),
    ...(mapper ? mapper(values) : {})
  };
};
