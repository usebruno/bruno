import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi-to-bruno auth enhancements', () => {
  it('maps HTTP Digest scheme to digest auth on the request', () => {
    const spec = `
openapi: 3.0.3
info:
  title: Digest API
  version: '1.0'
components:
  securitySchemes:
    DigestAuth:
      type: http
      scheme: digest
paths:
  /secure:
    get:
      security:
        - DigestAuth: []
      responses:
        '200': { description: OK }
servers:
  - url: https://example.com
`;
    const collection = openApiToBruno(spec);
    const req = collection.items[0];
    expect(req.request.auth.mode).toBe('digest');
    expect(req.request.auth.digest).toEqual({ username: '{{username}}', password: '{{password}}' });
  });

  it('maps apiKey in query and injects query param', () => {
    const spec = `
openapi: 3.0.3
info:
  title: Query API-Key
  version: '1.0'
components:
  securitySchemes:
    ApiKeyQuery:
      type: apiKey
      in: query
      name: api_key
paths:
  /search:
    get:
      security:
        - ApiKeyQuery: []
      parameters:
        - in: query
          name: q
          schema: { type: string }
      responses:
        '200': { description: OK }
servers:
  - url: https://example.com
`;
    const collection = openApiToBruno(spec);
    const req = collection.items[0];
    expect(req.request.auth.mode).toBe('apikey');
    expect(req.request.auth.apikey.placement).toBe('queryparams');
    const hasQueryParam = req.request.params.some(p => p.name === 'api_key' && p.type === 'query');
    expect(hasQueryParam).toBe(true);
  });

  it('maps apiKey in cookie and treats it as a header', () => {
    const spec = `
openapi: 3.0.3
info:
  title: Cookie API-Key
  version: '1.0'
components:
  securitySchemes:
    ApiKeyCookie:
      type: apiKey
      in: cookie
      name: DEMO_API_KEY
paths:
  /favorites:
    get:
      security:
        - ApiKeyCookie: []
      responses:
        '200': { description: OK }
servers:
  - url: https://example.com
`;
    const { items: [req] } = openApiToBruno(spec);
    expect(req.request.auth.mode).toBe('apikey');
    expect(req.request.auth.apikey.placement).toBe('header');
    const apiKeyHeader = req.request.headers.find(h => h.name === 'DEMO_API_KEY');
    expect(apiKeyHeader).toBeDefined();
    expect(apiKeyHeader.value).toBe('{{apiKey}}');
  });

  it('maps OAuth2 authorizationCode flow to oauth2 grantType authorization_code', () => {
    const spec = `
openapi: 3.0.3
info:
  title: OAuth2 AuthCode
  version: '1.0'
components:
  securitySchemes:
    OAuthAuthCode:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/authorize
          tokenUrl: https://auth.example.com/token
paths:
  /orders:
    get:
      security:
        - OAuthAuthCode: []
      responses:
        '200': { description: OK }
servers:
  - url: https://example.com
`;
    const { items: [req] } = openApiToBruno(spec);
    expect(req.request.auth.mode).toBe('oauth2');
    expect(req.request.auth.oauth2.grantType).toBe('authorization_code');
  });

  it('sets auth mode to inherit when operation security is explicitly empty', () => {
    const spec = `
openapi: 3.0.3
info:
  title: Public Endpoint
  version: '1.0'
paths:
  /public:
    get:
      security: []
      responses:
        '200': { description: OK }
servers:
  - url: https://example.com
`;
    const { items: [req] } = openApiToBruno(spec);
    expect(req.request.auth.mode).toBe('inherit');
  });
});
