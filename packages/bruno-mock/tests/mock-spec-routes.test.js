const { buildMockResponsesFromSpec, convertOpenApiPath } = require('../src/mock-spec-routes');
const { schemaToExample } = require('../src/mock-example-generator');

const beeceptorProductSchema = {
  type: 'object',
  required: ['id', 'name', 'price', 'stock', 'category'],
  properties: {
    id: { type: 'string', format: 'uuid', example: 'eda5cbc1-a615-4da5-ae73-4a33a9acfb6a' },
    name: { type: 'string', example: 'Worry Management' },
    description: { type: 'string', example: 'Mr street sell would civil.' },
    price: { type: 'number', format: 'float', example: 91.37 },
    category: { type: 'string', example: 'wrong' },
    image_url: { type: 'string', format: 'uri', example: 'https://dummyimage.com/766x809' },
    stock: { type: 'integer', example: 94 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  }
};

describe('mock-spec-routes', () => {
  it('converts OpenAPI path params to route params', () => {
    expect(convertOpenApiPath('/users/{userId}/pets/{petId}')).toBe('/users/:userId/pets/:petId');
  });

  it('generates faker-backed values when schema has no inline examples', () => {
    const spec = {
      openapi: '3.1.0',
      components: {
        schemas: {
          Product: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              price: { type: 'number', format: 'float' }
            }
          }
        }
      },
      paths: {
        '/products': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const example = schemaToExample({
      type: 'array',
      items: { $ref: '#/components/schemas/Product' }
    }, spec);

    expect(Array.isArray(example)).toBe(true);
    expect(example[0].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(typeof example[0].name).toBe('string');
    expect(example[0].name.length).toBeGreaterThan(0);
    expect(typeof example[0].price).toBe('number');
  });

  it('builds mock response records from OpenAPI spec paths', () => {
    const responses = buildMockResponsesFromSpec({
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List pets',
            responses: {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    }, { generateFromSchema: true });

    expect(responses).toHaveLength(1);
    expect(responses[0].name).toBe('List pets');
    expect(responses[0].request.method).toBe('GET');
    expect(responses[0].request.url).toBe('/pets');
    expect(responses[0].rules.conditions).toEqual([]);
  });

  it('creates separate mock responses for each operation status code', () => {
    const responses = buildMockResponsesFromSpec({
      openapi: '3.1.0',
      paths: {
        '/auth/login': {
          post: {
            summary: 'Login and get access token',
            responses: {
              200: {
                description: 'Authenticated successfully'
              },
              401: {
                description: 'Unauthorized'
              }
            }
          }
        }
      }
    });

    expect(responses).toHaveLength(2);
    expect(responses[0].name).toBe('Login and get access token (200 Authenticated successfully)');
    expect(responses[0].response.status).toBe(200);
    expect(responses[1].name).toBe('Login and get access token (401 Unauthorized)');
    expect(responses[1].response.status).toBe(401);
    expect(responses[0].request.url).toBe('/auth/login');
    expect(responses[1].request.url).toBe('/auth/login');
  });

  it('uses empty JSON bodies when schema generation is disabled', () => {
    const responses = buildMockResponsesFromSpec({
      openapi: '3.1.0',
      components: {
        schemas: {
          Product: beeceptorProductSchema
        }
      },
      paths: {
        '/products': {
          get: {
            summary: 'List products',
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }, { generateFromSchema: false });

    expect(responses[0].response.body.content).toBe('{}');
  });

  describe('Swagger 2.0 specs', () => {
    const swaggerSpec = (response) => ({
      swagger: '2.0',
      info: { title: 'Pets', version: '1.0.0' },
      definitions: {
        Pet: { type: 'object', properties: { name: { type: 'string', example: 'Rex' } } }
      },
      paths: { '/pets': { get: { responses: { 200: { description: 'OK', ...response } } } } }
    });

    it('uses the response example as the body', () => {
      const responses = buildMockResponsesFromSpec(swaggerSpec({
        examples: { 'application/json': { name: 'Fido' } }
      }));

      expect(JSON.parse(responses[0].response.body.content)).toEqual({ name: 'Fido' });
    });

    it('serves an XML example with its declared content type', () => {
      const responses = buildMockResponsesFromSpec(swaggerSpec({
        examples: { 'application/xml': '<pet><name>Fido</name></pet>' }
      }));

      expect(responses[0].response.body.content).toBe('<pet><name>Fido</name></pet>');
      expect(responses[0].response.headers[0].value).toBe('application/xml');
    });

    it('builds an empty JSON body when a response has no example and no schema', () => {
      const responses = buildMockResponsesFromSpec(swaggerSpec({}));

      expect(responses).toHaveLength(1);
      expect(responses[0].request).toEqual(expect.objectContaining({ method: 'GET', url: '/pets' }));
      expect(responses[0].response.body.content).toBe('{}');
      expect(responses[0].response.headers[0].value).toBe('application/json');
    });

    it('generates the body from a schema that references #/definitions', () => {
      const responses = buildMockResponsesFromSpec(swaggerSpec({
        schema: { type: 'array', items: { $ref: '#/definitions/Pet' } }
      }), { generateFromSchema: true });

      expect(JSON.parse(responses[0].response.body.content)).toEqual([{ name: 'Rex' }, { name: 'Rex' }]);
    });
  });

  describe('JSON media types', () => {
    const oas3Response = (content) => buildMockResponsesFromSpec({
      openapi: '3.0.0',
      paths: { '/status': { get: { responses: { 200: { content } } } } }
    }, { generateFromSchema: true })[0].response;

    it('keeps a JSON variant media type such as application/problem+json', () => {
      const response = oas3Response({ 'application/problem+json': { example: { title: 'Not found' } } });

      expect(response.headers[0].value).toBe('application/problem+json');
      expect(JSON.parse(response.body.content)).toEqual({ title: 'Not found' });
    });

    it('encodes a plain string example as a JSON string', () => {
      const response = oas3Response({ 'application/json': { example: 'ready' } });

      expect(response.headers[0].value).toBe('application/json');
      expect(JSON.parse(response.body.content)).toBe('ready');
    });

    it('does not double-encode a string example that is already JSON text', () => {
      const response = oas3Response({ 'application/json': { example: '{"id": 1}' } });

      expect(JSON.parse(response.body.content)).toEqual({ id: 1 });
    });

    it('encodes a value generated from a string schema as a JSON string', () => {
      const response = oas3Response({ 'application/json': { schema: { type: 'string', example: 'ok' } } });

      expect(response.headers[0].value).toBe('application/json');
      expect(JSON.parse(response.body.content)).toBe('ok');
    });
  });

  describe('Swagger 2.0 produces for schema-only responses', () => {
    const responses = buildMockResponsesFromSpec({
      swagger: '2.0',
      info: { title: 'Pets', version: '1.0.0' },
      produces: ['application/xml'],
      paths: {
        '/pets': {
          get: {
            produces: ['application/vnd.api+json'],
            responses: { 200: { description: 'OK', schema: { type: 'object', properties: { id: { type: 'integer', example: 1 } } } } }
          },
          post: {
            responses: { 201: { description: 'Created', schema: { type: 'object', properties: { id: { type: 'integer', example: 2 } } } } }
          }
        }
      }
    }, { generateFromSchema: true });
    const byMethod = (method) => responses.find((record) => record.request.method === method).response;

    it('uses the operation produces over the spec-level produces', () => {
      expect(byMethod('GET').headers[0].value).toBe('application/vnd.api+json');
      expect(JSON.parse(byMethod('GET').body.content)).toEqual({ id: 1 });
    });

    it('serves JSON generated for an inherited XML produces as application/json', () => {
      expect(byMethod('POST').headers[0].value).toBe('application/json');
      expect(JSON.parse(byMethod('POST').body.content)).toEqual({ id: 2 });
    });
  });

  it('serves an OpenAPI 3 XML example with its declared content type', () => {
    const responses = buildMockResponsesFromSpec({
      openapi: '3.0.0',
      paths: { '/pets': { get: { responses: { 200: { content: { 'application/xml': { example: '<pet/>' } } } } } } }
    });

    expect(responses[0].response.body.content).toBe('<pet/>');
    expect(responses[0].response.headers[0].value).toBe('application/xml');
  });

  it('generates faker-backed bodies when schema generation is enabled', () => {
    const responses = buildMockResponsesFromSpec({
      openapi: '3.1.0',
      components: {
        schemas: {
          Product: beeceptorProductSchema
        }
      },
      paths: {
        '/products': {
          get: {
            summary: 'List products',
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }, { generateFromSchema: true });

    const body = JSON.parse(responses[0].response.body.content);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].name).toBe('Worry Management');
  });
});
