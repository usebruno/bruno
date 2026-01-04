import { get } from 'lodash';
import { createWsseHeader } from '../auth/wsse-auth';

export interface AuthConfig {
  mode?: string;
  awsv4?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    service?: string;
    region?: string;
    profileName?: string;
  };
  basic?: {
    username?: string;
    password?: string;
  };
  bearer?: {
    token?: string;
  };
  digest?: {
    username?: string;
    password?: string;
  };
  ntlm?: {
    username?: string;
    password?: string;
    domain?: string;
  };
  wsse?: {
    username?: string;
    password?: string;
  };
  apikey?: {
    key?: string;
    value?: string;
    placement?: 'header' | 'queryparams';
  };
  oauth2?: OAuth2Config;
}

export interface OAuth2Config {
  grantType?: string;
  accessTokenUrl?: string;
  refreshTokenUrl?: string;
  authorizationUrl?: string;
  callbackUrl?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  scope?: string;
  state?: string;
  pkce?: boolean;
  credentialsPlacement?: string;
  credentialsId?: string;
  tokenPlacement?: string;
  tokenHeaderPrefix?: string;
  tokenQueryKey?: string;
  autoFetchToken?: boolean;
  autoRefreshToken?: boolean;
  additionalParameters?: {
    authorization?: Array<{ name: string; value: string; enabled?: boolean }>;
    token?: Array<{ name: string; value: string; enabled?: boolean }>;
    refresh?: Array<{ name: string; value: string; enabled?: boolean }>;
  };
}

export interface PreparedAuthRequest {
  headers: Record<string, any>;
  awsv4config?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    service?: string;
    region?: string;
    profileName?: string;
  };
  basicAuth?: {
    username?: string;
    password?: string;
  };
  digestConfig?: {
    username?: string;
    password?: string;
  };
  ntlmConfig?: {
    username?: string;
    password?: string;
    domain?: string;
  };
  oauth2?: OAuth2Config;
  apiKeyAuthValueForQueryParams?: {
    key?: string;
    value?: string;
  };
}

const buildOAuth2Config = (auth: any, grantType: string, basePath: string): OAuth2Config => {
  const baseConfig: OAuth2Config = {
    grantType,
    credentialsId: get(auth, `${basePath}.credentialsId`),
    tokenPlacement: get(auth, `${basePath}.tokenPlacement`),
    tokenHeaderPrefix: get(auth, `${basePath}.tokenHeaderPrefix`),
    tokenQueryKey: get(auth, `${basePath}.tokenQueryKey`),
    autoFetchToken: get(auth, `${basePath}.autoFetchToken`),
    additionalParameters: get(auth, `${basePath}.additionalParameters`, { authorization: [], token: [], refresh: [] })
  };

  switch (grantType) {
    case 'password':
      return {
        ...baseConfig,
        accessTokenUrl: get(auth, `${basePath}.accessTokenUrl`),
        refreshTokenUrl: get(auth, `${basePath}.refreshTokenUrl`),
        username: get(auth, `${basePath}.username`),
        password: get(auth, `${basePath}.password`),
        clientId: get(auth, `${basePath}.clientId`),
        clientSecret: get(auth, `${basePath}.clientSecret`),
        scope: get(auth, `${basePath}.scope`),
        credentialsPlacement: get(auth, `${basePath}.credentialsPlacement`),
        autoRefreshToken: get(auth, `${basePath}.autoRefreshToken`)
      };
    case 'authorization_code':
      return {
        ...baseConfig,
        callbackUrl: get(auth, `${basePath}.callbackUrl`),
        authorizationUrl: get(auth, `${basePath}.authorizationUrl`),
        accessTokenUrl: get(auth, `${basePath}.accessTokenUrl`),
        refreshTokenUrl: get(auth, `${basePath}.refreshTokenUrl`),
        clientId: get(auth, `${basePath}.clientId`),
        clientSecret: get(auth, `${basePath}.clientSecret`),
        scope: get(auth, `${basePath}.scope`),
        state: get(auth, `${basePath}.state`),
        pkce: get(auth, `${basePath}.pkce`),
        credentialsPlacement: get(auth, `${basePath}.credentialsPlacement`),
        autoRefreshToken: get(auth, `${basePath}.autoRefreshToken`)
      };
    case 'implicit':
      return {
        ...baseConfig,
        callbackUrl: get(auth, `${basePath}.callbackUrl`),
        authorizationUrl: get(auth, `${basePath}.authorizationUrl`),
        clientId: get(auth, `${basePath}.clientId`),
        scope: get(auth, `${basePath}.scope`),
        state: get(auth, `${basePath}.state`)
      };
    case 'client_credentials':
      return {
        ...baseConfig,
        accessTokenUrl: get(auth, `${basePath}.accessTokenUrl`),
        refreshTokenUrl: get(auth, `${basePath}.refreshTokenUrl`),
        clientId: get(auth, `${basePath}.clientId`),
        clientSecret: get(auth, `${basePath}.clientSecret`),
        scope: get(auth, `${basePath}.scope`),
        credentialsPlacement: get(auth, `${basePath}.credentialsPlacement`),
        autoRefreshToken: get(auth, `${basePath}.autoRefreshToken`)
      };
    default:
      return baseConfig;
  }
};

const applyAuthMode = (
  axiosRequest: PreparedAuthRequest,
  authConfig: AuthConfig,
  basePath: string
): void => {
  const mode = authConfig.mode;

  switch (mode) {
    case 'awsv4':
      axiosRequest.awsv4config = {
        accessKeyId: get(authConfig, 'awsv4.accessKeyId'),
        secretAccessKey: get(authConfig, 'awsv4.secretAccessKey'),
        sessionToken: get(authConfig, 'awsv4.sessionToken'),
        service: get(authConfig, 'awsv4.service'),
        region: get(authConfig, 'awsv4.region'),
        profileName: get(authConfig, 'awsv4.profileName')
      };
      break;

    case 'basic':
      axiosRequest.basicAuth = {
        username: get(authConfig, 'basic.username'),
        password: get(authConfig, 'basic.password')
      };
      break;

    case 'bearer':
      axiosRequest.headers['Authorization'] = `Bearer ${get(authConfig, 'bearer.token', '')}`;
      break;

    case 'digest':
      axiosRequest.digestConfig = {
        username: get(authConfig, 'digest.username'),
        password: get(authConfig, 'digest.password')
      };
      break;

    case 'ntlm':
      axiosRequest.ntlmConfig = {
        username: get(authConfig, 'ntlm.username'),
        password: get(authConfig, 'ntlm.password'),
        domain: get(authConfig, 'ntlm.domain')
      };
      break;

    case 'wsse': {
      const username = get(authConfig, 'wsse.username', '');
      const password = get(authConfig, 'wsse.password', '');
      axiosRequest.headers['X-WSSE'] = createWsseHeader(username, password);
      break;
    }

    case 'apikey': {
      const apiKeyAuth = authConfig.apikey;
      if (apiKeyAuth?.key && apiKeyAuth.key.length > 0) {
        if (apiKeyAuth.placement === 'header') {
          axiosRequest.headers[apiKeyAuth.key] = apiKeyAuth.value;
        } else if (apiKeyAuth.placement === 'queryparams') {
          axiosRequest.apiKeyAuthValueForQueryParams = {
            key: apiKeyAuth.key,
            value: apiKeyAuth.value
          };
        }
      }
      break;
    }

    case 'oauth2': {
      const grantType = get(authConfig, 'oauth2.grantType');
      if (grantType) {
        axiosRequest.oauth2 = buildOAuth2Config({ [basePath]: authConfig.oauth2 }, grantType, basePath);
      }
      break;
    }
  }
};

export interface SetAuthHeadersOptions {
  request: {
    auth?: AuthConfig;
  };
  collectionRoot?: {
    request?: {
      auth?: AuthConfig;
    };
  };
}

export const setAuthHeaders = <T extends PreparedAuthRequest>(
  axiosRequest: T,
  options: SetAuthHeadersOptions
): T => {
  const { request, collectionRoot } = options;
  const collectionAuth = get(collectionRoot, 'request.auth') as AuthConfig | undefined;

  if (collectionAuth && request.auth?.mode === 'inherit') {
    applyAuthMode(axiosRequest, collectionAuth, 'oauth2');
  }

  if (request.auth && request.auth.mode !== 'inherit') {
    applyAuthMode(axiosRequest, request.auth, 'oauth2');
  }

  return axiosRequest;
};
