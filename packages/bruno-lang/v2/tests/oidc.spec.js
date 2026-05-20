const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

const OIDC_CODE_BRU = `meta {
  name: example
  type: http
  seq: 1
}

get {
  url: https://api.example.com/resource
  body: none
  auth: oauth2
}

auth:oauth2 {
  grant_type: openid_code
  issuer: https://op.example.com
  callback_url: https://app.example.com/callback
  authorization_url: https://op.example.com/authorize
  access_token_url: https://op.example.com/token
  refresh_token_url:
  client_id: rp-12345
  client_secret:
  scope: openid profile email
  state:
  pkce: true
  token_endpoint_auth_method: private_key_jwt
  response_type: code
  use_request_object: true
  request_object_signing_alg: RS256
  use_par: true
  par_endpoint: https://op.example.com/par
  credentials_id: credentials
  token_source: access_token
  token_placement: header
  token_header_prefix: Bearer
  auto_fetch_token: true
  auto_refresh_token: false
}
`;

const OIDC_HYBRID_BRU = `meta {
  name: hybrid
  type: http
  seq: 1
}

get {
  url: https://api.example.com/resource
  body: none
  auth: oauth2
}

auth:oauth2 {
  grant_type: openid_hybrid
  issuer: https://op.example.com
  callback_url: https://app.example.com/callback
  authorization_url: https://op.example.com/authorize
  access_token_url: https://op.example.com/token
  refresh_token_url:
  client_id: rp-12345
  client_secret:
  scope: openid
  state:
  pkce: true
  token_endpoint_auth_method: private_key_jwt
  response_type: code id_token
  response_mode: fragment
  use_request_object: true
  request_object_signing_alg: PS256
  use_par: false
  credentials_id: credentials
  token_source: id_token
  token_placement: header
  token_header_prefix: Bearer
  auto_fetch_token: true
  auto_refresh_token: false
}

auth:oauth2:request_object_additional_claims {
  claims: {"id_token":{"acr":{"essential":true}}}
}
`;

describe('OpenID Connect grant types', () => {
  it('openid_code: round-trips through bruToJson + jsonToBru', () => {
    const parsed = bruToJson(OIDC_CODE_BRU);
    expect(parsed.auth.oauth2.grantType).toBe('openid_code');
    expect(parsed.auth.oauth2.issuer).toBe('https://op.example.com');
    expect(parsed.auth.oauth2.tokenEndpointAuthMethod).toBe('private_key_jwt');
    expect(parsed.auth.oauth2.useRequestObject).toBe(true);
    expect(parsed.auth.oauth2.usePAR).toBe(true);
    expect(parsed.auth.oauth2.parEndpoint).toBe('https://op.example.com/par');
    expect(parsed.auth.oauth2.requestObjectSigningAlg).toBe('RS256');
    expect(parsed.auth.oauth2.responseType).toBe('code');

    const reserialised = jsonToBru(parsed);
    // Re-parsing the re-serialised output must match (stable round-trip).
    const reparsed = bruToJson(reserialised);
    expect(reparsed.auth.oauth2.grantType).toBe('openid_code');
    expect(reparsed.auth.oauth2.issuer).toBe('https://op.example.com');
    expect(reparsed.auth.oauth2.useRequestObject).toBe(true);
    expect(reparsed.auth.oauth2.usePAR).toBe(true);
  });

  it('openid_hybrid: round-trips with response_type and response_mode', () => {
    const parsed = bruToJson(OIDC_HYBRID_BRU);
    expect(parsed.auth.oauth2.grantType).toBe('openid_hybrid');
    expect(parsed.auth.oauth2.responseType).toBe('code id_token');
    expect(parsed.auth.oauth2.responseMode).toBe('fragment');
    expect(parsed.auth.oauth2.requestObjectSigningAlg).toBe('PS256');
    expect(parsed.auth.oauth2.tokenSource).toBe('id_token');

    const reserialised = jsonToBru(parsed);
    const reparsed = bruToJson(reserialised);
    expect(reparsed.auth.oauth2.grantType).toBe('openid_hybrid');
    expect(reparsed.auth.oauth2.responseType).toBe('code id_token');
    expect(reparsed.auth.oauth2.responseMode).toBe('fragment');
  });

  it('parses the auth:oauth2:request_object_additional_claims block', () => {
    const parsed = bruToJson(OIDC_HYBRID_BRU);
    expect(parsed.oauth2_request_object_additional_claims).toBeDefined();
    expect(parsed.oauth2_request_object_additional_claims).toEqual([
      expect.objectContaining({
        name: 'claims',
        value: '{"id_token":{"acr":{"essential":true}}}',
        enabled: true
      })
    ]);
  });

  it('emits the auth:oauth2:request_object_additional_claims block when set on the in-memory object', () => {
    const minimal = {
      meta: { name: 'example', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://api.example.com/r', auth: 'oauth2', body: 'none' },
      params: [], headers: [], body: { mode: 'none' }, script: {}, vars: { req: [], res: [] }, assertions: [], tests: '',
      settings: {}, docs: '', examples: [],
      auth: {
        mode: 'oauth2',
        oauth2: {
          grantType: 'openid_code',
          issuer: 'https://op.example.com',
          authorizationUrl: 'https://op.example.com/authorize',
          accessTokenUrl: 'https://op.example.com/token',
          clientId: 'rp-12345',
          scope: 'openid',
          tokenEndpointAuthMethod: 'private_key_jwt',
          useRequestObject: true,
          requestObjectSigningAlg: 'RS256',
          requestObjectAdditionalClaims: [
            { name: 'audience', value: 'https://api.example.com', enabled: true },
            { name: 'disabled', value: 'no', enabled: false }
          ],
          responseType: 'code',
          credentialsId: 'credentials',
          tokenSource: 'access_token',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: false,
          pkce: false
        }
      }
    };
    const bru = jsonToBru(minimal);
    expect(bru).toMatch(/auth:oauth2:request_object_additional_claims \{/);
    expect(bru).toMatch(/audience: https:\/\/api\.example\.com/);
    expect(bru).toMatch(/~disabled: no/);
  });
});
