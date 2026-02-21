const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');
const collectionBruToJson = require('../src/collectionBruToJson');
const jsonToCollectionBru = require('../src/jsonToCollectionBru');

describe('OAuth2 token_source — request level (bruToJson)', () => {
  it('should parse token_source: id_token for authorization_code grant', () => {
    const input = `
meta {
  name: Test
  type: http
}

get {
  url: https://example.com/api
}

auth:oauth2 {
  grant_type: authorization_code
  callback_url: https://example.com/callback
  authorization_url: https://example.com/auth
  access_token_url: https://example.com/token
  client_id: client-id
  client_secret: client-secret
  scope: openid
  state:
  pkce: false
  credentials_placement: body
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  token_source: id_token
  auto_fetch_token: true
  auto_refresh_token: false
}
    `.trim();

    const result = bruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBe('id_token');
  });

  it('should default tokenSource to access_token when token_source is absent (authorization_code)', () => {
    const input = `
meta {
  name: Test
  type: http
}

get {
  url: https://example.com/api
}

auth:oauth2 {
  grant_type: authorization_code
  callback_url: https://example.com/callback
  authorization_url: https://example.com/auth
  access_token_url: https://example.com/token
  client_id: client-id
  client_secret: client-secret
  scope: openid
  state:
  pkce: false
  credentials_placement: body
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  auto_fetch_token: true
  auto_refresh_token: false
}
    `.trim();

    const result = bruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBe('access_token');
  });

  it('should parse token_source: id_token for implicit grant', () => {
    const input = `
meta {
  name: Test
  type: http
}

get {
  url: https://example.com/api
}

auth:oauth2 {
  grant_type: implicit
  callback_url: https://example.com/callback
  authorization_url: https://example.com/auth
  client_id: client-id
  scope: openid
  state:
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  token_source: id_token
  auto_fetch_token: true
}
    `.trim();

    const result = bruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBe('id_token');
  });

  it('should parse token_source: id_token for password grant', () => {
    const input = `
meta {
  name: Test
  type: http
}

get {
  url: https://example.com/api
}

auth:oauth2 {
  grant_type: password
  access_token_url: https://example.com/token
  refresh_token_url:
  username: user
  password: pass
  client_id: client-id
  client_secret: client-secret
  scope: openid
  credentials_placement: body
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  token_source: id_token
  auto_fetch_token: true
  auto_refresh_token: false
}
    `.trim();

    const result = bruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBe('id_token');
  });

  it('should NOT include tokenSource in client_credentials grant', () => {
    const input = `
meta {
  name: Test
  type: http
}

get {
  url: https://example.com/api
}

auth:oauth2 {
  grant_type: client_credentials
  access_token_url: https://example.com/token
  refresh_token_url:
  client_id: client-id
  client_secret: client-secret
  scope:
  credentials_placement: body
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  token_source: id_token
  auto_fetch_token: true
  auto_refresh_token: false
}
    `.trim();

    const result = bruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBeUndefined();
  });
});

describe('OAuth2 token_source — request level (jsonToBru)', () => {
  it('should serialize token_source: id_token for authorization_code when tokenPlacement is header', () => {
    const json = {
      meta: { name: 'Test', type: 'http', seq: '1' },
      http: { method: 'get', url: 'https://example.com/api', auth: 'oauth2', body: 'none' },
      auth: {
        oauth2: {
          grantType: 'authorization_code',
          callbackUrl: 'https://example.com/callback',
          authorizationUrl: 'https://example.com/auth',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: '',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: 'openid',
          state: '',
          pkce: false,
          credentialsPlacement: 'body',
          credentialsId: 'credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenSource: 'id_token',
          autoFetchToken: true,
          autoRefreshToken: false
        }
      }
    };

    const result = jsonToBru(json);
    expect(result).toContain('token_source: id_token');
  });

  it('should NOT serialize token_source when value is access_token (default)', () => {
    const json = {
      meta: { name: 'Test', type: 'http', seq: '1' },
      http: { method: 'get', url: 'https://example.com/api', auth: 'oauth2', body: 'none' },
      auth: {
        oauth2: {
          grantType: 'authorization_code',
          callbackUrl: 'https://example.com/callback',
          authorizationUrl: 'https://example.com/auth',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: '',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: 'openid',
          state: '',
          pkce: false,
          credentialsPlacement: 'body',
          credentialsId: 'credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenSource: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: false
        }
      }
    };

    const result = jsonToBru(json);
    expect(result).not.toContain('token_source');
  });

  it('should NOT serialize token_source when tokenPlacement is url (even if id_token)', () => {
    const json = {
      meta: { name: 'Test', type: 'http', seq: '1' },
      http: { method: 'get', url: 'https://example.com/api', auth: 'oauth2', body: 'none' },
      auth: {
        oauth2: {
          grantType: 'authorization_code',
          callbackUrl: 'https://example.com/callback',
          authorizationUrl: 'https://example.com/auth',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: '',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: 'openid',
          state: '',
          pkce: false,
          credentialsPlacement: 'body',
          credentialsId: 'credentials',
          tokenPlacement: 'url',
          tokenQueryKey: 'access_token',
          tokenSource: 'id_token',
          autoFetchToken: true,
          autoRefreshToken: false
        }
      }
    };

    const result = jsonToBru(json);
    expect(result).not.toContain('token_source');
  });

  it('should NOT serialize token_source for client_credentials grant', () => {
    const json = {
      meta: { name: 'Test', type: 'http', seq: '1' },
      http: { method: 'get', url: 'https://example.com/api', auth: 'oauth2', body: 'none' },
      auth: {
        oauth2: {
          grantType: 'client_credentials',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: '',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: '',
          credentialsPlacement: 'body',
          credentialsId: 'credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenSource: 'id_token',
          autoFetchToken: true,
          autoRefreshToken: false
        }
      }
    };

    const result = jsonToBru(json);
    expect(result).not.toContain('token_source');
  });
});

describe('OAuth2 token_source — collection level (collectionBruToJson)', () => {
  it('should parse token_source: id_token for authorization_code grant', () => {
    const input = `
auth:oauth2 {
  grant_type: authorization_code
  callback_url: https://example.com/callback
  authorization_url: https://example.com/auth
  access_token_url: https://example.com/token
  refresh_token_url:
  client_id: client-id
  client_secret: client-secret
  scope: openid
  state:
  pkce: false
  credentials_placement: body
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  token_source: id_token
  auto_fetch_token: true
  auto_refresh_token: false
}
    `.trim();

    const result = collectionBruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBe('id_token');
  });

  it('should default tokenSource to access_token when absent (collection level)', () => {
    const input = `
auth:oauth2 {
  grant_type: implicit
  callback_url: https://example.com/callback
  authorization_url: https://example.com/auth
  client_id: client-id
  scope: openid
  state:
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  auto_fetch_token: true
}
    `.trim();

    const result = collectionBruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBe('access_token');
  });

  it('should NOT include tokenSource in client_credentials grant (collection level)', () => {
    const input = `
auth:oauth2 {
  grant_type: client_credentials
  access_token_url: https://example.com/token
  refresh_token_url:
  client_id: client-id
  client_secret: client-secret
  scope:
  credentials_placement: body
  credentials_id: credentials
  token_placement: header
  token_header_prefix: Bearer
  auto_fetch_token: true
  auto_refresh_token: false
}
    `.trim();

    const result = collectionBruToJson(input);
    expect(result.auth.oauth2.tokenSource).toBeUndefined();
  });
});

describe('OAuth2 token_source — collection level (jsonToCollectionBru)', () => {
  it('should serialize token_source: id_token for implicit grant when tokenPlacement is header', () => {
    const json = {
      auth: {
        oauth2: {
          grantType: 'implicit',
          callbackUrl: 'https://example.com/callback',
          authorizationUrl: 'https://example.com/auth',
          clientId: 'client-id',
          scope: 'openid',
          state: '',
          credentialsId: 'credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenSource: 'id_token',
          autoFetchToken: true
        }
      }
    };

    const result = jsonToCollectionBru(json);
    expect(result).toContain('token_source: id_token');
  });

  it('should NOT serialize token_source when value is access_token (collection level)', () => {
    const json = {
      auth: {
        oauth2: {
          grantType: 'password',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: '',
          username: 'user',
          password: 'pass',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: 'openid',
          credentialsPlacement: 'body',
          credentialsId: 'credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenSource: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: false
        }
      }
    };

    const result = jsonToCollectionBru(json);
    expect(result).not.toContain('token_source');
  });
});
