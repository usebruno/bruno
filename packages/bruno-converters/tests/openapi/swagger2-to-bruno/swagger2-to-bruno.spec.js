import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('swagger2-collection', () => {
  it('should correctly import a valid Swagger 2.0 spec', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Basic API', version: '1.0' },
      host: 'api.example.com',
      basePath: '/v1',
      schemes: ['https'],
      paths: {
        '/users': {
          get: {
            summary: 'List users',
            operationId: 'listUsers',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);

    expect(collection).toBeDefined();
    expect(collection.name).toBe('Basic API');
    expect(collection.version).toBe('1');
    expect(collection.uid).toBeDefined();
    expect(collection.items.length).toBeGreaterThan(0);
    expect(collection.environments.length).toBeGreaterThan(0);
  });

  it('should route Swagger 2.0 specs through the dedicated converter via openApiToBruno', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Routed API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/test': {
          get: {
            summary: 'Test',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = openApiToBruno(spec);
    expect(collection).toBeDefined();
    expect(collection.name).toBe('Routed API');
  });

  it('should accept YAML string input for Swagger 2.0', () => {
    const yamlSpec = `
swagger: "2.0"
info:
  title: YAML Petstore
  version: "1.0"
host: api.example.com
basePath: /v1
schemes:
  - https
paths:
  /pets:
    get:
      summary: List pets
      responses:
        "200":
          description: OK
`;
    const collection = openApiToBruno(yamlSpec);
    expect(collection.name).toBe('YAML Petstore');
    expect(collection.environments.length).toBeGreaterThan(0);
  });

  it('keeps duplicate operation display names clean when HTTP methods differ', () => {
    const collection = swagger2ToBruno({
      swagger: '2.0',
      info: { title: 'Projects API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/projects': {
          get: {
            summary: '/projects',
            responses: { 200: { description: 'OK' } }
          },
          post: {
            summary: '/projects',
            responses: { 201: { description: 'Created' } }
          }
        }
      }
    });

    expect(collection.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '/projects', filename: 'GET projects', request: expect.objectContaining({ method: 'GET' }) }),
        expect.objectContaining({ name: '/projects', filename: 'POST projects', request: expect.objectContaining({ method: 'POST' }) })
      ])
    );
  });

  it('trims whitespace from info.title and uses the trimmed value as the collection name', () => {
    const spec = {
      swagger: '2.0',
      info: { title: '  My API  ', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    expect(collection.name).toBe('My API');
  });

  it('defaults to Untitled Collection if info.title is only whitespace', () => {
    const spec = {
      swagger: '2.0',
      info: { title: '   ', version: '1.0' },
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    expect(collection.name).toBe('Untitled Collection');
  });

  it('defaults to Untitled Collection if info.title is an empty string', () => {
    const spec = {
      swagger: '2.0',
      info: { title: '', version: '1.0' },
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    expect(collection.name).toBe('Untitled Collection');
  });

  it('defaults to Untitled Collection if info.title is missing', () => {
    const spec = {
      swagger: '2.0',
      info: { version: '1.0' },
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    expect(collection.name).toBe('Untitled Collection');
  });

  it('defaults to Untitled Collection if info is missing entirely', () => {
    const spec = {
      swagger: '2.0',
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    expect(collection.name).toBe('Untitled Collection');
  });

  it('should create environments from host/basePath/schemes', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Env API', version: '1.0' },
      host: 'petstore.swagger.io',
      basePath: '/v2',
      schemes: ['https'],
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);

    expect(collection.environments).toBeDefined();
    expect(collection.environments.length).toBe(1);

    const env = collection.environments[0];
    const baseUrlVar = env.variables.find((v) => v.name === 'baseUrl');
    expect(baseUrlVar).toBeDefined();
    expect(baseUrlVar.value).toBe('https://petstore.swagger.io/v2');
  });

  it('should create multiple environments for multiple schemes', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Multi Scheme API', version: '1.0' },
      host: 'petstore.swagger.io',
      basePath: '/v2',
      schemes: ['https', 'http'],
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);

    expect(collection.environments.length).toBe(2);
    expect(collection.environments[0].variables[0].value).toBe('https://petstore.swagger.io/v2');
    expect(collection.environments[1].variables[0].value).toBe('http://petstore.swagger.io/v2');
    expect(collection.environments[0].name).toBe('Environment 1');
    expect(collection.environments[1].name).toBe('Environment 2');
  });

  it('should handle basePath without host', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'BasePath Only API', version: '1.0' },
      basePath: '/api/v1',
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);

    expect(collection.environments.length).toBe(1);
    expect(collection.environments[0].variables[0].value).toBe('/api/v1');
  });

  it('should default scheme to https when schemes is empty', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'No Scheme API', version: '1.0' },
      host: 'api.example.com',
      basePath: '/v1',
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const baseUrlVar = collection.environments[0].variables.find((v) => v.name === 'baseUrl');
    expect(baseUrlVar.value).toBe('https://api.example.com/v1');
  });

  it('should handle spec with no host (empty server)', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'No Host API', version: '1.0' },
      paths: {
        '/test': {
          get: { summary: 'Test endpoint', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    expect(collection).toBeDefined();
    expect(collection.name).toBe('No Host API');
    expect(collection.environments.length).toBe(0);
  });

  it('should set auth mode to inherit when no security is defined in the collection', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'No Auth API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = swagger2ToBruno(spec);

    // Request auth should be inherit (no security defined)
    const req = collection.items.find((i) => i.name === 'Test');
    expect(req.request.auth.mode).toBe('inherit');
  });

  it('should use operation summary as request name, falling back to operationId', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Names API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/with-summary': {
          get: {
            summary: 'My Summary',
            operationId: 'getSummary',
            responses: { 200: { description: 'OK' } }
          }
        },
        '/no-summary': {
          get: {
            operationId: 'noSummary',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const withSummary = collection.items.find((i) => i.name === 'My Summary');
    const noSummary = collection.items.find((i) => i.name === 'noSummary');
    expect(withSummary).toBeDefined();
    expect(noSummary).toBeDefined();
  });

  it('should handle requestBody with empty content object (undefined mimeType)', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Empty Body API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/test': {
          post: {
            summary: 'Post test',
            parameters: [],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Post test');
    expect(req).toBeDefined();
    expect(req.request.body.mode).toBe('none');
  });
});
