const fromOpenCollectionOAuth2 = (auth) => {
  const getTokenPlacement = (tokenConfig) => {
    if (tokenConfig?.placement?.query) {
      return 'query';
    }
    return 'header';
  };

  const getTokenHeaderPrefix = (tokenConfig) => {
    if (tokenConfig?.placement?.header) {
      return tokenConfig.placement.header;
    }
    return 'Bearer';
  };

  const getTokenQueryKey = (tokenConfig) => {
    if (tokenConfig?.placement?.query) {
      return tokenConfig.placement.query;
    }
    return 'access_token';
  };

  const getCredentialsPlacement = (credentials) => {
    if (credentials?.placement === 'basic_auth_header') {
      return 'basic_auth_header';
    }
    return 'body';
  };

  switch (auth.flow) {
    case 'client_credentials':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'client_credentials',
          accessTokenUrl: auth.accessTokenUrl || '',
          refreshTokenUrl: auth.refreshTokenUrl || '',
          clientId: auth.credentials?.clientId || '',
          clientSecret: auth.credentials?.clientSecret || '',
          scope: auth.scope || '',
          credentialsPlacement: getCredentialsPlacement(auth.credentials),
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false,
          autoRefreshToken: auth.settings?.autoRefreshToken !== false
        }
      };
    case 'resource_owner_password':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'password',
          accessTokenUrl: auth.accessTokenUrl || '',
          refreshTokenUrl: auth.refreshTokenUrl || '',
          clientId: auth.credentials?.clientId || '',
          clientSecret: auth.credentials?.clientSecret || '',
          username: auth.resourceOwner?.username || '',
          password: auth.resourceOwner?.password || '',
          scope: auth.scope || '',
          credentialsPlacement: getCredentialsPlacement(auth.credentials),
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false,
          autoRefreshToken: auth.settings?.autoRefreshToken !== false
        }
      };
    case 'authorization_code':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          authorizationUrl: auth.authorizationUrl || '',
          accessTokenUrl: auth.accessTokenUrl || '',
          refreshTokenUrl: auth.refreshTokenUrl || '',
          callbackUrl: auth.callbackUrl || '',
          clientId: auth.credentials?.clientId || '',
          clientSecret: auth.credentials?.clientSecret || '',
          scope: auth.scope || '',
          pkce: auth.pkce?.enabled || false,
          credentialsPlacement: getCredentialsPlacement(auth.credentials),
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false,
          autoRefreshToken: auth.settings?.autoRefreshToken !== false
        }
      };
    case 'implicit':
      return {
        mode: 'oauth2',
        oauth2: {
          grantType: 'implicit',
          authorizationUrl: auth.authorizationUrl || '',
          callbackUrl: auth.callbackUrl || '',
          clientId: auth.credentials?.clientId || '',
          scope: auth.scope || '',
          state: auth.state || '',
          credentialsId: auth.tokenConfig?.id || 'credentials',
          tokenPlacement: getTokenPlacement(auth.tokenConfig),
          tokenHeaderPrefix: getTokenHeaderPrefix(auth.tokenConfig),
          tokenQueryKey: getTokenQueryKey(auth.tokenConfig),
          autoFetchToken: auth.settings?.autoFetchToken !== false
        }
      };
    default:
      return { mode: 'none' };
  }
};

export const toBrunoAuth = (auth) => {
  if (!auth) {
    return { mode: 'none' };
  }

  if (auth === 'inherit') {
    return { mode: 'inherit' };
  }

  switch (auth.type) {
    case 'basic':
      return {
        mode: 'basic',
        basic: {
          username: auth.username || '',
          password: auth.password || ''
        }
      };
    case 'bearer':
      return {
        mode: 'bearer',
        bearer: {
          token: auth.token || ''
        }
      };
    case 'digest':
      return {
        mode: 'digest',
        digest: {
          username: auth.username || '',
          password: auth.password || ''
        }
      };
    case 'ntlm':
      return {
        mode: 'ntlm',
        ntlm: {
          username: auth.username || '',
          password: auth.password || '',
          domain: auth.domain || ''
        }
      };
    case 'awsv4':
      return {
        mode: 'awsv4',
        awsv4: {
          accessKeyId: auth.accessKeyId || '',
          secretAccessKey: auth.secretAccessKey || '',
          sessionToken: auth.sessionToken || '',
          service: auth.service || '',
          region: auth.region || '',
          profileName: auth.profileName || ''
        }
      };
    case 'apikey':
      return {
        mode: 'apikey',
        apikey: {
          key: auth.key || '',
          value: auth.value || '',
          placement: auth.placement || 'header'
        }
      };
    case 'wsse':
      return {
        mode: 'wsse',
        wsse: {
          username: auth.username || '',
          password: auth.password || ''
        }
      };
    case 'oauth2':
      return fromOpenCollectionOAuth2(auth);
    default:
      return { mode: 'none' };
  }
};

const toOpenCollectionOAuth2 = (oauth2) => {
  if (!oauth2) return undefined;

  const base = { type: 'oauth2' };

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
        flow: 'resource_owner_password',
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
        pkce: oauth2.pkce ? { enabled: true, method: 'S256' } : undefined,
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

export const toOpenCollectionAuth = (auth) => {
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
        placement: auth.apikey?.placement || 'header'
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
