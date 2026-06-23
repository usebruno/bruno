const { buildRouteMapFromSpec, buildMockResponsesFromSpec, convertOpenApiPath } = require('../src/app/mock-spec-routes');
const { schemaToExample } = require('../src/app/mock-example-generator');

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

  it('builds route map from OpenAPI spec paths', () => {
    const routeMap = buildRouteMapFromSpec({
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            operationId: 'listPets',
            responses: {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    expect(routeMap.size).toBe(1);
    expect(routeMap.has('GET /pets')).toBe(true);
    expect(routeMap.get('GET /pets')[0].response.status).toBe(200);
  });

  it('resolves component schema refs for list endpoints like /products', () => {
    const spec = {
      openapi: '3.1.0',
      components: {
        schemas: {
          Product: beeceptorProductSchema
        }
      },
      paths: {
        '/products': {
          get: {
            summary: 'List all products with filters',
            responses: {
              200: {
                description: 'List of products',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Product'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const routeMap = buildRouteMapFromSpec(spec, { generateFromSchema: true });
    const route = routeMap.get('GET /products');

    expect(route).toBeTruthy();
    const body = JSON.parse(route[0].response.body.content);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].id).toBe('eda5cbc1-a615-4da5-ae73-4a33a9acfb6a');
    expect(body[0].name).toBe('Worry Management');
    expect(body[0].price).toBe(91.37);
    expect(body[0].stock).toBe(94);
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
