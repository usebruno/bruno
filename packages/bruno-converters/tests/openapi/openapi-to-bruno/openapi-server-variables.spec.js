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
      openapi: '3.2.0',
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
