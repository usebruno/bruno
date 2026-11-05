import jsyaml from 'js-yaml';
import SwaggerParser from '@apidevtools/swagger-parser';
import { test as isValidPathTemplate } from 'openapi-path-templating';
import { exportApiSpec } from './openapi-spec';
import path from 'path';
import openApiToBruno from '../../../../bruno-converters/src/openapi/openapi-to-bruno';

jest.mock('nanoid', () => ({
  ...jest.requireActual('nanoid')
}));

// Mock @usebruno/common to provide a working interpolate function
jest.mock('@usebruno/common', () => ({
  ...jest.requireActual('@usebruno/common'),
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
        pathname: path.join('collection', 'Active Users', 'Get users.bru'),
        depth: 2,
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

describe('exportApiSpec - duplicate operation variants', () => {
  const flattenItemsForExport = (items, parentPath = 'collection') => {
    return items.flatMap((item) => {
      if (item.type === 'folder') {
        return flattenItemsForExport(item.items || [], path.join(parentPath, item.name));
      }

      return [{
        ...item,
        pathname: path.join(parentPath, `${item.name}.bru`),
        depth: parentPath.split(path.sep).length
      }];
    });
  };

  it('should preserve duplicate path and method requests in x-bruno-variants', () => {
    const items = [
      {
        name: 'Get users',
        type: 'http-request',
        pathname: path.join('collection', 'Active Users', 'Get users.bru'),
        depth: 2,
        request: {
          url: '{{baseUrl}}/users',
          method: 'GET',
          params: [{ name: 'status', value: 'active', enabled: true, type: 'query' }],
          headers: [],
          body: {},
          auth: {}
        }
      },
      {
        name: 'Get users inactive',
        type: 'http-request',
        pathname: path.join('collection', 'Inactive Users', 'Get users inactive.bru'),
        depth: 2,
        request: {
          url: '{{baseUrl}}/users',
          method: 'GET',
          params: [{ name: 'status', value: 'inactive', enabled: true, type: 'query' }],
          headers: [],
          body: {},
          auth: {},
          vars: {
            req: [{ name: 'baseUrl', value: 'https://files.example.com', enabled: true }]
          }
        }
      },
      {
        name: 'Get users pending',
        type: 'http-request',
        pathname: path.join('collection', 'Pending Users', 'Get users pending.bru'),
        depth: 2,
        request: {
          url: '{{baseUrl}}/users',
          method: 'GET',
          params: [{ name: 'status', value: 'pending', enabled: true, type: 'query' }],
          headers: [],
          body: {},
          auth: {},
          vars: {
            req: [{ name: 'baseUrl', value: 'https://audit.example.com', enabled: true }]
          }
        }
      }
    ];

    const { content } = exportApiSpec({
      variables: { baseUrl: 'https://api.example.com' },
      items,
      name: 'Test API'
    });
    const parsed = require('js-yaml').load(content);
    const operation = parsed.paths['/users'].get;
    const variants = operation['x-bruno-variants'];

    expect(operation.summary).toBe('Get users');
    expect(operation.tags).toEqual(['Active Users']);
    expect(operation.parameters[0]).toMatchObject({ name: 'status', example: 'active' });
    expect(variants).toHaveLength(2);
    expect(variants[0].summary).toBe('Get users inactive');
    expect(variants[0].tags).toEqual(['Inactive Users']);
    expect(variants[0].parameters[0]).toMatchObject({ name: 'status', example: 'inactive' });
    expect(variants[0].servers[0].url).toBe('https://files.example.com');
    expect(variants[1].summary).toBe('Get users pending');
    expect(variants[1].tags).toEqual(['Pending Users']);
    expect(variants[1].parameters[0]).toMatchObject({ name: 'status', example: 'pending' });
    expect(variants[1].servers[0].url).toBe('https://audit.example.com');
  });

  it('should preserve distinct bodies for duplicate operations with the same name', () => {
    const items = [
      {
        name: 'Update user',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/users',
          method: 'POST',
          params: [],
          headers: [],
          body: { mode: 'json', json: '{"status":"active"}' },
          auth: { mode: 'basic' }
        }
      },
      {
        name: 'Update user',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/users',
          method: 'POST',
          params: [],
          headers: [],
          body: { mode: 'json', json: '{"status":"inactive"}' },
          auth: { mode: 'bearer' }
        }
      }
    ];

    const { content } = exportApiSpec({
      variables: { baseUrl: 'https://api.example.com' },
      items,
      name: 'Test API'
    });
    const parsed = require('js-yaml').load(content);
    const operation = parsed.paths['/users'].post;
    const variant = operation['x-bruno-variants'][0];

    expect(operation.requestBody.$ref).toBe('#/components/requestBodies/update_user');
    expect(variant.requestBody.$ref).toBe('#/components/requestBodies/update_user_1');
    expect(parsed.components.schemas.update_user.example).toEqual({ status: 'active' });
    expect(parsed.components.schemas.update_user_1.example).toEqual({ status: 'inactive' });
    expect(operation.security).toEqual({ update_user: [] });
    expect(variant.security).toEqual({ update_user_1: [] });
    expect(parsed.components.securitySchemes.update_user.scheme).toBe('basic');
    expect(parsed.components.securitySchemes.update_user_1.scheme).toBe('bearer');
  });

  it('should suffix conflicting component refs by request name', () => {
    const items = [
      {
        name: 'Sync user',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/users',
          method: 'POST',
          params: [],
          headers: [],
          body: { mode: 'json', json: '{"name":"Ada"}' },
          auth: {}
        }
      },
      {
        name: 'Sync user',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/users/{userId}',
          method: 'PUT',
          params: [],
          headers: [],
          body: { mode: 'json', json: '{"name":"Grace"}' },
          auth: {}
        }
      }
    ];

    const firstExport = exportApiSpec({
      variables: { baseUrl: 'https://api.example.com' },
      items,
      name: 'Test API'
    });
    const firstParsed = require('js-yaml').load(firstExport.content);

    expect(firstParsed.paths['/users'].post.requestBody.$ref).toBe('#/components/requestBodies/sync_user');
    expect(firstParsed.paths['/users/{userId}'].put.requestBody.$ref).toBe('#/components/requestBodies/sync_user_1');
    expect(Object.keys(firstParsed.components.schemas).sort()).toEqual(['sync_user', 'sync_user_1']);
  });

  it('should not reserve component names for requests without exported components', () => {
    const items = [
      {
        name: 'Sync user',
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
        name: 'Sync user',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/users/{userId}',
          method: 'PUT',
          params: [],
          headers: [],
          body: { mode: 'json', json: '{"name":"Grace"}' },
          auth: {}
        }
      }
    ];

    const { content } = exportApiSpec({
      variables: { baseUrl: 'https://api.example.com' },
      items,
      name: 'Test API'
    });
    const parsed = require('js-yaml').load(content);

    expect(parsed.paths['/users/{userId}'].put.requestBody.$ref).toBe('#/components/requestBodies/sync_user');
    expect(Object.keys(parsed.components.schemas)).toEqual(['sync_user']);
  });

  it('should round-trip duplicate operation variants without nesting x-bruno-variants', () => {
    const items = [
      {
        name: 'Get users',
        type: 'http-request',
        pathname: path.join('collection', 'Active Users', 'Get users.bru'),
        depth: 2,
        request: {
          url: '{{baseUrl}}/users',
          method: 'GET',
          params: [{ name: 'status', value: 'active', enabled: true, type: 'query' }],
          headers: [],
          body: {},
          auth: {}
        }
      },
      {
        name: 'Get users inactive',
        type: 'http-request',
        pathname: path.join('collection', 'Inactive Users', 'Get users inactive.bru'),
        depth: 2,
        request: {
          url: '{{baseUrl}}/users',
          method: 'GET',
          params: [{ name: 'status', value: 'inactive', enabled: true, type: 'query' }],
          headers: [],
          body: {},
          auth: {},
          vars: {
            req: [{ name: 'baseUrl', value: 'https://files.example.com', enabled: true }]
          }
        }
      },
      {
        name: 'Get users pending',
        type: 'http-request',
        pathname: path.join('collection', 'Pending Users', 'Get users pending.bru'),
        depth: 2,
        request: {
          url: '{{baseUrl}}/users',
          method: 'GET',
          params: [{ name: 'status', value: 'pending', enabled: true, type: 'query' }],
          headers: [],
          body: {},
          auth: {},
          vars: {
            req: [{ name: 'baseUrl', value: 'https://audit.example.com', enabled: true }]
          }
        }
      }
    ];
    const variables = { baseUrl: 'https://api.example.com' };
    const firstExport = exportApiSpec({ variables, items, name: 'Test API' });
    const imported = openApiToBruno(require('js-yaml').load(firstExport.content));
    const reExportItems = flattenItemsForExport(imported.items);

    const secondExport = exportApiSpec({
      variables: Object.fromEntries(imported.environments[0].variables.map((variable) => [variable.name, variable.value])),
      items: reExportItems,
      name: imported.name
    });
    const operation = require('js-yaml').load(secondExport.content).paths['/users'].get;

    expect(operation['x-bruno-variants']).toHaveLength(2);
    expect(operation['x-bruno-variants'].map((variant) => variant.summary)).toEqual([
      'Get users inactive',
      'Get users pending'
    ]);
    expect(operation['x-bruno-variants'].every((variant) => !variant['x-bruno-variants'])).toBe(true);
  });
});

describe('exportApiSpec - parameter and body value preservation', () => {
  it('should export form request body media types without trailing colons', () => {
    const variables = { baseUrl: 'https://api.example.com' };
    const items = [
      {
        name: 'Upload avatar',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/avatars',
          method: 'POST',
          params: [],
          headers: [],
          body: {
            mode: 'multipartForm',
            multipartForm: [{ name: 'avatar', value: 'avatar.png' }]
          },
          auth: {}
        }
      },
      {
        name: 'Create session',
        type: 'http-request',
        request: {
          url: '{{baseUrl}}/sessions',
          method: 'POST',
          params: [],
          headers: [],
          body: {
            mode: 'formUrlEncoded',
            formUrlEncoded: [{ name: 'email', value: 'ada@example.com' }]
          },
          auth: {}
        }
      }
    ];

    const { content } = exportApiSpec({ variables, items, name: 'Test API' });
    const parsed = require('js-yaml').load(content);

    expect(parsed.components.requestBodies.upload_avatar.content).toHaveProperty('multipart/form-data');
    expect(parsed.components.requestBodies.upload_avatar.content).not.toHaveProperty('multipart/form-data:');
    expect(parsed.components.requestBodies.create_session.content).toHaveProperty('application/x-www-form-urlencoded');
    expect(parsed.components.requestBodies.create_session.content).not.toHaveProperty('application/x-www-form-urlencoded:');
  });

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

describe('exportApiSpec - OAuth2 scope handling (BRU-3297)', () => {
  const makeOauth2Item = (grantType, scope) => ({
    name: 'Req',
    type: 'http-request',
    request: {
      url: 'https://api.example.com/users',
      method: 'GET',
      params: [],
      headers: [],
      body: {},
      auth: {
        mode: 'oauth2',
        oauth2: {
          grantType,
          authorizationUrl: 'https://auth.example.com/authorize',
          accessTokenUrl: 'https://auth.example.com/token',
          callbackUrl: 'https://app.example.com/callback',
          scope
        }
      }
    }
  });

  // No-throw checks for all 3 grant types affected by BRU-3297.
  describe.each([
    'authorization_code',
    'password',
    'client_credentials'
  ])('grant type %s', (grantType) => {
    it(`should not throw when scope is null`, () => {
      const items = [makeOauth2Item(grantType, null)];
      expect(() => exportApiSpec({ variables: {}, items, name: 'Test' })).not.toThrow();
    });

    it(`should not throw when scope is undefined`, () => {
      const items = [makeOauth2Item(grantType, undefined)];
      expect(() => exportApiSpec({ variables: {}, items, name: 'Test' })).not.toThrow();
    });
  });

  describe.each([
    ['authorization_code', 'authorizationCode'],
    ['password', 'password']
  ])('grant type %s emits valid scopes object', (grantType, flowKey) => {
    it(`should emit empty scopes object when scope is null (OpenAPI 3.0 requires scopes key)`, () => {
      const items = [makeOauth2Item(grantType, null)];
      const { content } = exportApiSpec({ variables: {}, items, name: 'Test' });
      expect(content).toContain(`${flowKey}:`);
      expect(content).toMatch(new RegExp(`${flowKey}:[\\s\\S]*?scopes:\\s*{}`));
    });

    it(`should emit empty scopes object when scope is empty string`, () => {
      const items = [makeOauth2Item(grantType, '')];
      const { content } = exportApiSpec({ variables: {}, items, name: 'Test' });
      expect(content).toMatch(new RegExp(`${flowKey}:[\\s\\S]*?scopes:\\s*{}`));
    });

    it(`should emit scope entry when scope is a non-empty string`, () => {
      const items = [makeOauth2Item(grantType, 'openid')];
      const { content } = exportApiSpec({ variables: {}, items, name: 'Test' });
      expect(content).toContain('openid:');
    });
  });
});

describe('exportApiSpec - non-HTTP request type filtering', () => {
  it('should keep only http-request and graphql-request items and not crash on others', () => {
    const items = [
      {
        name: 'HTTP Request',
        type: 'http-request',
        pathname: 'folder/http',
        depth: 2,
        request: {
          url: 'https://api.example.com/http',
          method: 'GET',
          params: [],
          headers: [],
          body: {},
          auth: {}
        },
        examples: []
      },
      {
        name: 'GraphQL Request',
        type: 'graphql-request',
        pathname: 'folder/graphql',
        depth: 2,
        request: {
          url: 'https://api.example.com/graphql',
          method: 'POST',
          params: [],
          headers: [],
          body: {},
          auth: {}
        },
        examples: []
      },
      {
        name: 'gRPC Request',
        type: 'grpc-request',
        request: { url: 'grpc://example.com/service' }
      },
      {
        name: 'WebSocket Request',
        type: 'ws-request',
        request: { url: 'wss://example.com/socket' }
      },
      {
        name: 'Folder',
        type: 'folder',
        items: []
      },
      {
        name: 'script.js',
        type: 'js'
      },
      {
        name: 'Transient',
        type: 'http-request',
        isTransient: true,
        pathname: 'folder/transient',
        depth: 2,
        request: {
          url: 'https://api.example.com/transient',
          method: 'GET',
          params: [],
          headers: [],
          body: {},
          auth: {}
        },
        examples: []
      }
    ];

    let result;
    expect(() => {
      result = exportApiSpec({ variables: {}, items, name: 'Test API' });
    }).not.toThrow();

    const spec = require('js-yaml').load(result.content);
    const pathKeys = Object.keys(spec.paths);

    expect(pathKeys).toHaveLength(2);
    expect(spec.paths['/http']).toBeDefined();
    expect(spec.paths['/http'].get).toBeDefined();
    expect(spec.paths['/graphql']).toBeDefined();
    expect(spec.paths['/graphql'].post).toBeDefined();
    expect(spec.paths['/transient']).toBeUndefined();
  });
});

describe('exportApiSpec - descriptions', () => {
  it('includes header and query param descriptions in the OpenAPI output', () => {
    const items = [
      {
        name: 'Described Request',
        type: 'http-request',
        request: {
          url: 'https://example.com/users',
          method: 'GET',
          params: [
            { name: 'q', value: 'search', enabled: true, type: 'query', description: 'Search query' }
          ],
          headers: [
            { name: 'X-Version', value: '2', enabled: true, description: 'API version header' }
          ],
          body: {},
          auth: {}
        }
      }
    ];

    const { content } = exportApiSpec({ variables: {}, items, name: 'Described API' });
    const spec = require('js-yaml').load(content);
    const operation = spec.paths['/users'].get;

    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'q', in: 'query', description: 'Search query' }),
        expect.objectContaining({ name: 'X-Version', in: 'header', description: 'API version header' })
      ])
    );
  });
});

describe('exportApiSpec - collections that do not have any requests in them', () => {
  it('still produces a usable spec file when the collection has no requests in it yet', () => {
    const result = exportApiSpec({ name: 'EmptyColl', variables: {}, items: [], environments: [] });
    const spec = jsyaml.load(result.content);
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info).toEqual({ title: 'EmptyColl', version: '1.0.0' });
    expect(spec.paths).toEqual({});
    expect(result.warnings).toEqual([]);
  });

  it('keeps the server addresses from each environment even when there are no requests', () => {
    const result = exportApiSpec({
      name: 'EmptyColl',
      variables: { baseUrl: 'https://api.test' },
      items: [],
      environments: [{ name: 'Local', variables: [{ name: 'baseUrl', value: 'https://local.test', enabled: true }] }]
    });
    const spec = jsyaml.load(result.content);
    expect(spec.paths).toEqual({});
    expect(spec.servers.map((server) => server.url)).toEqual(['https://api.test', 'https://local.test']);
  });

  it('treats a collection that only contains folders as having no requests', () => {
    const result = exportApiSpec({
      name: 'FoldersOnly',
      variables: {},
      items: [{ type: 'folder', name: 'A' }],
      environments: []
    });
    expect(jsyaml.load(result.content).paths).toEqual({});
  });

  it('refuses to guess when the list of requests is missing altogether', () => {
    expect(() => exportApiSpec({ name: 'NoList', variables: {}, environments: [] })).toThrow();
  });
});

describe('exportApiSpec - a variable that could not be resolved', () => {
  const itemWithUrl = (url) => ({
    name: 'Request',
    type: 'http-request',
    request: { url, method: 'GET', params: [], headers: [], body: {}, auth: {} }
  });

  const pathsIn = (content) =>
    String(content)
      .split('\n')
      .filter((line) => /^ {2}\//.test(line))
      .map((line) => line.trim().replace(/:$/, ''));

  it('leaves the placeholder readable in the path instead of percent encoding its braces', () => {
    const { content } = exportApiSpec({
      variables: { baseUrl: 'https://api.test' },
      items: [itemWithUrl('https://other.test/api/v1/{{secret-var}}/github')],
      name: 'Test API'
    });

    expect(pathsIn(content)).toEqual(['/api/v1/{secret-var}/github']);
    expect(content).not.toContain('%7B');
  });

  it('writes the placeholder the same way whether or not the url starts with the base url', () => {
    const viaBaseUrl = exportApiSpec({
      variables: { baseUrl: 'https://api.test' },
      items: [itemWithUrl('{{baseUrl}}/api/v1/{{secret-var}}/github')],
      name: 'Test API'
    });
    const viaLiteralHost = exportApiSpec({
      variables: { baseUrl: 'https://api.test' },
      items: [itemWithUrl('https://other.test/api/v1/{{secret-var}}/github')],
      name: 'Test API'
    });

    expect(pathsIn(viaLiteralHost.content)).toEqual(pathsIn(viaBaseUrl.content));
  });

  it('keeps a character the user genuinely encoded, which still means what it meant', () => {
    const { content } = exportApiSpec({
      variables: { baseUrl: 'https://api.test' },
      items: [itemWithUrl('https://other.test/api/v1/a%20b')],
      name: 'Test API'
    });

    expect(pathsIn(content)).toEqual(['/api/v1/a%20b']);
  });
});

describe('exportApiSpec - secrets and other placeholders left unfilled', () => {
  const itemWithUrl = (url, request = {}) => ({
    name: 'Request',
    type: 'http-request',
    pathname: path.join('collection', 'Request.bru'),
    depth: 1,
    request: { url, method: 'GET', params: [], headers: [], body: {}, auth: {}, ...request }
  });

  const exportUrl = (url, { variables = {}, environments, request } = {}) => {
    const { content } = exportApiSpec({ variables, items: [itemWithUrl(url, request)], name: 'Test API', environments });
    const spec = jsyaml.load(content);
    const [specPath] = Object.keys(spec.paths);
    return { content, spec, specPath, operation: spec.paths[specPath].get };
  };

  const pathParam = (name) => ({ name, in: 'path', required: true, example: `{{${name}}}`, schema: { type: 'string' } });
  const withSecrets = (...names) => [{ name: 'local', variables: names.map((name) => ({ name, value: '', enabled: true, secret: true })) }];

  const expectValidSpec = async (content) => {
    await expect(SwaggerParser.validate(jsyaml.load(content))).resolves.toBeDefined();

    Object.entries(jsyaml.load(content).paths).forEach(([specPath, pathItem]) => {
      expect(isValidPathTemplate(specPath)).toBe(true);
      const templateNames = [...specPath.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]);
      Object.values(pathItem).forEach((operation) => {
        const declared = (operation.parameters || []).filter((p) => p.in === 'path').map((p) => p.name);
        templateNames.forEach((name) => expect(declared).toContain(name));
      });
    });
  };

  it('turns a secret left in a request path into a path parameter with its placeholder as the example', async () => {
    const { content, specPath, operation } = exportUrl('https://test.com/{{secvar}}/{{var}}', { variables: { var: 'env-var-value' } });

    expect(specPath).toBe('/{secvar}/env-var-value');
    expect(operation.servers).toEqual([{ url: 'https://test.com' }]);
    expect(operation.parameters).toEqual([pathParam('secvar')]);
    await expectValidSpec(content);
  });

  it('gives every secret in the path its own path parameter and still fills in normal variables', async () => {
    const { content, specPath, operation } = exportUrl('https://hooks.test/{{$secrets.vault.token}}/x/{{secret1}}/y/{{variable}}', {
      variables: { variable: 'abc' }
    });

    expect(specPath).toBe('/{$secrets.vault.token}/x/{secret1}/y/abc');
    expect(operation.parameters).toEqual([pathParam('$secrets.vault.token'), pathParam('secret1')]);
    await expectValidSpec(content);
  });

  it('turns placeholders in a base url request path into path parameters', async () => {
    const { content, specPath, operation } = exportUrl('{{baseUrl}}/users/{{id}}/orders', { variables: { baseUrl: 'https://api.test' } });

    expect(specPath).toBe('/users/{id}/orders');
    expect(operation.parameters).toEqual([pathParam('id')]);
    await expectValidSpec(content);
  });

  it('fills request variables into a request level base url override path and leaves secrets as path parameters', async () => {
    const { content, specPath, operation } = exportUrl('{{baseUrl}}/files/{{folder}}/{{secret}}', {
      variables: { baseUrl: 'https://api.test' },
      request: {
        vars: {
          req: [
            { name: 'baseUrl', value: 'https://files.test', enabled: true },
            { name: 'folder', value: 'request-value', enabled: true }
          ]
        }
      }
    });

    expect(specPath).toBe('/files/request-value/{secret}');
    expect(operation.servers).toEqual([{ url: 'https://files.test' }]);
    expect(operation.parameters).toEqual([pathParam('secret')]);
    await expectValidSpec(content);
  });

  it('declares a repeated placeholder once and does not repeat a path param from the params list', () => {
    const { operation } = exportUrl('https://api.test/{{id}}/{{id}}/{{userId}}', {
      request: { params: [{ name: 'userId', value: '7', type: 'path', enabled: true }] }
    });

    expect(operation.parameters.filter((p) => p.in === 'path').map((p) => p.name)).toEqual(['userId', 'id']);
  });

  it('writes a secret used in an environment base url as its placeholder text', async () => {
    const environments = [{
      name: 'Prod',
      variables: [
        { name: 'baseUrl', value: 'https://{{region}}.api.test/{{apiKey}}', enabled: true },
        { name: 'region', value: 'eu', enabled: true },
        { name: 'apiKey', value: 'decrypted-secret', enabled: true, secret: true }
      ]
    }];

    const { content, spec } = exportUrl('{{baseUrl}}/users', { environments });

    expect(spec.servers).toEqual([{
      url: 'https://{region}.api.test/{apiKey}',
      variables: { region: { default: 'eu' }, apiKey: { default: '{{apiKey}}' } },
      description: 'Prod'
    }]);
    expect(content).not.toContain('decrypted-secret');
    await expectValidSpec(content);
  });

  it('exports an environment whose base url is itself a secret as a placeholder server', async () => {
    const environments = [
      { name: 'Prod', variables: [{ name: 'baseUrl', value: 'https://secret-host.test', enabled: true, secret: true }] },
      { name: 'Staging', variables: [{ name: 'baseUrl', value: 'https://staging.test', enabled: true }] }
    ];

    const { content, spec } = exportUrl('{{baseUrl}}/users', { environments });

    expect(spec.servers).toEqual([
      { url: '{baseUrl}', variables: { baseUrl: { default: '{{baseUrl}}' } }, description: 'Prod' },
      { url: 'https://staging.test', description: 'Staging' }
    ]);
    expect(content).not.toContain('secret-host');
    await expectValidSpec(content);
  });

  it('keeps the spelling of a secret left in a request host and writes its placeholder text as the default', async () => {
    const { content, operation } = exportUrl('https://{{tenantToken}}.api.test:{{port}}/data', { variables: { port: '8443' }, environments: withSecrets('tenantToken') });

    expect(operation.servers).toEqual([{
      url: 'https://{tenantToken}.api.test:8443',
      variables: { tenantToken: { default: '{{tenantToken}}' } }
    }]);
    await expectValidSpec(content);
  });

  it('uses a secret at the start of the url as the server', async () => {
    const { content, specPath, operation } = exportUrl('{{apiHost}}/users/{{id}}', { environments: withSecrets('apiHost') });

    expect(specPath).toBe('/users/{id}');
    expect(operation.servers).toEqual([{ url: '{apiHost}', variables: { apiHost: { default: '{{apiHost}}' } } }]);
    expect(operation.parameters).toEqual([pathParam('id')]);
    await expectValidSpec(content);
  });

  it('keeps a port after a secret at the start of the url in the server', async () => {
    const { content, specPath, operation } = exportUrl('{{apiHost}}:8080/users#top');

    expect(specPath).toBe('/users');
    expect(operation.servers[0].url).toBe('{apiHost}:8080');
    await expectValidSpec(content);
  });

  it('leaves the query string out of the path and exports query params that are only in the url', () => {
    const { specPath, operation } = exportUrl('{{baseUrl}}/users?key={{apiKey}}&page=1&page=2', { variables: { baseUrl: 'https://api.test' } });

    expect(specPath).toBe('/users');
    expect(isValidPathTemplate(specPath)).toBe(true);
    expect(operation.parameters).toEqual([
      { name: 'key', in: 'query', description: '', required: true, example: '{{apiKey}}' },
      { name: 'page', in: 'query', description: '', required: true, example: '1' }
    ]);
  });

  it('exports a query param written without a value as an empty one and ignores the fragment', () => {
    const { operation } = exportUrl('https://api.test/x?flag&q=a=b#section');

    expect(operation.parameters.map((param) => [param.name, param.example])).toEqual([['flag', ''], ['q', 'a=b']]);
  });

  it('does not repeat a query param that is already in the params list', () => {
    const { operation } = exportUrl('https://api.test/x?page=1&q=find', {
      request: { params: [{ name: 'page', value: '1', type: 'query', enabled: true }] }
    });

    expect(operation.parameters.map((p) => [p.name, p.in])).toEqual([['page', 'query'], ['q', 'query']]);
  });

  it('writes the placeholder text as the server default when the environment has a secret and a plain variable of the same name', () => {
    const environments = [{
      name: 'Prod',
      variables: [
        { name: 'baseUrl', value: 'https://api.test/{{apiKey}}', enabled: true },
        { name: 'apiKey', value: 'decrypted-secret', enabled: true, secret: true },
        { name: 'apiKey', value: 'plain-value', enabled: true }
      ]
    }];

    const { content, spec } = exportUrl('{{baseUrl}}/users', { environments });

    expect(spec.servers[0].variables).toEqual({ apiKey: { default: '{{apiKey}}' } });
    expect(content).not.toContain('plain-value');
  });

  it('takes the host spelling only from the host, not from a placeholder in the path', () => {
    const { operation } = exportUrl('https://{{Tenant}}.api.test/{{alias}}', { variables: { alias: '{{tenant}}' }, environments: withSecrets('Tenant') });

    expect(operation.servers).toEqual([{ url: 'https://{Tenant}.api.test', variables: { Tenant: { default: '{{Tenant}}' } } }]);
  });

  it('keeps OAuth2 and process env placeholders out of the path and host as valid placeholders', async () => {
    const { content, specPath, operation } = exportUrl('https://{{process.env.HOST}}/x/{{$oauth2.cred.access_token}}');

    expect(specPath).toBe('/x/{$oauth2.cred.access_token}');
    expect(operation.servers).toEqual([{
      url: 'https://{process.env.HOST}',
      variables: { 'process.env.HOST': { default: '{{process.env.HOST}}' } }
    }]);
    expect(operation.parameters).toEqual([pathParam('$oauth2.cred.access_token')]);
    await expectValidSpec(content);
  });

  it('keeps the spelling of a secret that reaches the host through another variable', async () => {
    const { content, operation } = exportUrl('{{apiRoot}}/data', { variables: { apiRoot: 'https://{{tenantSecret}}.api.test' }, environments: withSecrets('tenantSecret') });

    expect(operation.servers).toEqual([{
      url: 'https://{tenantSecret}.api.test',
      variables: { tenantSecret: { default: '{{tenantSecret}}' } }
    }]);
    await expectValidSpec(content);
  });

  it('never fills in a secret, even when the caller passes its value', async () => {
    const { content, specPath, operation } = exportUrl('https://test.com/{{secvar}}/{{process.env.TOKEN}}/{{$secrets.vault.token}}/{{$oauth2.cred.access_token}}', {
      variables: {
        'secvar': 'leaked-env-secret',
        'process.env.TOKEN': 'leaked-dotenv-secret',
        'process': { env: { TOKEN: 'leaked-nested-dotenv-secret' } },
        '$secrets.vault.token': 'leaked-vault-secret',
        '$secrets': { vault: { token: 'leaked-nested-vault-secret' } },
        '$oauth2.cred.access_token': 'leaked-oauth2-secret'
      },
      environments: withSecrets('secvar')
    });

    expect(content).not.toMatch(/leaked-/);
    expect(specPath).toBe('/{secvar}/{process.env.TOKEN}/{$secrets.vault.token}/{$oauth2.cred.access_token}');
    expect(operation.parameters.map((param) => param.name)).toEqual(['secvar', 'process.env.TOKEN', '$secrets.vault.token', '$oauth2.cred.access_token']);
    await expectValidSpec(content);
  });

  it('never writes a secret passed by the caller into a server default', () => {
    const { content } = exportUrl('{{baseUrl}}/x', {
      variables: { baseUrl: 'https://{{apiKey}}.api.test', apiKey: 'leaked-api-key' },
      environments: withSecrets('apiKey')
    });

    expect(content).not.toContain('leaked-api-key');
    expect(jsyaml.load(content).servers.find((server) => server.description === 'Base Server').variables).toEqual({ apiKey: { default: '{{apiKey}}' } });
  });

  it('re-imports placeholders Bruno fills in itself without a variable that would hide them', () => {
    const environments = [{ name: 'Prod', variables: [{ name: 'baseUrl', value: 'https://{{process.env.HOST}}/{{$secrets.vault.path}}', enabled: true }] }];
    const { content } = exportApiSpec({ variables: {}, items: [itemWithUrl('{{baseUrl}}/data')], name: 'Test API', environments });

    const environment = openApiToBruno(jsyaml.load(content)).environments.find((env) => env.name === 'Prod');
    expect(environment.variables.map((v) => [v.name, v.value])).toEqual([['baseUrl', 'https://{{process.env.HOST}}/{{$secrets.vault.path}}']]);
  });

  it('re-imports a secret from a request host as an empty secret in every environment', () => {
    const environments = [
      { name: 'Prod', variables: [{ name: 'baseUrl', value: 'https://api.test', enabled: true }] },
      { name: 'Staging', variables: [{ name: 'baseUrl', value: 'https://staging.test', enabled: true }] }
    ];
    const { content } = exportApiSpec({ variables: {}, items: [itemWithUrl('https://{{tenantSecret}}.other.test/data')], name: 'Test API', environments: [...environments, ...withSecrets('tenantSecret')] });

    openApiToBruno(jsyaml.load(content)).environments
      .filter((env) => ['Prod', 'Staging'].includes(env.name))
      .forEach((env) => expect(env.variables.find((v) => v.name === 'tenantSecret')).toMatchObject({ value: '', secret: true }));
  });

  it('re-imports into Bruno with secrets still pointing at the variables they came from', () => {
    const environments = [{
      name: 'Prod',
      variables: [
        { name: 'baseUrl', value: 'https://{{region}}.api.test/{{apiKey}}', enabled: true },
        { name: 'region', value: 'eu', enabled: true },
        { name: 'apiKey', value: 'decrypted-secret', enabled: true, secret: true },
        { name: 'tenantToken', value: '', enabled: true, secret: true }
      ]
    }];
    const { content } = exportApiSpec({
      variables: { var: 'env-var-value' },
      items: [
        itemWithUrl('https://test.com/{{secvar}}/{{var}}'),
        { ...itemWithUrl('https://{{tenantToken}}.api.test/data'), name: 'Tenant', pathname: path.join('collection', 'Tenant.bru') }
      ],
      name: 'Test API',
      environments
    });

    const collection = openApiToBruno(jsyaml.load(content));
    const [request, tenant] = collection.items;

    expect(request.request.url).toBe('{{baseUrl}}/:secvar/env-var-value');
    expect(request.request.params.filter((p) => p.type === 'path').map((p) => [p.name, p.value])).toEqual([['secvar', '{{secvar}}']]);
    expect(tenant.request.vars.req.map((v) => [v.name, v.value])).toEqual([['baseUrl', 'https://{{tenantToken}}.api.test']]);
    expect(collection.environments[0].variables.find((v) => v.name === 'apiKey')).toMatchObject({ value: '', secret: true });
  });
});

describe('exportApiSpec - export invariants across url shapes', () => {
  // Every secret below has a value on purpose, so a leak shows up as one of these strings
  const SECRET_VALUE = /secret-value/;
  const environments = [{
    name: 'local',
    variables: [
      { name: 'secvar', value: 'secret-value-secvar', enabled: true, secret: true },
      { name: 'apiKey', value: 'secret-value-apikey', enabled: true, secret: true },
      { name: 'tenantSecret', value: 'secret-value-tenant', enabled: true, secret: true },
      { name: 'secretPort', value: 'secret-value-port', enabled: true, secret: true },
      { name: 'region', value: 'secret-value-region', enabled: true, secret: true },
      { name: 'pass', value: 'secret-value-pass', enabled: true, secret: true },
      { name: 'var', value: 'env-var-value', enabled: true }
    ]
  }];
  const declaredSecrets = environments[0].variables.filter((v) => v.secret).map((v) => v.name);
  const variables = { baseUrl: 'https://api.test', var: 'env-var-value' };

  const request = (url, params = []) => ({ url, params });
  const idParam = [{ name: 'id', value: '1', type: 'path', enabled: true }];

  const exportRequests = (requests) => {
    const items = requests.map(({ url, params }, index) => ({
      name: `Request ${index + 1}`,
      type: 'http-request',
      pathname: path.join('collection', `Request ${index + 1}.bru`),
      depth: 1,
      request: { url, method: 'GET', params, headers: [], body: {}, auth: {} }
    }));
    const { content } = exportApiSpec({ variables, items, name: 'Test API', environments });
    return { content, spec: jsyaml.load(content) };
  };

  const operationsOf = (spec) =>
    Object.entries(spec.paths).flatMap(([specPath, pathItem]) =>
      Object.values(pathItem).flatMap((operation) => [operation, ...(operation['x-bruno-variants'] || [])].map((op) => ({ specPath, op }))));

  const expectInvariants = async ({ content, spec }, { requestCount, hasSchemalessParams }) => {
    expect(content).not.toMatch(SECRET_VALUE);

    const operations = operationsOf(spec);
    expect(operations).toHaveLength(requestCount);

    operations.forEach(({ specPath, op }) => {
      expect(specPath.startsWith('/')).toBe(true);
      expect(isValidPathTemplate(specPath)).toBe(true);
      const templateNames = [...new Set([...specPath.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]))].sort();
      const declaredNames = (op.parameters || []).filter((p) => p.in === 'path').map((p) => p.name).sort();
      expect(declaredNames).toEqual(templateNames);
    });

    [...(spec.servers || []), ...operations.flatMap(({ op }) => op.servers || [])].forEach((server) => {
      expect(server.url).not.toBe('null');
      expect(server.url).not.toContain('{{');
      [...server.url.matchAll(/\{([^{}]+)\}/g)].forEach(([, name]) => expect(typeof server.variables?.[name]?.default).toBe('string'));
    });

    // OSS query, header and params-list path params carry no schema yet, which swagger-parser rejects
    if (!hasSchemalessParams) {
      await expect(SwaggerParser.validate(jsyaml.load(content))).resolves.toBeDefined();
    }

    const reimported = openApiToBruno(jsyaml.load(content));
    reimported.environments.forEach((environment) => environment.variables
      .filter((v) => v.secret)
      .forEach((v) => expect(declaredSecrets).toContain(v.name)));
  };

  const rows = [
    ['a secret and a variable in the path', [request('https://test.com/{{secvar}}/{{var}}')], { paths: ['/{secvar}/env-var-value'], server: { url: 'https://test.com' } }],
    ['prompt variables stay in the path and keep two requests apart', [request('{{baseUrl}}/users/{{?User Id}}'), request('{{baseUrl}}/users/{{?User Id}}/posts')], { paths: ['/users/{?User Id}', '/users/{?User Id}/posts'] }],
    ['a secret port', [request('http://localhost:{{secretPort}}/api/users')], { paths: ['/api/users'], server: { url: 'http://localhost:{secretPort}', variables: { secretPort: { default: '{{secretPort}}' } } } }],
    ['a secret port after a host', [request('https://api.test:{{secretPort}}/data')], { paths: ['/data'], server: { url: 'https://api.test:{secretPort}', variables: { secretPort: { default: '{{secretPort}}' } } } }],
    ['a secret at the start with a bruno path param', [request('{{apiKey}}/users/:id', idParam)], { paths: ['/users/{id}'], server: { url: '{apiKey}', variables: { apiKey: { default: '{{apiKey}}' } } }, hasSchemalessParams: true }],
    ['a base url with a bruno path param', [request('{{baseUrl}}/users/:id', idParam)], { paths: ['/users/{id}'], hasSchemalessParams: true }],
    ['a literal port after the base url host is not mistaken for the base url', [request('https://api.test:8443/data')], { paths: ['/data'], server: { url: 'https://api.test:8443' } }],
    ['a url without a scheme and a secret in the host', [request('api-{{region}}.test/x')], { paths: ['/x'], server: { url: 'api-{region}.test', variables: { region: { default: '{{region}}' } } } }],
    ['a url without a scheme and a secret port', [request('localhost:{{secretPort}}/x')], { paths: ['/x'], server: { url: 'localhost:{secretPort}', variables: { secretPort: { default: '{{secretPort}}' } } } }],
    ['a plain url without a scheme', [request('localhost:8080/items')], { paths: ['/items'], server: { url: 'localhost:8080' } }],
    ['secrets and prompt variables in the query', [request('{{baseUrl}}/search?key={{secvar}}&q={{?Search term}}')], { paths: ['/search'], hasSchemalessParams: true }],
    ['a secret in the host keeps its spelling', [request('https://{{tenantSecret}}.api.test/data')], { paths: ['/data'], server: { url: 'https://{tenantSecret}.api.test', variables: { tenantSecret: { default: '{{tenantSecret}}' } } } }],
    ['credentials with a secret are dropped from the server', [request('https://user:{{pass}}@api.test/z')], { paths: ['/z'], server: { url: 'https://api.test' } }],
    ['an unknown variable at the start', [request('{{nope}}/ping')], { paths: ['/ping'], server: { url: '{nope}', variables: { nope: { default: '' } } } }],
    ['a relative url with a secret', [request('/relative/{{secvar}}')], { paths: ['/relative/{secvar}'] }],
    ['a secret scheme', [request('{{secvar}}://api.test/users')], { paths: ['/users'], server: { url: '{secvar}://api.test', variables: { secvar: { default: '{{secvar}}' } } } }],
    ['a process env scheme', [request('{{process.env.PROTOCOL}}://api.test/users')], { paths: ['/users'], server: { url: '{process.env.PROTOCOL}://api.test', variables: { 'process.env.PROTOCOL': { default: '{{process.env.PROTOCOL}}' } } } }]
  ];

  it.each(rows)('%s', async (label, requests, expected) => {
    const exported = exportRequests(requests);

    expect(Object.keys(exported.spec.paths)).toEqual(expected.paths);
    if (expected.server) {
      expect(operationsOf(exported.spec)[0].op.servers).toEqual([expected.server]);
    }
    await expectInvariants(exported, { requestCount: requests.length, hasSchemalessParams: expected.hasSchemalessParams });
  });

  it('exports query params from a url with a prompt variable without inventing new ones', () => {
    const { spec } = exportRequests([request('{{baseUrl}}/search?key={{secvar}}&q={{?Search term}}')]);

    expect(operationsOf(spec)[0].op.parameters.map((p) => [p.in, p.name, p.example])).toEqual([
      ['query', 'key', '{{secvar}}'],
      ['query', 'q', '{{?Search term}}']
    ]);
  });

  it.each([
    ['https://slash.test/', 'https://slash.test/users', '/users'],
    ['https://slash.test/api/', 'https://slash.test/api/users', '/users'],
    ['https://slash.test/', 'https://slash.test/', '/']
  ])('treats a request under the base url %s as a path on the root server', (baseUrl, url, expectedPath) => {
    const items = [{ name: 'Request', type: 'http-request', pathname: path.join('collection', 'Request.bru'), depth: 1, request: { url, method: 'GET', params: [], headers: [], body: {}, auth: {} } }];
    const slashEnvironments = [{ name: 'local', variables: [{ name: 'baseUrl', value: baseUrl, enabled: true }] }];
    const spec = jsyaml.load(exportApiSpec({ variables: {}, items, name: 'Test API', environments: slashEnvironments }).content);

    expect(Object.keys(spec.paths)).toEqual([expectedPath]);
    expect(spec.paths[expectedPath].get.servers).toBeUndefined();
  });

  it('gives a request that only shares a prefix with the base url its own server', () => {
    const items = [{ name: 'Request', type: 'http-request', pathname: path.join('collection', 'Request.bru'), depth: 1, request: { url: 'https://slash.test/apiusers', method: 'GET', params: [], headers: [], body: {}, auth: {} } }];
    const prefixEnvironments = [{ name: 'local', variables: [{ name: 'baseUrl', value: 'https://slash.test/api', enabled: true }] }];
    const spec = jsyaml.load(exportApiSpec({ variables: {}, items, name: 'Test API', environments: prefixEnvironments }).content);

    expect(spec.paths['/apiusers'].get.servers).toEqual([{ url: 'https://slash.test' }]);
  });

  it('keeps an empty default for a plain collection variable used in an environment base url', () => {
    const items = [{ name: 'Request', type: 'http-request', pathname: path.join('collection', 'Request.bru'), depth: 1, request: { url: '{{baseUrl}}/x', method: 'GET', params: [], headers: [], body: {}, auth: {} } }];
    const plainEnvironments = [{ name: 'local', variables: [{ name: 'baseUrl', value: 'https://api.test/{{apiVersion}}', enabled: true }] }];
    const { content } = exportApiSpec({ variables: { apiVersion: 'v2' }, items, name: 'Test API', environments: plainEnvironments });

    const localServer = jsyaml.load(content).servers.find((server) => server.description === 'local');
    expect(localServer.variables).toEqual({ apiVersion: { default: '' } });

    const reimported = openApiToBruno(jsyaml.load(content)).environments.find((e) => e.name === 'local');
    expect(reimported.variables.find((v) => v.name === 'apiVersion')).toMatchObject({ value: '', secret: false });
  });
});
