import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi server variables to environment variables', () => {
  it('should create individual environment variables from server variables', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Server Variables API'
  version: '1.0.0'
paths:
  /test:
    get:
      summary: 'Test'
      responses:
        '200':
          description: 'OK'
servers:
  - url: '{protocol}://{host}:{port}/v1'
    description: 'Main Server'
    variables:
      protocol:
        default: 'https'
      host:
        default: 'api.example.com'
      port:
        default: '443'
`;
    const result = openApiToBruno(spec);
    const env = result.environments[0];
    expect(env.name).toBe('Main Server');
    expect(env.variables).toHaveLength(4); // baseUrl + 3 variables

    const baseUrl = env.variables.find((v) => v.name === 'baseUrl');
    expect(baseUrl.value).toBe('{{protocol}}://{{host}}:{{port}}/v1');
    expect(baseUrl.enabled).toBe(true);
    expect(baseUrl.type).toBe('text');

    const protocol = env.variables.find((v) => v.name === 'protocol');
    expect(protocol.value).toBe('https');
    expect(protocol.enabled).toBe(true);
    expect(protocol.type).toBe('text');

    const host = env.variables.find((v) => v.name === 'host');
    expect(host.value).toBe('api.example.com');

    const port = env.variables.find((v) => v.name === 'port');
    expect(port.value).toBe('443');
  });

  it('should use plain resolved URL when server has no variables', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'No Variables API'
  version: '1.0.0'
paths:
  /test:
    get:
      summary: 'Test'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://api.example.com/v1'
`;
    const result = openApiToBruno(spec);
    const env = result.environments[0];
    expect(env.variables).toHaveLength(1);
    expect(env.variables[0].name).toBe('baseUrl');
    expect(env.variables[0].value).toBe('https://api.example.com/v1');
  });

  it('should handle multiple servers with different variables', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Multi Server API'
  version: '1.0.0'
paths:
  /test:
    get:
      summary: 'Test'
      responses:
        '200':
          description: 'OK'
servers:
  - url: '{protocol}://{host}/v1'
    description: 'Production'
    variables:
      protocol:
        default: 'https'
      host:
        default: 'api.prod.com'
  - url: 'https://staging.example.com/v1'
    description: 'Staging'
`;
    const result = openApiToBruno(spec);

    // Production env: template + variables
    const prodEnv = result.environments[0];
    expect(prodEnv.name).toBe('Production');
    expect(prodEnv.variables).toHaveLength(3); // baseUrl + protocol + host
    expect(prodEnv.variables.find((v) => v.name === 'baseUrl').value).toBe('{{protocol}}://{{host}}/v1');
    expect(prodEnv.variables.find((v) => v.name === 'protocol').value).toBe('https');
    expect(prodEnv.variables.find((v) => v.name === 'host').value).toBe('api.prod.com');

    // Staging env: plain URL, no extra variables
    const stagingEnv = result.environments[1];
    expect(stagingEnv.name).toBe('Staging');
    expect(stagingEnv.variables).toHaveLength(1);
    expect(stagingEnv.variables[0].value).toBe('https://staging.example.com/v1');
  });

  it('should use first enum value when no default is provided', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Enum Only API'
  version: '1.0.0'
paths:
  /test:
    get:
      summary: 'Test'
      responses:
        '200':
          description: 'OK'
servers:
  - url: '{protocol}://example.com'
    variables:
      protocol:
        enum:
          - https
          - http
`;
    const result = openApiToBruno(spec);
    const env = result.environments[0];
    const protocolVar = env.variables.find((v) => v.name === 'protocol');
    expect(protocolVar.value).toBe('https');
  });

  it('should use empty string when variable has neither default nor enum', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'No Default No Enum API'
  version: '1.0.0'
paths:
  /test:
    get:
      summary: 'Test'
      responses:
        '200':
          description: 'OK'
servers:
  - url: '{basePath}/v1'
    variables:
      basePath: {}
`;
    const result = openApiToBruno(spec);
    const env = result.environments[0];
    const basePathVar = env.variables.find((v) => v.name === 'basePath');
    expect(basePathVar.value).toBe('');
  });

  it('should strip trailing slash from template baseUrl', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Trailing Slash API'
  version: '1.0.0'
paths:
  /test:
    get:
      summary: 'Test'
      responses:
        '200':
          description: 'OK'
servers:
  - url: '{protocol}://{host}/'
    variables:
      protocol:
        default: 'https'
      host:
        default: 'api.example.com'
`;
    const result = openApiToBruno(spec);
    const env = result.environments[0];
    const baseUrl = env.variables.find((v) => v.name === 'baseUrl');
    expect(baseUrl.value).toBe('{{protocol}}://{{host}}');
  });

  it('should use server.name for environment name when present', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Named Server API', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            summary: 'Test',
            responses: { 200: { description: 'OK' } }
          }
        }
      },
      servers: [
        {
          url: 'https://api.example.com',
          name: 'Production',
          description: 'Production server'
        },
        {
          url: 'https://staging.example.com',
          description: 'Staging server'
        },
        {
          url: 'https://dev.example.com'
        }
      ]
    };
    const result = openApiToBruno(spec);
    expect(result.environments[0].name).toBe('Production'); // prefers name over description
    expect(result.environments[1].name).toBe('Staging server'); // falls back to description
    expect(result.environments[2].name).toBe('Environment 3'); // falls back to index
  });
});

describe('server variables whose default is their own placeholder', () => {
  const spec = `
openapi: '3.0.0'
info:
  title: 'Placeholder Defaults API'
  version: '1.0.0'
servers:
  - url: 'https://{region}.api.test/{apiKey}'
    description: 'Prod'
    variables:
      region:
        default: 'eu'
      apiKey:
        default: '{{apiKey}}'
paths:
  /data:
    get:
      summary: 'Tenant data'
      servers:
        - url: 'https://{tenantToken}.api.test'
          variables:
            tenantToken:
              default: '{{tenantToken}}'
      responses:
        '200':
          description: 'OK'
`;

  it('imports the variable as an empty secret in the environment', () => {
    const env = openApiToBruno(spec).environments[0];

    expect(env.variables.find((v) => v.name === 'apiKey')).toMatchObject({ value: '', secret: true });
    expect(env.variables.find((v) => v.name === 'region')).toMatchObject({ value: 'eu', secret: false });
  });

  it('imports a server that is only a secret base url as a single empty secret base url', () => {
    const secretBaseUrlSpec = `
openapi: '3.0.0'
info:
  title: 'Secret Base Url API'
  version: '1.0.0'
servers:
  - url: '{baseUrl}'
    description: 'Prod'
    variables:
      baseUrl:
        default: '{{baseUrl}}'
paths: {}
`;
    const env = openApiToBruno(secretBaseUrlSpec).environments[0];

    expect(env.variables.map((v) => [v.name, v.value, v.secret])).toEqual([['baseUrl', '', true]]);
  });

  it('does not add a request variable that would hide the environment value', () => {
    const request = openApiToBruno(spec).items[0];

    expect(request.request.vars.req.map((v) => [v.name, v.value])).toEqual([['baseUrl', 'https://{{tenantToken}}.api.test']]);
  });
});

describe('server variables that bruno resolves itself or that only a request uses', () => {
  const RESERVED_NAME = /^(\$|process(\.|$))/;
  const ok = { 200: { description: 'OK' } };
  const server = (url, defaults, description) => ({
    url,
    ...(description && { description }),
    variables: Object.fromEntries(Object.entries(defaults).map(([name, value]) => [name, typeof value === 'object' ? value : { default: value }]))
  });
  const operation = (servers) => ({ get: { responses: ok, ...(servers && { servers }) } });
  const envVars = (collection) => collection.environments.map((env) => env.variables.map((v) => [v.name, v.value, v.secret]));
  const requestVars = (collection) => collection.items.map((item) => (item.request.vars?.req || []).map((v) => [v.name, v.value]));

  const rows = [
    ['R1 a plain default', { servers: [server('https://{tenant}.api.test', { tenant: 'eu' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{tenant}}.api.test', false], ['tenant', 'eu', false]]] }],
    ['R2 its own placeholder', { servers: [server('https://{tenant}.api.test', { tenant: '{{tenant}}' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{tenant}}.api.test', false], ['tenant', '', true]]] }],
    ['R3 an empty default', { servers: [server('https://{tenant}.api.test', { tenant: '' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{tenant}}.api.test', false], ['tenant', '', false]]] }],
    ['R4 an enum without a default', { servers: [server('https://{tenant}.api.test', { tenant: { enum: ['a', 'b'] } }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{tenant}}.api.test', false], ['tenant', 'a', false]]] }],
    ['R5 a process env placeholder', { servers: [server('https://{process.env.HOST}/v1', { 'process.env.HOST': '{{process.env.HOST}}' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{process.env.HOST}}/v1', false]]] }],
    ['R6 a vault secret placeholder', { servers: [server('https://api.test/{$secrets.v.path}', { '$secrets.v.path': '{{$secrets.v.path}}' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://api.test/{{$secrets.v.path}}', false]]] }],
    ['R7 an OAuth2 placeholder', { servers: [server('https://api.test/{$oauth2.c.access_token}', { '$oauth2.c.access_token': '{{$oauth2.c.access_token}}' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://api.test/{{$oauth2.c.access_token}}', false]]] }],
    ['R8 a reserved name with a real default from another tool', { servers: [server('https://{process.env.HOST}', { 'process.env.HOST': 'api.test' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{process.env.HOST}}', false], ['process.env.HOST', 'api.test', false]]] }],
    ['R9 another variable as the default', { servers: [server('https://{tenant}.api.test', { tenant: '{{other}}' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{tenant}}.api.test', false], ['tenant', '{{other}}', false]]] }],
    ['O1 a secret in a request server', { servers: [server('https://api.test', {}, 'Prod')], paths: { '/x': operation([server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' })]) } },
      { envs: [[['baseUrl', 'https://api.test', false], ['tenantSecret', '', true]]], requests: [[['baseUrl', 'https://{{tenantSecret}}.api.test']]] }],
    ['O2 the same secret in two request servers', { servers: [server('https://api.test', {}, 'Prod')], paths: {
      '/x': operation([server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' })]),
      '/y': operation([server('https://{tenantSecret}.other.test', { tenantSecret: '{{tenantSecret}}' })])
    } }, { envs: [[['baseUrl', 'https://api.test', false], ['tenantSecret', '', true]]] }],
    ['O3 a request secret that is already a root secret', { servers: [server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' }, 'Prod')], paths: {
      '/x': operation([server('https://{tenantSecret}.other.test', { tenantSecret: '{{tenantSecret}}' })])
    } }, { envs: [[['baseUrl', 'https://{{tenantSecret}}.api.test', false], ['tenantSecret', '', true]]] }],
    ['O4 a request secret whose name is a plain root variable', { servers: [server('https://{tenant}.api.test', { tenant: 'eu' }, 'Prod')], paths: {
      '/x': operation([server('https://{tenant}.other.test', { tenant: '{{tenant}}' })])
    } }, { envs: [[['baseUrl', 'https://{{tenant}}.api.test', false], ['tenant', 'eu', false]]] }],
    ['O5 a plain variable in a request server', { servers: [server('https://api.test', {}, 'Prod')], paths: { '/x': operation([server('https://{region}.api.test', { region: 'eu' })]) } },
      { envs: [[['baseUrl', 'https://api.test', false]]], requests: [[['baseUrl', 'https://{{region}}.api.test'], ['region', 'eu']]] }],
    ['O6 a process env placeholder in a request server', { servers: [server('https://api.test', {}, 'Prod')], paths: { '/x': operation([server('https://{process.env.HOST}', { 'process.env.HOST': '{{process.env.HOST}}' })]) } },
      { envs: [[['baseUrl', 'https://api.test', false]]], requests: [[['baseUrl', 'https://{{process.env.HOST}}']]] }],
    ['O7 a secret in a path item server', { servers: [server('https://api.test', {}, 'Prod')], paths: {
      '/x': { servers: [server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' })], ...operation() }
    } }, { envs: [[['baseUrl', 'https://api.test', false], ['tenantSecret', '', true]]] }],
    ['O8 a secret in a variant request server', { servers: [server('https://api.test', {}, 'Prod')], paths: {
      '/x': { get: { 'responses': ok, 'x-bruno-variants': [{ summary: 'Variant', responses: ok, servers: [server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' })] }] } }
    } }, { envs: [[['baseUrl', 'https://api.test', false], ['tenantSecret', '', true]]] }],
    ['O9 a request secret when there is no root server', { paths: { '/x': operation([server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' })]) } },
      { envs: [] }],
    ['O10 a request secret with two root servers', { servers: [server('https://api.test', {}, 'Prod'), server('https://staging.test', {}, 'Staging')], paths: {
      '/x': operation([server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' })])
    } }, { envs: [
      [['baseUrl', 'https://api.test', false], ['tenantSecret', '', true]],
      [['baseUrl', 'https://staging.test', false], ['tenantSecret', '', true]]
    ] }],
    ['R10 a bare reserved name and a dynamic value', { servers: [server('https://{process}.api.test/{$randomInt}', { process: '{{process}}', $randomInt: '{{$randomInt}}' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{process}}.api.test/{{$randomInt}}', false]]] }],
    ['R11 names that only start like a reserved one', { servers: [server('https://{processor}.{myprocess.x}.test', { 'processor': '{{processor}}', 'myprocess.x': '{{myprocess.x}}' }, 'Prod')], paths: { '/x': operation() } },
      { envs: [[['baseUrl', 'https://{{processor}}.{{myprocess.x}}.test', false], ['processor', '', true], ['myprocess.x', '', true]]] }],
    ['O11 a dynamic value or an invalid name in a request server', { servers: [server('https://api.test', {}, 'Prod')], paths: {
      '/x': operation([server('https://{$randomInt}.{tenant id}.api.test', { '$randomInt': '{{$randomInt}}', 'tenant id': '{{tenant id}}' })])
    } }, { envs: [[['baseUrl', 'https://api.test', false]]] }],
    ['O12 a secret only in the second request server, which Bruno does not use', { servers: [server('https://api.test', {}, 'Prod')], paths: {
      '/x': operation([server('https://api.test', {}), server('https://{tenantSecret}.api.test', { tenantSecret: '{{tenantSecret}}' })])
    } }, { envs: [[['baseUrl', 'https://api.test', false]]] }]
  ];

  it.each(rows)('%s', (label, { servers, paths }, expected) => {
    const collection = openApiToBruno({ openapi: '3.0.0', info: { title: 'T', version: '1' }, ...(servers && { servers }), paths });

    expect(envVars(collection)).toEqual(expected.envs);
    if (expected.requests) {
      expect(requestVars(collection)).toEqual(expected.requests);
    }

    collection.environments.forEach((env) => {
      const names = env.variables.map((v) => v.name);
      expect(new Set(names).size).toBe(names.length);
      env.variables.filter((v) => v.secret).forEach((v) => expect(v).toMatchObject({ value: '', enabled: true }));
      env.variables.filter((v) => RESERVED_NAME.test(v.name)).forEach((v) => expect(v.value).not.toBe(`{{${v.name}}}`));
      env.variables.filter((v) => RESERVED_NAME.test(v.name)).forEach((v) => expect(v.secret).toBe(false));
    });
  });
});

describe('operation-level servers to request vars', () => {
  it('should set request vars.req with baseUrl when operation has its own servers', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Op Server API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/files': {
          get: {
            summary: 'Get files',
            operationId: 'getFiles',
            servers: [{ url: 'https://files.example.com' }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const getFiles = result.items.find((i) => i.name === 'Get files');

    expect(getFiles.request.vars).toBeDefined();
    expect(getFiles.request.vars.req).toHaveLength(1);
    expect(getFiles.request.vars.req[0]).toMatchObject({
      name: 'baseUrl',
      value: 'https://files.example.com',
      enabled: true
    });
    expect(getFiles.request.vars.res).toEqual([]);
  });

  it('should create template baseUrl and variable entries for server with variables', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Var Server API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/regional': {
          get: {
            summary: 'Regional data',
            servers: [{
              url: '{protocol}://{region}.example.com/v2',
              variables: {
                protocol: { default: 'https' },
                region: { default: 'us-east' }
              }
            }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const regional = result.items.find((i) => i.name === 'Regional data');

    expect(regional.request.vars.req).toHaveLength(3); // baseUrl + protocol + region

    const baseUrlVar = regional.request.vars.req.find((v) => v.name === 'baseUrl');
    expect(baseUrlVar.value).toBe('{{protocol}}://{{region}}.example.com/v2');

    const protocolVar = regional.request.vars.req.find((v) => v.name === 'protocol');
    expect(protocolVar.value).toBe('https');

    const regionVar = regional.request.vars.req.find((v) => v.name === 'region');
    expect(regionVar.value).toBe('us-east');
  });

  it('should NOT set request vars when no operation servers exist', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'No Override API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/test': {
          get: {
            summary: 'Test',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const test = result.items.find((i) => i.name === 'Test');

    expect(test.request.vars).toBeUndefined();
  });

  it('should only set vars on the operation that defines servers', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Selective API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            servers: [{ url: 'https://data-server.example.com' }],
            responses: { 200: { description: 'OK' } }
          },
          post: {
            summary: 'Post data',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const getData = result.items.find((i) => i.name === 'Get data');
    const postData = result.items.find((i) => i.name === 'Post data');

    // GET has operation-level servers — should have vars
    expect(getData.request.vars).toBeDefined();
    expect(getData.request.vars.req[0].value).toBe('https://data-server.example.com');

    // POST has no operation-level servers — should NOT have vars
    expect(postData.request.vars).toBeUndefined();
  });
});

describe('x-bruno-variants import', () => {
  it('should import duplicate operation variants as separate requests', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Variant API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/users': {
          get: {
            'summary': 'Get active users',
            'parameters': [{ name: 'status', in: 'query', example: 'active' }],
            'responses': { 200: { description: 'OK' } },
            'x-bruno-variants': [
              {
                summary: 'Get inactive users',
                parameters: [{ name: 'status', in: 'query', example: 'inactive' }],
                responses: { 200: { description: 'OK' } }
              },
              {
                summary: 'Get pending users',
                parameters: [{ name: 'status', in: 'query', example: 'pending' }],
                responses: { 200: { description: 'OK' } }
              }
            ]
          }
        }
      }
    };

    const result = openApiToBruno(spec);
    const requests = result.items.filter((item) => item.type === 'http-request');

    expect(requests.map((request) => request.name)).toEqual([
      'Get active users',
      'Get inactive users',
      'Get pending users'
    ]);
    expect(requests.map((request) => request.request.params[0].value)).toEqual(['active', 'inactive', 'pending']);
    expect(requests.every((request) => !request.request['x-bruno-variants'])).toBe(true);
  });

  it('should import variant operation-level servers as request baseUrl vars', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Variant Server API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/data': {
          get: {
            'summary': 'Get data',
            'servers': [{ url: 'https://data.example.com' }],
            'responses': { 200: { description: 'OK' } },
            'x-bruno-variants': [
              {
                summary: 'Get audit data',
                servers: [{ url: 'https://audit.example.com' }],
                responses: { 200: { description: 'OK' } }
              }
            ]
          }
        }
      }
    };

    const result = openApiToBruno(spec);
    const data = result.items.find((item) => item.name === 'Get data');
    const auditData = result.items.find((item) => item.name === 'Get audit data');

    expect(data.request.vars.req[0]).toMatchObject({
      name: 'baseUrl',
      value: 'https://data.example.com'
    });
    expect(auditData.request.vars.req[0]).toMatchObject({
      name: 'baseUrl',
      value: 'https://audit.example.com'
    });
  });

  it('should group variants by their own tags', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Variant Folder API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/users': {
          get: {
            'summary': 'Get active users',
            'tags': ['Active Users'],
            'responses': { 200: { description: 'OK' } },
            'x-bruno-variants': [
              {
                summary: 'Get inactive users',
                tags: ['Inactive Users'],
                responses: { 200: { description: 'OK' } }
              }
            ]
          }
        }
      }
    };

    const result = openApiToBruno(spec);

    expect(result.items.map((folder) => ({
      name: folder.name,
      requests: folder.items.map((request) => request.name)
    }))).toEqual([
      { name: 'Active_Users', requests: ['Get active users'] },
      { name: 'Inactive_Users', requests: ['Get inactive users'] }
    ]);
  });
});
