import { exportApiSpec } from './openapi-spec';

// Mock @usebruno/common to provide a working interpolate function
jest.mock('@usebruno/common', () => ({
  interpolate: (str, vars) => {
    if (!str || typeof str !== 'string') return str;
    let result = str;
    // Simple recursive interpolation for tests
    let changed = true;
    while (changed) {
      changed = false;
      result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        if (vars && vars[key] !== undefined) {
          changed = true;
          return String(vars[key]);
        }
        return match;
      });
    }
    return result;
  }
}));

describe('exportApiSpec - server variables reconstruction', () => {
  const makeItems = (urls) =>
    urls.map((url, i) => ({
      name: `Request ${i + 1}`,
      type: 'http-request',
      request: {
        url,
        method: 'GET',
        params: [],
        headers: [],
        body: {},
        auth: {}
      }
    }));

  it('should reconstruct server URL template and variables map when baseUrl has template vars', () => {
    const variables = {
      baseUrl: '{{protocol}}://{{host}}:{{port}}/v1',
      protocol: 'https',
      host: 'api.example.com',
      port: '443'
    };
    const items = makeItems(['{{baseUrl}}/users', '{{baseUrl}}/items']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });

    // Should contain the template server URL
    expect(content).toContain('url: \'{protocol}://{host}:{port}/v1\'');

    // Should contain the variables with defaults (js-yaml may or may not quote values)
    expect(content).toContain('protocol:');
    expect(content).toMatch(/default:\s*'?https'?/);
    expect(content).toContain('host:');
    expect(content).toMatch(/default:\s*api\.example\.com/);
    expect(content).toContain('port:');
    expect(content).toMatch(/default:\s*'443'/);

    // Should NOT contain the resolved origin as a separate server
    expect(content).not.toMatch(/url:\s*'?https:\/\/api\.example\.com:443'?/);
  });

  it('should strip base path from request pathnames to avoid duplication', () => {
    const variables = {
      baseUrl: '{{protocol}}://{{host}}/v1',
      protocol: 'https',
      host: 'api.example.com'
    };
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });

    // Path should be /users, not /v1/users (since server URL already has /v1)
    expect(content).toContain('/users:');
    expect(content).not.toMatch(/\/v1\/users:/);
  });

  it('should use plain resolved URL when baseUrl has no template vars', () => {
    const variables = {
      baseUrl: 'https://api.example.com/v1'
    };
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });

    // Should contain the resolved origin as a plain server
    expect(content).toMatch(/url:\s*'?https:\/\/api\.example\.com'?/);

    // Should NOT contain template syntax
    expect(content).not.toContain('{protocol}');
    expect(content).not.toContain('variables:');
  });

  it('should add non-baseUrl servers as operation-level overrides, not root servers', () => {
    const variables = {
      baseUrl: '{{protocol}}://{{host}}/v1',
      protocol: 'https',
      host: 'api.example.com'
    };
    // Mix of baseUrl requests and a direct URL request
    const items = makeItems(['{{baseUrl}}/users', 'https://other-api.com/data']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });

    // Template server should be in root servers
    expect(content).toContain('url: \'{protocol}://{host}/v1\'');

    // Other server should appear as an operation-level override under /data
    expect(content).toContain('/data:');

    // Root servers should only contain the baseUrl server
    const parsed = require('js-yaml').load(content);
    expect(parsed.servers).toHaveLength(1);
    expect(parsed.servers[0].url).toBe('{protocol}://{host}/v1');

    // The operation-level server should be inside the GET operation
    expect(parsed.paths['/data'].get.servers).toHaveLength(1);
    expect(parsed.paths['/data'].get.servers[0].url).toBe('https://other-api.com');
  });

  it('should export request-level baseUrl override as a path-level server', () => {
    const variables = {
      baseUrl: 'https://api.example.com/v1'
    };
    const items = [
      {
        name: 'Get users',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/users',
          method: 'GET',
          params: [],
          headers: [],
          body: {},
          auth: {}
        }
      },
      {
        name: 'Get files',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/files',
          method: 'GET',
          params: [],
          headers: [],
          body: {},
          auth: {},
          vars: {
            req: [
              { name: 'baseUrl', value: 'https://files.example.com', enabled: true }
            ]
          }
        }
      }
    ];

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });
    const parsed = require('js-yaml').load(content);

    // Root servers should only have the collection baseUrl
    expect(parsed.servers).toHaveLength(1);
    expect(parsed.servers[0].url).toBe('https://api.example.com/v1');

    // /users GET should NOT have an operation-level server override
    expect(parsed.paths['/users'].get.servers).toBeUndefined();

    // /files GET should have an operation-level server override
    expect(parsed.paths['/files'].get.servers).toHaveLength(1);
    expect(parsed.paths['/files'].get.servers[0].url).toBe('https://files.example.com');
  });

  it('should export request-level baseUrl override with template variables', () => {
    const variables = {
      baseUrl: 'https://api.example.com/v1'
    };
    const items = [
      {
        name: 'Regional data',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/data',
          method: 'GET',
          params: [],
          headers: [],
          body: {},
          auth: {},
          vars: {
            req: [
              { name: 'baseUrl', value: '{{protocol}}://{{region}}.example.com/v2', enabled: true },
              { name: 'protocol', value: 'https', enabled: true },
              { name: 'region', value: 'us-east', enabled: true }
            ]
          }
        }
      }
    ];

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });
    const parsed = require('js-yaml').load(content);

    // Operation-level server should have template URL with variables
    const pathServers = parsed.paths['/data'].get.servers;
    expect(pathServers).toHaveLength(1);
    expect(pathServers[0].url).toBe('{protocol}://{region}.example.com/v2');
    expect(pathServers[0].variables.protocol.default).toBe('https');
    expect(pathServers[0].variables.region.default).toBe('us-east');
  });
});

describe('exportApiSpec - parameter and body value preservation', () => {
  it('should export path parameter values from params array', () => {
    const variables = { baseUrl: 'https://api.example.com' };
    const items = [{
      name: 'Get user',
      type: 'http-request',
      request: {
        url: '{{baseUrl}}/users/{userId}',
        method: 'GET',
        params: [
          { name: 'userId', value: '123', type: 'path', enabled: true },
          { name: 'include', value: 'profile', type: 'query', enabled: true }
        ],
        headers: [], body: {}, auth: {}
      }
    }];
    const { content } = exportApiSpec({ variables, items, name: 'Test' });
    const parsed = require('js-yaml').load(content);
    const params = parsed.paths['/users/{userId}'].get.parameters;

    const pathParam = params.find((p) => p.in === 'path');
    expect(pathParam.name).toBe('userId');
    expect(pathParam.example).toBe('123');

    const queryParam = params.find((p) => p.in === 'query');
    expect(queryParam.name).toBe('include');
    expect(queryParam.example).toBe('profile');
  });

  it('should not export path-type params as query params', () => {
    const variables = { baseUrl: 'https://api.example.com' };
    const items = [{
      name: 'Get user',
      type: 'http-request',
      request: {
        url: '{{baseUrl}}/users/{userId}',
        method: 'GET',
        params: [
          { name: 'userId', value: '123', type: 'path', enabled: true }
        ],
        headers: [], body: {}, auth: {}
      }
    }];
    const { content } = exportApiSpec({ variables, items, name: 'Test' });
    const parsed = require('js-yaml').load(content);
    const params = parsed.paths['/users/{userId}'].get.parameters;

    const queryParams = params.filter((p) => p.in === 'query');
    expect(queryParams).toHaveLength(0);

    const pathParams = params.filter((p) => p.in === 'path');
    expect(pathParams).toHaveLength(1);
    expect(pathParams[0].name).toBe('userId');
  });

  it('should fall back to URL regex for path params not in params array', () => {
    const variables = { baseUrl: 'https://api.example.com' };
    const items = [{
      name: 'Get user',
      type: 'http-request',
      request: {
        url: '{{baseUrl}}/users/{userId}',
        method: 'GET',
        params: [],
        headers: [], body: {}, auth: {}
      }
    }];
    const { content } = exportApiSpec({ variables, items, name: 'Test' });
    const parsed = require('js-yaml').load(content);
    const params = parsed.paths['/users/{userId}'].get.parameters;

    const pathParams = params.filter((p) => p.in === 'path');
    expect(pathParams).toHaveLength(1);
    expect(pathParams[0].name).toBe('userId');
    expect(pathParams[0].example).toBeUndefined();
  });

  it('should preserve JSON body example for round-trip', () => {
    const variables = { baseUrl: 'https://api.example.com' };
    const items = [{
      name: 'Create user',
      type: 'http-request',
      request: {
        url: '{{baseUrl}}/users',
        method: 'POST',
        params: [], headers: [],
        body: { mode: 'json', json: '{"name":"John","age":30}' },
        auth: {}
      }
    }];
    const { content } = exportApiSpec({ variables, items, name: 'Test' });
    const parsed = require('js-yaml').load(content);
    const schema = parsed.components.schemas.create_user;

    expect(schema.example).toEqual({ name: 'John', age: 30 });
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.type).toBe('number');
  });
});

describe('exportApiSpec - multi-environment servers', () => {
  const makeItems = (urls) =>
    urls.map((url, i) => ({
      name: `Request ${i + 1}`,
      type: 'http-request',
      request: {
        url,
        method: 'GET',
        params: [],
        headers: [],
        body: {},
        auth: {}
      }
    }));

  const makeEnv = (name, vars) => ({
    uid: name.toLowerCase(),
    name,
    variables: Object.entries(vars).map(([k, v]) => ({
      uid: `${name}-${k}`,
      name: k,
      value: v,
      enabled: true,
      type: 'text',
      secret: false
    }))
  });

  it('should create a server entry per environment when baseUrl has template vars', () => {
    const variables = {};
    const environments = [
      makeEnv('Production', { baseUrl: '{{protocol}}://{{host}}/v1', protocol: 'https', host: 'api.prod.com' }),
      makeEnv('Staging', { baseUrl: '{{protocol}}://{{host}}/v1', protocol: 'https', host: 'api.staging.com' })
    ];
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API', environments });

    // Both environments should appear as servers
    expect(content).toContain('description: Production');
    expect(content).toContain('description: Staging');

    // Template URL should be used
    expect(content).toContain('url: \'{protocol}://{host}/v1\'');

    // Production vars
    expect(content).toContain('api.prod.com');
    // Staging vars
    expect(content).toContain('api.staging.com');
  });

  it('should create a server entry per environment when baseUrl is a plain URL in each env', () => {
    const variables = {};
    const environments = [
      makeEnv('Production', { baseUrl: 'https://api.prod.com/v1' }),
      makeEnv('Staging', { baseUrl: 'https://api.staging.com/v1' })
    ];
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API', environments });

    // Both servers should appear
    expect(content).toMatch(/url:\s*'?https:\/\/api\.prod\.com\/v1'?/);
    expect(content).toMatch(/url:\s*'?https:\/\/api\.staging\.com\/v1'?/);

    // Descriptions should match env names
    expect(content).toContain('description: Production');
    expect(content).toContain('description: Staging');

    // No OpenAPI template variable syntax in servers section
    expect(content).not.toMatch(/url:\s*'?\{baseUrl\}'?/);
  });

  it('should use collection variables baseUrl when no environments are passed', () => {
    const variables = {
      baseUrl: '{{protocol}}://{{host}}/v1',
      protocol: 'https',
      host: 'api.example.com'
    };
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });

    // Should use collection baseUrl as template
    expect(content).toContain('url: \'{protocol}://{host}/v1\'');
    expect(content).toMatch(/default:\s*'?https'?/);
    expect(content).toContain('api.example.com');
    expect(content).toContain('description: Base Server');
  });

  it('should include both collection and env baseUrl as separate servers', () => {
    const variables = {
      baseUrl: '{{protocol}}://{{host}}/v1',
      protocol: 'https',
      host: 'api.default.com'
    };
    const environments = [
      makeEnv('Production', { baseUrl: 'https://api.prod.com/v1' }),
      makeEnv('Staging', { protocol: 'http', host: 'localhost' })
    ];
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API', environments });

    // Collection template server should be present
    expect(content).toContain('url: \'{protocol}://{host}/v1\'');
    expect(content).toContain('description: Base Server');

    // Production's plain URL override should also be present
    expect(content).toMatch(/url:\s*'?https:\/\/api\.prod\.com\/v1'?/);
    expect(content).toContain('description: Production');

    // Staging doesn't define baseUrl — no separate server entry
    expect(content).not.toContain('description: Staging');
  });

  it('should export both collection and env even when baseUrl resolves to the same value', () => {
    const variables = {
      baseUrl: 'https://api.example.com/v1'
    };
    const environments = [
      makeEnv('Production', { baseUrl: 'https://api.example.com/v1' })
    ];
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API', environments });

    // Both should appear as separate server entries
    expect(content).toContain('description: Base Server');
    expect(content).toContain('description: Production');
  });

  it('should skip environments that do not define baseUrl', () => {
    const variables = {
      baseUrl: '{{host}}/api'
    };
    const environments = [
      makeEnv('Production', { host: 'https://api.prod.com', baseUrl: 'https://api.prod.com/api' }),
      { uid: 'empty', name: 'Empty', variables: [] }
    ];
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API', environments });

    // Collection template and Production should have server entries
    expect(content).toContain('description: Base Server');
    expect(content).toContain('description: Production');

    // Empty env has no baseUrl — no server entry
    expect(content).not.toContain('description: Empty');
  });

  it('should export both envs even when baseUrl is identical', () => {
    const variables = {};
    const environments = [
      makeEnv('Production', { baseUrl: 'https://api.example.com/v1' }),
      makeEnv('Staging', { baseUrl: 'https://api.example.com/v1' })
    ];
    const items = makeItems(['{{baseUrl}}/users']);

    const { content } = exportApiSpec({ variables, items, name: 'Test API', environments });

    // Both should appear as separate server entries (each maps to a Bruno environment on import)
    expect(content).toContain('description: Production');
    expect(content).toContain('description: Staging');
  });
});
