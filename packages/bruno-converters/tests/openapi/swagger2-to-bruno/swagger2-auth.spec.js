import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';

describe('swagger2-to-bruno auth', () => {
  it('maps basic auth security definition to collection-level auth', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Basic Auth API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        basicAuth: { type: 'basic' }
      },
      security: [{ basicAuth: [] }],
      paths: {
        '/secure': {
          get: { summary: 'Secure endpoint', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);

    expect(collection.root.request.auth.mode).toBe('basic');
    expect(collection.root.request.auth.basic.username).toBe('{{username}}');
    expect(collection.root.request.auth.basic.password).toBe('{{password}}');
  });

  it('maps apiKey in header to apikey auth on the request', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'API Key API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        api_key: { type: 'apiKey', name: 'X-API-Key', in: 'header' }
      },
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            security: [{ api_key: [] }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get data');

    expect(req.request.auth.mode).toBe('apikey');
    expect(req.request.auth.apikey.key).toBe('X-API-Key');
    expect(req.request.auth.apikey.placement).toBe('header');

    // Should also inject header
    const header = req.request.headers.find((h) => h.name === 'X-API-Key');
    expect(header).toBeDefined();
    expect(header.value).toBe('{{apiKey}}');
  });

  it('maps apiKey in query and injects query param', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Query Key API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        api_key: { type: 'apiKey', name: 'api_key', in: 'query' }
      },
      paths: {
        '/search': {
          get: {
            summary: 'Search',
            security: [{ api_key: [] }],
            parameters: [
              { in: 'query', name: 'q', type: 'string' }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Search');

    expect(req.request.auth.mode).toBe('apikey');
    expect(req.request.auth.apikey.placement).toBe('queryparams');

    const hasQueryParam = req.request.params.some((p) => p.name === 'api_key' && p.type === 'query');
    expect(hasQueryParam).toBe(true);
  });

  it('maps oauth2 implicit flow', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'OAuth2 API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        petstore_auth: {
          type: 'oauth2',
          flow: 'implicit',
          authorizationUrl: 'https://example.com/oauth/authorize',
          scopes: { 'read:pets': 'read', 'write:pets': 'write' }
        }
      },
      paths: {
        '/pets': {
          get: {
            summary: 'List pets',
            security: [{ petstore_auth: ['read:pets'] }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'List pets');

    expect(req.request.auth.mode).toBe('oauth2');
    expect(req.request.auth.oauth2.grantType).toBe('implicit');
    expect(req.request.auth.oauth2.authorizationUrl).toBe('https://example.com/oauth/authorize');
    expect(req.request.auth.oauth2.scope).toContain('read:pets');
  });

  it('maps oauth2 accessCode flow to authorization_code', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'OAuth2 Code API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        oauth: {
          type: 'oauth2',
          flow: 'accessCode',
          authorizationUrl: 'https://example.com/oauth/authorize',
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'read access' }
        }
      },
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            security: [{ oauth: ['read'] }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get data');

    expect(req.request.auth.mode).toBe('oauth2');
    expect(req.request.auth.oauth2.grantType).toBe('authorization_code');
    expect(req.request.auth.oauth2.accessTokenUrl).toBe('https://example.com/oauth/token');
  });

  it('maps oauth2 application flow to client_credentials', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'OAuth2 App API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        oauth: {
          type: 'oauth2',
          flow: 'application',
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { admin: 'admin access' }
        }
      },
      paths: {
        '/admin': {
          get: {
            summary: 'Admin',
            security: [{ oauth: ['admin'] }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Admin');

    expect(req.request.auth.mode).toBe('oauth2');
    expect(req.request.auth.oauth2.grantType).toBe('client_credentials');
  });

  it('maps oauth2 password flow', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'OAuth2 Password API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        oauth: {
          type: 'oauth2',
          flow: 'password',
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'read' }
        }
      },
      paths: {
        '/me': {
          get: {
            summary: 'Get me',
            security: [{ oauth: ['read'] }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get me');

    expect(req.request.auth.mode).toBe('oauth2');
    expect(req.request.auth.oauth2.grantType).toBe('password');
  });

  it('sets auth mode to inherit when operation security is explicitly empty', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Mixed Auth API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        api_key: { type: 'apiKey', name: 'X-API-Key', in: 'header' }
      },
      security: [{ api_key: [] }],
      paths: {
        '/public': {
          get: {
            summary: 'Public endpoint',
            security: [],
            responses: { 200: { description: 'OK' } }
          }
        },
        '/private': {
          get: {
            summary: 'Private endpoint',
            security: [{ api_key: [] }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const publicReq = collection.items.find((i) => i.name === 'Public endpoint');
    const privateReq = collection.items.find((i) => i.name === 'Private endpoint');

    // Public endpoint should have no auth (explicitly empty security overrides global)
    expect(publicReq.request.auth.mode).toBe('none');

    // Private endpoint should have apikey auth
    expect(privateReq.request.auth.mode).toBe('apikey');
  });

  it('should set auth mode to inherit when no global security schemes exist', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'No Security API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/open': {
          get: {
            summary: 'Open endpoint',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Open endpoint');
    expect(req.request.auth.mode).toBe('inherit');
  });

  it('should set collection-level auth from global security', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Global Auth API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        api_key: { type: 'apiKey', name: 'Authorization', in: 'header' }
      },
      security: [{ api_key: [] }],
      paths: {
        '/data': {
          get: { summary: 'Get data', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);

    // Collection root should have apikey auth
    expect(collection.root.request.auth.mode).toBe('apikey');
    expect(collection.root.request.auth.apikey.key).toBe('Authorization');
  });

  it('should set folder root auth to inherit', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Folder Auth API', version: '1.0' },
      host: 'api.example.com',
      securityDefinitions: {
        basicAuth: { type: 'basic' }
      },
      security: [{ basicAuth: [] }],
      paths: {
        '/users': {
          get: {
            tags: ['users'],
            summary: 'List users',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const folder = collection.items.find((i) => i.type === 'folder' && i.name === 'users');
    expect(folder).toBeDefined();
    expect(folder.root.request.auth.mode).toBe('inherit');
  });
});
