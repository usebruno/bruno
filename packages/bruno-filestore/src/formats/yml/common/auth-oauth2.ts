import type {
  AuthOAuth2,
  OAuth2AdditionalParameter,
  OAuth2AuthorizationCodeFlow,
  OAuth2ClientCredentials,
  OAuth2ClientCredentialsFlow,
  OAuth2ImplicitFlow,
  OAuth2PKCE,
  OAuth2ResourceOwner,
  OAuth2ResourceOwnerPasswordFlow,
  OAuth2Settings,
  OAuth2TokenConfig
} from '@opencollection/types/common/auth';
import type {
  OAuth2 as BrunoOAuth2,
  OAuthAdditionalParameter as BrunoOAuthAdditionalParameter
} from '@usebruno/schema-types/common/auth';
import { isString, isNonEmptyString } from '../../../utils';

const normalizeBoolean = (value?: boolean | null): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const mapSendIn = (sendIn?: string | null): OAuth2AdditionalParameter['placement'] | undefined => {
  if (!isString(sendIn)) {
    return undefined;
  }

  switch (sendIn.trim().toLowerCase()) {
    case 'headers':
      return 'header';
    case 'queryparams':
      return 'query';
    case 'body':
      return 'body';
    default:
      return undefined;
  }
};

const mapAdditionalParameters = (params?: BrunoOAuthAdditionalParameter[] | null): OAuth2AdditionalParameter[] | undefined => {
  if (!Array.isArray(params) || params.length === 0) {
    return undefined;
  }

  const mapped = params
    .filter((param) => param && isNonEmptyString(param.name))
    .map((param) => {
      const placement = mapSendIn(param!.sendIn);
      if (!placement) {
        return undefined;
      }

      const mappedParam: OAuth2AdditionalParameter = {
        name: param!.name!.trim(),
        placement
      };

      isNonEmptyString(param!.value) && (mappedParam.value = param.value);

      return mappedParam;
    })
    .filter((param): param is OAuth2AdditionalParameter => Boolean(param));

  return mapped.length > 0 ? mapped : undefined;
};

// Map Bruno's tokenEndpointAuthMethod (RFC 7591 §2 / OIDC Core §9) to OpenCollection's placement.
// OpenCollection only models client_secret_basic / client_secret_post; the JWT-bearer (and mTLS,
// and `none`) methods have no OpenCollection equivalent and are carried in the x-bruno-oauth2
// extension instead. Returning undefined here leaves `credentials.placement` unset rather than
// writing a misleading "body" value that an external OpenCollection reader would interpret as
// client_secret_post.
const placementForMethod = (method?: string | null): 'basic_auth_header' | 'body' | undefined => {
  if (method === 'client_secret_basic') return 'basic_auth_header';
  if (method === 'client_secret_post') return 'body';
  return undefined;
};

const methodForPlacement = (placement?: string | null): 'client_secret_basic' | 'client_secret_post' | undefined => {
  if (placement === 'basic_auth_header') return 'client_secret_basic';
  if (placement === 'body') return 'client_secret_post';
  return undefined;
};

const buildClientCredentials = (oauth: BrunoOAuth2): OAuth2ClientCredentials | undefined => {
  const credentials: OAuth2ClientCredentials = {};

  isNonEmptyString(oauth.clientId) && (credentials.clientId = oauth.clientId);
  isNonEmptyString(oauth.clientSecret) && (credentials.clientSecret = oauth.clientSecret);
  const placement = placementForMethod(oauth.tokenEndpointAuthMethod) ?? oauth.credentialsPlacement;
  isNonEmptyString(placement) && (credentials.placement = placement);

  return Object.keys(credentials).length > 0 ? credentials : undefined;
};

const buildResourceOwner = (oauth: BrunoOAuth2): OAuth2ResourceOwner | undefined => {
  const resourceOwner: OAuth2ResourceOwner = {};

  isNonEmptyString(oauth.username) && (resourceOwner.username = oauth.username);
  isNonEmptyString(oauth.password) && (resourceOwner.password = oauth.password);

  return Object.keys(resourceOwner).length > 0 ? resourceOwner : undefined;
};

const buildPkce = (pkce?: boolean | null): OAuth2PKCE | undefined => {
  if (pkce === null || pkce === undefined) {
    return undefined;
  }

  // If pkce is false, set disabled: true; if true, return empty object (enabled by default)
  return pkce ? {} : { disabled: true };
};

const buildTokenConfig = (oauth: BrunoOAuth2): OAuth2TokenConfig | undefined => {
  const tokenConfig: OAuth2TokenConfig = {};

  isNonEmptyString(oauth.credentialsId) && (tokenConfig.id = oauth.credentialsId);

  if (!isNonEmptyString(oauth.tokenPlacement)) {
    // default to header
    tokenConfig.placement = { header: '' };
  }

  if (oauth.tokenPlacement === 'header') {
    tokenConfig.placement = {
      header: oauth.tokenHeaderPrefix as string
    };
  }

  if (oauth.tokenPlacement === 'url') {
    tokenConfig.placement = {
      query: oauth.tokenQueryKey as string
    };
  }

  tokenConfig.source = oauth.tokenSource || 'access_token';

  return Object.keys(tokenConfig).length > 0 ? tokenConfig : undefined;
};

const buildSettings = (oauth: BrunoOAuth2): OAuth2Settings | undefined => {
  const autoFetchToken = normalizeBoolean(oauth.autoFetchToken);
  const autoRefreshToken = normalizeBoolean(oauth.autoRefreshToken);

  const settings: OAuth2Settings = {};
  if (autoFetchToken !== undefined) settings.autoFetchToken = autoFetchToken;
  if (autoRefreshToken !== undefined) settings.autoRefreshToken = autoRefreshToken;

  return Object.keys(settings).length > 0 ? settings : undefined;
};

const buildClientCredentialsFlow = (oauth: BrunoOAuth2): OAuth2ClientCredentialsFlow => {
  const flow: OAuth2ClientCredentialsFlow = {
    type: 'oauth2',
    flow: 'client_credentials'
  };

  isNonEmptyString(oauth.accessTokenUrl) && (flow.accessTokenUrl = oauth.accessTokenUrl);
  isNonEmptyString(oauth.refreshTokenUrl) && (flow.refreshTokenUrl = oauth.refreshTokenUrl);

  const credentials = buildClientCredentials(oauth);
  if (credentials) flow.credentials = credentials;

  isNonEmptyString(oauth.scope) && (flow.scope = oauth.scope);

  const accessTokenRequest = mapAdditionalParameters(oauth.additionalParameters?.token);
  const refreshTokenRequest = mapAdditionalParameters(oauth.additionalParameters?.refresh);

  if (accessTokenRequest || refreshTokenRequest) {
    flow.additionalParameters = {};
    if (accessTokenRequest) {
      flow.additionalParameters.accessTokenRequest = accessTokenRequest;
    }
    if (refreshTokenRequest) {
      flow.additionalParameters.refreshTokenRequest = refreshTokenRequest;
    }
  }

  const tokenConfig = buildTokenConfig(oauth);
  if (tokenConfig) flow.tokenConfig = tokenConfig;

  const settings = buildSettings(oauth);
  if (settings) flow.settings = settings;

  return flow;
};

const buildResourceOwnerPasswordFlow = (oauth: BrunoOAuth2): OAuth2ResourceOwnerPasswordFlow => {
  const flow: OAuth2ResourceOwnerPasswordFlow = {
    type: 'oauth2',
    flow: 'resource_owner_password_credentials'
  };

  isNonEmptyString(oauth.accessTokenUrl) && (flow.accessTokenUrl = oauth.accessTokenUrl);
  isNonEmptyString(oauth.refreshTokenUrl) && (flow.refreshTokenUrl = oauth.refreshTokenUrl);

  const credentials = buildClientCredentials(oauth);
  if (credentials) flow.credentials = credentials;

  const resourceOwner = buildResourceOwner(oauth);
  if (resourceOwner) flow.resourceOwner = resourceOwner;

  isNonEmptyString(oauth.scope) && (flow.scope = oauth.scope);

  const accessTokenRequest = mapAdditionalParameters(oauth.additionalParameters?.token);
  const refreshTokenRequest = mapAdditionalParameters(oauth.additionalParameters?.refresh);

  if (accessTokenRequest || refreshTokenRequest) {
    flow.additionalParameters = {};
    if (accessTokenRequest) {
      flow.additionalParameters.accessTokenRequest = accessTokenRequest;
    }
    if (refreshTokenRequest) {
      flow.additionalParameters.refreshTokenRequest = refreshTokenRequest;
    }
  }

  const tokenConfig = buildTokenConfig(oauth);
  if (tokenConfig) flow.tokenConfig = tokenConfig;

  const settings = buildSettings(oauth);
  if (settings) flow.settings = settings;

  return flow;
};

const buildAuthorizationCodeFlow = (oauth: BrunoOAuth2): OAuth2AuthorizationCodeFlow => {
  const flow: OAuth2AuthorizationCodeFlow = {
    type: 'oauth2',
    flow: 'authorization_code'
  };

  isNonEmptyString(oauth.authorizationUrl) && (flow.authorizationUrl = oauth.authorizationUrl);
  isNonEmptyString(oauth.accessTokenUrl) && (flow.accessTokenUrl = oauth.accessTokenUrl);
  isNonEmptyString(oauth.refreshTokenUrl) && (flow.refreshTokenUrl = oauth.refreshTokenUrl);
  isNonEmptyString(oauth.callbackUrl) && (flow.callbackUrl = oauth.callbackUrl);

  const credentials = buildClientCredentials(oauth);
  if (credentials) flow.credentials = credentials;

  const authorizationRequest = mapAdditionalParameters(oauth.additionalParameters?.authorization);
  const accessTokenRequest = mapAdditionalParameters(oauth.additionalParameters?.token);
  const refreshTokenRequest = mapAdditionalParameters(oauth.additionalParameters?.refresh);

  if (authorizationRequest || accessTokenRequest || refreshTokenRequest) {
    flow.additionalParameters = {};
    if (authorizationRequest) {
      flow.additionalParameters.authorizationRequest = authorizationRequest;
    }
    if (accessTokenRequest) {
      flow.additionalParameters.accessTokenRequest = accessTokenRequest;
    }
    if (refreshTokenRequest) {
      flow.additionalParameters.refreshTokenRequest = refreshTokenRequest;
    }
  }

  isNonEmptyString(oauth.scope) && (flow.scope = oauth.scope);
  isNonEmptyString(oauth.state) && (flow.state = oauth.state);

  const pkce = buildPkce(oauth.pkce);
  if (pkce) flow.pkce = pkce;

  const tokenConfig = buildTokenConfig(oauth);
  if (tokenConfig) flow.tokenConfig = tokenConfig;

  const settings = buildSettings(oauth);
  if (settings) flow.settings = settings;

  return flow;
};

const buildImplicitFlow = (oauth: BrunoOAuth2): OAuth2ImplicitFlow => {
  const flow: OAuth2ImplicitFlow = {
    type: 'oauth2',
    flow: 'implicit'
  };

  isNonEmptyString(oauth.authorizationUrl) && (flow.authorizationUrl = oauth.authorizationUrl);
  isNonEmptyString(oauth.callbackUrl) && (flow.callbackUrl = oauth.callbackUrl);
  isNonEmptyString(oauth.clientId) && (flow.credentials = { clientId: oauth.clientId });
  isNonEmptyString(oauth.scope) && (flow.scope = oauth.scope);
  isNonEmptyString(oauth.state) && (flow.state = oauth.state);

  const authorizationRequest = mapAdditionalParameters(oauth.additionalParameters?.authorization);
  if (authorizationRequest) {
    flow.additionalParameters = { authorizationRequest };
  }

  const tokenConfig = buildTokenConfig(oauth);
  if (tokenConfig) flow.tokenConfig = tokenConfig;

  const settings = buildSettings(oauth);
  if (settings) flow.settings = settings;

  return flow;
};

// Bruno-namespaced extension carried inside the OpenCollection auth block so OAuth2 client-auth
// fields that OpenCollection doesn't model natively (RFC 7591 / OIDC §9 methods beyond basic /
// post, JWT-bearer assertion config, mTLS) round-trip through yml collections. Older Bruno builds
// without these features just see the OpenCollection-modeled subset and ignore the extension.
const BRUNO_OAUTH2_EXTENSION_KEY = 'x-bruno-oauth2';

const OAUTH2_EXTENSION_FIELDS: (keyof BrunoOAuth2)[] = [
  'tokenEndpointAuthMethod', 'tokenEndpointAuthSigningAlg',
  'privateKey', 'privateKeyType', 'privateKeyFormat', 'keyId',
  'audience', 'assertionLifetime', 'additionalClaims'
];

// `client_secret_basic` and `client_secret_post` are losslessly representable via OpenCollection's
// existing `credentials.placement` field — we don't need to carry those in the extension.
const isPlacementRepresentable = (method?: string | null): boolean =>
  method === 'client_secret_basic' || method === 'client_secret_post';

// Fields that only make sense when the active method signs a JWT (client_secret_jwt /
// private_key_jwt). Skipped on serialization when the active method is something else, so a
// previously-configured JWT method's material doesn't linger in yml after the user switches away.
const JWT_ONLY_EXTENSION_FIELDS: Set<keyof BrunoOAuth2> = new Set([
  'tokenEndpointAuthSigningAlg',
  'keyId',
  'audience', 'assertionLifetime', 'additionalClaims'
]);

// Private-key material is meaningful only for private_key_jwt; client_secret_jwt signs with the
// client secret. Separated so a private_key_jwt → client_secret_jwt switch doesn't leave the
// PEM/JWK lying around in yml.
const PRIVATE_KEY_JWT_ONLY_EXTENSION_FIELDS: Set<keyof BrunoOAuth2> = new Set([
  'privateKey', 'privateKeyType', 'privateKeyFormat'
]);

const isJwtMethod = (method?: string | null): boolean =>
  method === 'client_secret_jwt' || method === 'private_key_jwt';

const oauth2ExtensionFromBruno = (oauth: BrunoOAuth2): Record<string, unknown> | undefined => {
  const ext: Record<string, unknown> = {};
  const jwtActive = isJwtMethod(oauth.tokenEndpointAuthMethod);
  const privateKeyJwtActive = oauth.tokenEndpointAuthMethod === 'private_key_jwt';
  for (const k of OAUTH2_EXTENSION_FIELDS) {
    if (k === 'tokenEndpointAuthMethod' && isPlacementRepresentable(oauth.tokenEndpointAuthMethod)) {
      continue;
    }
    if (JWT_ONLY_EXTENSION_FIELDS.has(k) && !jwtActive) {
      continue;
    }
    if (PRIVATE_KEY_JWT_ONLY_EXTENSION_FIELDS.has(k) && !privateKeyJwtActive) {
      continue;
    }
    const v = (oauth as any)[k];
    if (v !== undefined && v !== null && v !== '') {
      ext[k] = v;
    }
  }
  return Object.keys(ext).length > 0 ? ext : undefined;
};

export const toOpenCollectionOAuth2 = (oauth?: BrunoOAuth2 | null): AuthOAuth2 | undefined => {
  if (!oauth) {
    return undefined;
  }

  let flow: AuthOAuth2 | undefined;
  switch (oauth.grantType) {
    case 'client_credentials':
      flow = buildClientCredentialsFlow(oauth); break;
    case 'password':
      flow = buildResourceOwnerPasswordFlow(oauth); break;
    case 'authorization_code':
      flow = buildAuthorizationCodeFlow(oauth); break;
    case 'implicit':
      flow = buildImplicitFlow(oauth); break;
    default:
      console.warn(`toOpenCollectionOAuth2: Unsupported OAuth2 grant type "${oauth.grantType}".`);
      return undefined;
  }
  if (!flow) return undefined;

  const ext = oauth2ExtensionFromBruno(oauth);
  if (ext) {
    (flow as unknown as Record<string, unknown>)[BRUNO_OAUTH2_EXTENSION_KEY] = ext;
  }
  return flow;
};

const reversePlacementMapping = (placement?: OAuth2AdditionalParameter['placement']): 'headers' | 'queryparams' | 'body' | null => {
  if (!placement) {
    return null;
  }

  switch (placement) {
    case 'header':
      return 'headers';
    case 'query':
      return 'queryparams';
    case 'body':
      return 'body';
    default:
      return null;
  }
};

const reverseAdditionalParameters = (params?: OAuth2AdditionalParameter[]): BrunoOAuthAdditionalParameter[] | null => {
  if (!Array.isArray(params) || params.length === 0) {
    return null;
  }

  const mapped = params.map((param): BrunoOAuthAdditionalParameter => {
    const sendIn = reversePlacementMapping(param.placement);

    return {
      name: param.name || null,
      value: param.value || null,
      sendIn: sendIn || 'headers',
      enabled: true
    };
  });

  return mapped.length > 0 ? mapped : null;
};

export const toBrunoOAuth2 = (oauth: AuthOAuth2 | null | undefined): BrunoOAuth2 | null => {
  if (!oauth) {
    return null;
  }

  const brunoOAuth: BrunoOAuth2 = {
    grantType: 'authorization_code',
    username: null,
    password: null,
    callbackUrl: null,
    authorizationUrl: null,
    accessTokenUrl: null,
    clientId: null,
    clientSecret: null,
    scope: null,
    state: null,
    pkce: false, // Default to false for all grant types
    credentialsPlacement: null,
    tokenEndpointAuthMethod: null,
    credentialsId: null,
    tokenPlacement: null,
    tokenHeaderPrefix: null,
    tokenQueryKey: null,
    tokenSource: 'access_token',
    refreshTokenUrl: null,
    autoRefreshToken: false, // Default to false
    autoFetchToken: true, // Default to true
    additionalParameters: null
  };

  switch (oauth.flow) {
    case 'client_credentials':
      brunoOAuth.grantType = 'client_credentials';
      if (oauth.accessTokenUrl) brunoOAuth.accessTokenUrl = oauth.accessTokenUrl;
      if (oauth.refreshTokenUrl) brunoOAuth.refreshTokenUrl = oauth.refreshTokenUrl;
      if (oauth.credentials?.clientId) brunoOAuth.clientId = oauth.credentials.clientId;
      if (oauth.credentials?.clientSecret) brunoOAuth.clientSecret = oauth.credentials.clientSecret;
      if (oauth.credentials?.placement) brunoOAuth.tokenEndpointAuthMethod = methodForPlacement(oauth.credentials.placement);
      if (oauth.scope) brunoOAuth.scope = oauth.scope;

      // token config
      if (oauth.tokenConfig?.id) brunoOAuth.credentialsId = oauth.tokenConfig.id;
      if (oauth.tokenConfig?.source) brunoOAuth.tokenSource = oauth.tokenConfig.source || 'access_token';
      if (oauth.tokenConfig?.placement) {
        if ('header' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'header';
          brunoOAuth.tokenHeaderPrefix = oauth.tokenConfig.placement.header || '';
        } else if ('query' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'url';
          brunoOAuth.tokenQueryKey = oauth.tokenConfig.placement.query || '';
        }
      }

      // additional parameters
      if (oauth.additionalParameters) {
        const tempParams: Record<string, any> = {};
        if (oauth.additionalParameters.accessTokenRequest) {
          const tokenParams = reverseAdditionalParameters(oauth.additionalParameters.accessTokenRequest);
          if (tokenParams) {
            tempParams.token = tokenParams;
          }
        }
        if (oauth.additionalParameters.refreshTokenRequest) {
          const refreshParams = reverseAdditionalParameters(oauth.additionalParameters.refreshTokenRequest);
          if (refreshParams) {
            tempParams.refresh = refreshParams;
          }
        }
        // Only set additionalParameters if there are actual parameters
        if (Object.keys(tempParams).length > 0) {
          brunoOAuth.additionalParameters = tempParams;
        }
      }
      break;

    case 'resource_owner_password_credentials':
      brunoOAuth.grantType = 'password';
      if (oauth.accessTokenUrl) brunoOAuth.accessTokenUrl = oauth.accessTokenUrl;
      if (oauth.refreshTokenUrl) brunoOAuth.refreshTokenUrl = oauth.refreshTokenUrl;
      if (oauth.credentials?.clientId) brunoOAuth.clientId = oauth.credentials.clientId;
      if (oauth.credentials?.clientSecret) brunoOAuth.clientSecret = oauth.credentials.clientSecret;
      if (oauth.credentials?.placement) brunoOAuth.tokenEndpointAuthMethod = methodForPlacement(oauth.credentials.placement);
      if (oauth.resourceOwner?.username) brunoOAuth.username = oauth.resourceOwner.username;
      if (oauth.resourceOwner?.password) brunoOAuth.password = oauth.resourceOwner.password;
      if (oauth.scope) brunoOAuth.scope = oauth.scope;

      // token config
      if (oauth.tokenConfig?.id) brunoOAuth.credentialsId = oauth.tokenConfig.id;
      if (oauth.tokenConfig?.source) brunoOAuth.tokenSource = oauth.tokenConfig.source || 'access_token';
      if (oauth.tokenConfig?.placement) {
        if ('header' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'header';
          brunoOAuth.tokenHeaderPrefix = oauth.tokenConfig.placement.header || '';
        } else if ('query' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'url';
          brunoOAuth.tokenQueryKey = oauth.tokenConfig.placement.query || '';
        }
      }

      // additional parameters
      if (oauth.additionalParameters) {
        const tempParams: Record<string, any> = {};
        if (oauth.additionalParameters.accessTokenRequest) {
          const tokenParams = reverseAdditionalParameters(oauth.additionalParameters.accessTokenRequest);
          if (tokenParams) {
            tempParams.token = tokenParams;
          }
        }
        if (oauth.additionalParameters.refreshTokenRequest) {
          const refreshParams = reverseAdditionalParameters(oauth.additionalParameters.refreshTokenRequest);
          if (refreshParams) {
            tempParams.refresh = refreshParams;
          }
        }
        // Only set additionalParameters if there are actual parameters
        if (Object.keys(tempParams).length > 0) {
          brunoOAuth.additionalParameters = tempParams;
        }
      }
      break;

    case 'authorization_code':
      brunoOAuth.grantType = 'authorization_code';
      if (oauth.authorizationUrl) brunoOAuth.authorizationUrl = oauth.authorizationUrl;
      if (oauth.accessTokenUrl) brunoOAuth.accessTokenUrl = oauth.accessTokenUrl;
      if (oauth.refreshTokenUrl) brunoOAuth.refreshTokenUrl = oauth.refreshTokenUrl;
      if (oauth.callbackUrl) brunoOAuth.callbackUrl = oauth.callbackUrl;
      if (oauth.credentials?.clientId) brunoOAuth.clientId = oauth.credentials.clientId;
      if (oauth.credentials?.clientSecret) brunoOAuth.clientSecret = oauth.credentials.clientSecret;
      if (oauth.credentials?.placement) brunoOAuth.tokenEndpointAuthMethod = methodForPlacement(oauth.credentials.placement);
      if (oauth.scope) brunoOAuth.scope = oauth.scope;
      if (oauth.state) brunoOAuth.state = oauth.state;

      // token config
      if (oauth.tokenConfig?.id) brunoOAuth.credentialsId = oauth.tokenConfig.id;
      if (oauth.tokenConfig?.source) brunoOAuth.tokenSource = oauth.tokenConfig.source || 'access_token';
      if (oauth.tokenConfig?.placement) {
        if ('header' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'header';
          brunoOAuth.tokenHeaderPrefix = oauth.tokenConfig.placement.header || '';
        } else if ('query' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'url';
          brunoOAuth.tokenQueryKey = oauth.tokenConfig.placement.query || '';
        }
      }

      // additional parameters
      if (oauth.additionalParameters) {
        const tempParams: Record<string, any> = {};
        if (oauth.additionalParameters.authorizationRequest) {
          const authParams = reverseAdditionalParameters(oauth.additionalParameters.authorizationRequest);
          if (authParams) {
            tempParams.authorization = authParams;
          }
        }
        if (oauth.additionalParameters.accessTokenRequest) {
          const tokenParams = reverseAdditionalParameters(oauth.additionalParameters.accessTokenRequest);
          if (tokenParams) {
            tempParams.token = tokenParams;
          }
        }
        if (oauth.additionalParameters.refreshTokenRequest) {
          const refreshParams = reverseAdditionalParameters(oauth.additionalParameters.refreshTokenRequest);
          if (refreshParams) {
            tempParams.refresh = refreshParams;
          }
        }
        // Only set additionalParameters if there are actual parameters
        if (Object.keys(tempParams).length > 0) {
          brunoOAuth.additionalParameters = tempParams;
        }
      }
      break;

    case 'implicit':
      brunoOAuth.grantType = 'implicit';
      if (oauth.authorizationUrl) brunoOAuth.authorizationUrl = oauth.authorizationUrl;
      if (oauth.callbackUrl) brunoOAuth.callbackUrl = oauth.callbackUrl;
      if (oauth.credentials?.clientId) brunoOAuth.clientId = oauth.credentials.clientId;
      if (oauth.scope) brunoOAuth.scope = oauth.scope;
      if (oauth.state) brunoOAuth.state = oauth.state;

      // token config
      if (oauth.tokenConfig?.id) brunoOAuth.credentialsId = oauth.tokenConfig.id;
      if (oauth.tokenConfig?.source) brunoOAuth.tokenSource = oauth.tokenConfig.source || 'access_token';
      if (oauth.tokenConfig?.placement) {
        if ('header' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'header';
          brunoOAuth.tokenHeaderPrefix = oauth.tokenConfig.placement.header || '';
        } else if ('query' in oauth.tokenConfig.placement) {
          brunoOAuth.tokenPlacement = 'url';
          brunoOAuth.tokenQueryKey = oauth.tokenConfig.placement.query || '';
        }
      }

      // additional parameters
      if (oauth.additionalParameters) {
        const tempParams: Record<string, any> = {};
        if (oauth.additionalParameters.authorizationRequest) {
          const authParams = reverseAdditionalParameters(oauth.additionalParameters.authorizationRequest);
          if (authParams) {
            tempParams.authorization = authParams;
          }
        }
        // Only set additionalParameters if there are actual parameters
        if (Object.keys(tempParams).length > 0) {
          brunoOAuth.additionalParameters = tempParams;
        }
      }
      break;

    default:
      return null;
  }

  if (oauth.settings?.autoFetchToken !== undefined) {
    brunoOAuth.autoFetchToken = oauth.settings.autoFetchToken;
  }
  if (oauth.settings?.autoRefreshToken !== undefined) {
    brunoOAuth.autoRefreshToken = oauth.settings.autoRefreshToken;
  }

  if (brunoOAuth.grantType === 'authorization_code' && oauth.flow === 'authorization_code') {
    const authCodeFlow = oauth as OAuth2AuthorizationCodeFlow;
    if (authCodeFlow.pkce !== undefined) {
      // If pkce.disabled is true, set pkce to false; otherwise set to true
      brunoOAuth.pkce = !authCodeFlow.pkce.disabled;
    }
  }

  // Restore any Bruno-extended OAuth2 client-auth state from the namespaced extension. Carries
  // anything OpenCollection doesn't model natively (advanced client-auth methods, JWT-bearer
  // assertion config, mTLS). Whitelisted to OAUTH2_EXTENSION_FIELDS so a hand-edited extension
  // can't override canonical flow fields like grantType or the endpoint URLs.
  const ext = (oauth as any)[BRUNO_OAUTH2_EXTENSION_KEY] as Record<string, unknown> | undefined;
  if (ext) {
    for (const k of OAUTH2_EXTENSION_FIELDS) {
      if (k in ext) {
        (brunoOAuth as any)[k] = ext[k];
      }
    }
  }

  if (brunoOAuth.additionalParameters === null) {
    delete brunoOAuth.additionalParameters;
  }

  return brunoOAuth;
};
