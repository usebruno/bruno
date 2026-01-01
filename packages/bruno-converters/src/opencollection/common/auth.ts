import type {
  Auth,
  AuthBasic,
  AuthBearer,
  AuthDigest,
  AuthNTLM,
  AuthAwsV4,
  AuthApiKey,
  AuthWsse,
  AuthOAuth2,
  BrunoAuth,
  BrunoOAuth2
} from '../types';

const fromOpenCollectionOAuth2 = (auth: AuthOAuth2): BrunoAuth => {
  const getTokenPlacement = (tokenConfig: AuthOAuth2['tokenConfig']): string => {
    if (tokenConfig?.placement && 'query' in tokenConfig.placement) {
      return 'query';
    }
    return 'header';
  };

  const getTokenHeaderPrefix = (tokenConfig: AuthOAuth2['tokenConfig']): string => {
    if (tokenConfig?.placement && 'header' in tokenConfig.placement) {
      return tokenConfig.placement.header;
    }
    return 'Bearer';
  };

  const getTokenQueryKey = (tokenConfig: AuthOAuth2['tokenConfig']): string => {
    if (tokenConfig?.placement && 'query' in tokenConfig.placement) {
      return tokenConfig.placement.query;
    }
    return 'access_token';
  };

  const getCredentialsPlacement = (credentials: AuthOAuth2['credentials']): 'body' | 'basic_auth_header' => {
    if (credentials && 'placement' in credentials && credentials.placement === 'basic_auth_header') {
      return 'basic_auth_header';
    }
    return 'body';
  };

  const buildOAuth2Config = (base: Partial<BrunoOAuth2>): BrunoAuth => {
    const brunoAuth: BrunoAuth = {
      mode: 'oauth2',
      awsv4: null,
      basic: null,
      bearer: null,
      digest: null,
      ntlm: null,
      oauth2: {
        grantType: base.grantType || 'client_credentials',
        username: base.username || null,
        password: base.password || null,
        callbackUrl: base.callbackUrl || null,
        authorizationUrl: base.authorizationUrl || null,
        accessTokenUrl: base.accessTokenUrl || null,
        clientId: base.clientId || null,
        clientSecret: base.clientSecret || null,
        scope: base.scope || null,
        state: base.state || null,
        pkce: base.pkce ?? false,
        credentialsPlacement: base.credentialsPlacement || null,
        credentialsId: base.credentialsId || null,
        tokenPlacement: base.tokenPlacement || null,
        tokenHeaderPrefix: base.tokenHeaderPrefix || null,
        tokenQueryKey: base.tokenQueryKey || null,
        refreshTokenUrl: base.refreshTokenUrl || null,
        autoRefreshToken: base.autoRefreshToken ?? false,
        autoFetchToken: base.autoFetchToken ?? false,
        additionalParameters: {}
      },
      wsse: null,
      apikey: null
    };
    return brunoAuth;
  };

  switch (auth.flow) {
    case 'client_credentials':
      return buildOAuth2Config({
        grantType: 'client_credentials',
        accessTokenUrl: auth.accessTokenUrl || null,
        refreshTokenUrl: auth.refreshTokenUrl || null,
        clientId: auth.credentials?.clientId || null,
        clientSecret: auth.credentials?.clientSecret || null,
        scope: auth.scope || null,
        credentialsPlacement: getCredentialsPlacement(auth.credentials),
        credentialsId: auth.tokenConfig?.id || 'credentials',
        tokenPlacement: getTokenPlacement(auth.tokenConfig),
        tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
        tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
        autoFetchToken: auth.settings?.autoFetchToken !== false,
        autoRefreshToken: auth.settings?.autoRefreshToken !== false
      });

    case 'resource_owner_password_credentials':
      return buildOAuth2Config({
        grantType: 'password',
        accessTokenUrl: auth.accessTokenUrl || null,
        refreshTokenUrl: auth.refreshTokenUrl || null,
        clientId: auth.credentials?.clientId || null,
        clientSecret: auth.credentials?.clientSecret || null,
        username: auth.resourceOwner?.username || null,
        password: auth.resourceOwner?.password || null,
        scope: auth.scope || null,
        credentialsPlacement: getCredentialsPlacement(auth.credentials),
        credentialsId: auth.tokenConfig?.id || 'credentials',
        tokenPlacement: getTokenPlacement(auth.tokenConfig),
        tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
        tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
        autoFetchToken: auth.settings?.autoFetchToken !== false,
        autoRefreshToken: auth.settings?.autoRefreshToken !== false
      });

    case 'authorization_code':
      return buildOAuth2Config({
        grantType: 'authorization_code',
        authorizationUrl: auth.authorizationUrl || null,
        accessTokenUrl: auth.accessTokenUrl || null,
        refreshTokenUrl: auth.refreshTokenUrl || null,
        callbackUrl: auth.callbackUrl || null,
        clientId: auth.credentials?.clientId || null,
        clientSecret: auth.credentials?.clientSecret || null,
        scope: auth.scope || null,
        pkce: (auth.pkce && !auth.pkce.disabled) || null,
        credentialsPlacement: getCredentialsPlacement(auth.credentials),
        credentialsId: auth.tokenConfig?.id || 'credentials',
        tokenPlacement: getTokenPlacement(auth.tokenConfig),
        tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
        tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
        autoFetchToken: auth.settings?.autoFetchToken !== false,
        autoRefreshToken: auth.settings?.autoRefreshToken !== false
      });

    case 'implicit':
      return buildOAuth2Config({
        grantType: 'implicit',
        authorizationUrl: auth.authorizationUrl || null,
        callbackUrl: auth.callbackUrl || null,
        clientId: auth.credentials?.clientId || null,
        scope: auth.scope || null,
        state: auth.state || null,
        credentialsId: auth.tokenConfig?.id || 'credentials',
        tokenPlacement: getTokenPlacement(auth.tokenConfig),
        tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
        tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
        autoFetchToken: auth.settings?.autoFetchToken !== false
      });

    default:
      return {
        mode: 'none',
        awsv4: null,
        basic: null,
        bearer: null,
        digest: null,
        ntlm: null,
        oauth2: null,
        wsse: null,
        apikey: null
      };
  }
};

export const fromOpenCollectionAuth = (auth: Auth | undefined): BrunoAuth => {
  const defaultAuth: BrunoAuth = {
    mode: 'none',
    awsv4: null,
    basic: null,
    bearer: null,
    digest: null,
    ntlm: null,
    oauth2: null,
    wsse: null,
    apikey: null
  };

  if (!auth) {
    return defaultAuth;
  }

  if (auth === 'inherit') {
    return { ...defaultAuth, mode: 'inherit' };
  }

  switch (auth.type) {
    case 'basic': {
      const basicAuth = auth as AuthBasic;
      return {
        ...defaultAuth,
        mode: 'basic',
        basic: {
          username: basicAuth.username || null,
          password: basicAuth.password || null
        }
      };
    }

    case 'bearer': {
      const bearerAuth = auth as AuthBearer;
      return {
        ...defaultAuth,
        mode: 'bearer',
        bearer: {
          token: bearerAuth.token || null
        }
      };
    }

    case 'digest': {
      const digestAuth = auth as AuthDigest;
      return {
        ...defaultAuth,
        mode: 'digest',
        digest: {
          username: digestAuth.username || null,
          password: digestAuth.password || null
        }
      };
    }

    case 'ntlm': {
      const ntlmAuth = auth as AuthNTLM;
      return {
        ...defaultAuth,
        mode: 'ntlm',
        ntlm: {
          username: ntlmAuth.username || null,
          password: ntlmAuth.password || null,
          domain: ntlmAuth.domain || null
        }
      };
    }

    case 'awsv4': {
      const awsAuth = auth as AuthAwsV4;
      return {
        ...defaultAuth,
        mode: 'awsv4',
        awsv4: {
          accessKeyId: awsAuth.accessKeyId || null,
          secretAccessKey: awsAuth.secretAccessKey || null,
          sessionToken: awsAuth.sessionToken || null,
          service: awsAuth.service || null,
          region: awsAuth.region || null,
          profileName: awsAuth.profileName || null
        }
      };
    }

    case 'apikey': {
      const apiKeyAuth = auth as AuthApiKey;
      return {
        ...defaultAuth,
        mode: 'apikey',
        apikey: {
          key: apiKeyAuth.key || null,
          value: apiKeyAuth.value || null,
          placement: apiKeyAuth.placement === 'query' ? 'queryparams' : (apiKeyAuth.placement === 'header' ? 'header' : null)
        }
      };
    }

    case 'wsse': {
      const wsseAuth = auth as AuthWsse;
      return {
        ...defaultAuth,
        mode: 'wsse',
        wsse: {
          username: wsseAuth.username || null,
          password: wsseAuth.password || null
        }
      };
    }

    case 'oauth2':
      return fromOpenCollectionOAuth2(auth as AuthOAuth2);

    default:
      return defaultAuth;
  }
};

const toOpenCollectionOAuth2 = (oauth2: BrunoOAuth2 | null | undefined): AuthOAuth2 | undefined => {
  if (!oauth2) {
    return undefined;
  }

  const base = { type: 'oauth2' as const };

  switch (oauth2.grantType) {
    case 'client_credentials':
      return {
        ...base,
        flow: 'client_credentials',
        accessTokenUrl: oauth2.accessTokenUrl || '',
        refreshTokenUrl: oauth2.refreshTokenUrl || '',
        credentials: {
          clientId: oauth2.clientId || '',
          clientSecret: oauth2.clientSecret || '',
          placement: oauth2.credentialsPlacement === 'basic_auth_header' ? 'basic_auth_header' : 'body'
        },
        scope: oauth2.scope || '',
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false,
          autoRefreshToken: oauth2.autoRefreshToken !== false
        }
      };

    case 'password':
      return {
        ...base,
        flow: 'resource_owner_password_credentials',
        accessTokenUrl: oauth2.accessTokenUrl || '',
        refreshTokenUrl: oauth2.refreshTokenUrl || '',
        credentials: {
          clientId: oauth2.clientId || '',
          clientSecret: oauth2.clientSecret || '',
          placement: oauth2.credentialsPlacement === 'basic_auth_header' ? 'basic_auth_header' : 'body'
        },
        resourceOwner: {
          username: oauth2.username || '',
          password: oauth2.password || ''
        },
        scope: oauth2.scope || '',
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false,
          autoRefreshToken: oauth2.autoRefreshToken !== false
        }
      };

    case 'authorization_code':
      return {
        ...base,
        flow: 'authorization_code',
        authorizationUrl: oauth2.authorizationUrl || '',
        accessTokenUrl: oauth2.accessTokenUrl || '',
        refreshTokenUrl: oauth2.refreshTokenUrl || '',
        callbackUrl: oauth2.callbackUrl || '',
        credentials: {
          clientId: oauth2.clientId || '',
          clientSecret: oauth2.clientSecret || '',
          placement: oauth2.credentialsPlacement === 'basic_auth_header' ? 'basic_auth_header' : 'body'
        },
        scope: oauth2.scope || '',
        pkce: oauth2.pkce ? { method: 'S256' } : undefined,
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false,
          autoRefreshToken: oauth2.autoRefreshToken !== false
        }
      };

    case 'implicit':
      return {
        ...base,
        flow: 'implicit',
        authorizationUrl: oauth2.authorizationUrl || '',
        callbackUrl: oauth2.callbackUrl || '',
        credentials: {
          clientId: oauth2.clientId || ''
        },
        scope: oauth2.scope || '',
        state: oauth2.state || '',
        tokenConfig: {
          id: oauth2.credentialsId || 'credentials',
          placement: oauth2.tokenPlacement === 'query'
            ? { query: oauth2.tokenQueryKey || 'access_token' }
            : { header: oauth2.tokenHeaderPrefix || 'Bearer' }
        },
        settings: {
          autoFetchToken: oauth2.autoFetchToken !== false
        }
      };

    default:
      return undefined;
  }
};

export const toOpenCollectionAuth = (auth: BrunoAuth | null | undefined): Auth | undefined => {
  if (!auth || auth.mode === 'none') {
    return undefined;
  }

  if (auth.mode === 'inherit') {
    return 'inherit';
  }

  switch (auth.mode) {
    case 'basic':
      return {
        type: 'basic',
        username: auth.basic?.username || '',
        password: auth.basic?.password || ''
      };

    case 'bearer':
      return {
        type: 'bearer',
        token: auth.bearer?.token || ''
      };

    case 'digest':
      return {
        type: 'digest',
        username: auth.digest?.username || '',
        password: auth.digest?.password || ''
      };

    case 'ntlm':
      return {
        type: 'ntlm',
        username: auth.ntlm?.username || '',
        password: auth.ntlm?.password || '',
        domain: auth.ntlm?.domain || ''
      };

    case 'awsv4':
      return {
        type: 'awsv4',
        accessKeyId: auth.awsv4?.accessKeyId || '',
        secretAccessKey: auth.awsv4?.secretAccessKey || '',
        sessionToken: auth.awsv4?.sessionToken || '',
        service: auth.awsv4?.service || '',
        region: auth.awsv4?.region || '',
        profileName: auth.awsv4?.profileName || ''
      };

    case 'apikey':
      return {
        type: 'apikey',
        key: auth.apikey?.key || '',
        value: auth.apikey?.value || '',
        placement: auth.apikey?.placement === 'queryparams' ? 'query' : 'header'
      };

    case 'wsse':
      return {
        type: 'wsse',
        username: auth.wsse?.username || '',
        password: auth.wsse?.password || ''
      };

    case 'oauth2':
      return toOpenCollectionOAuth2(auth.oauth2);

    default:
      return undefined;
  }
};
