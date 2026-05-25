import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';

describe('swagger2-to-bruno response examples', () => {
  it('should generate response examples from response schema', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Schema Example API', version: '1.0' },
      host: 'api.example.com',
      definitions: {
        Pet: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'doggie' },
            status: { type: 'string', enum: ['available', 'pending', 'sold'] }
          }
        }
      },
      paths: {
        '/pets/{petId}': {
          get: {
            summary: 'Find pet by ID',
            operationId: 'getPetById',
            produces: ['application/json'],
            parameters: [
              { in: 'path', name: 'petId', type: 'integer', required: true }
            ],
            responses: {
              200: {
                description: 'successful operation',
                schema: { $ref: '#/definitions/Pet' }
              },
              404: {
                description: 'Pet not found'
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Find pet by ID');

    expect(req.examples).toBeDefined();
    expect(req.examples.length).toBeGreaterThan(0);

    const okExample = req.examples.find((e) => e.response.status === 200);
    expect(okExample).toBeDefined();
    expect(okExample.name).toBe('200 Response');
    expect(okExample.response.statusText).toBe('OK');
    expect(okExample.response.body.type).toBe('json');

    // Should contain the resolved Pet schema fields
    const body = JSON.parse(okExample.response.body.content);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
    expect(body.name).toBe('doggie'); // from example
    expect(body.status).toBe('available'); // first enum value
  });

  it('should generate response examples from response.examples (MIME-keyed)', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'MIME Examples API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            responses: {
              200: {
                description: 'OK',
                examples: {
                  'application/json': { key: 'value', count: 42 }
                }
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get data');

    expect(req.examples).toBeDefined();
    expect(req.examples.length).toBe(1);

    const example = req.examples[0];
    expect(example.response.status).toBe(200);
    expect(example.response.body.type).toBe('json');

    const content = JSON.parse(example.response.body.content);
    expect(content.key).toBe('value');
    expect(content.count).toBe(42);

    // Should have Content-Type header
    const ctHeader = example.response.headers.find((h) => h.name === 'Content-Type');
    expect(ctHeader.value).toBe('application/json');
  });

  it('should handle multiple MIME-keyed examples for same status code', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Multi MIME API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            produces: ['application/json', 'application/xml'],
            responses: {
              200: {
                description: 'OK',
                examples: {
                  'application/json': { key: 'value' },
                  'application/xml': '<root><key>value</key></root>'
                }
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get data');

    expect(req.examples.length).toBe(2);

    const jsonExample = req.examples.find((e) => e.response.body.type === 'json');
    const xmlExample = req.examples.find((e) => e.response.body.type === 'xml');
    expect(jsonExample).toBeDefined();
    expect(xmlExample).toBeDefined();
  });

  it('should include request body schema in response examples', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Body+Response API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/items': {
          post: {
            summary: 'Create item',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string' }, count: { type: 'integer' } }
                }
              }
            ],
            responses: {
              201: {
                description: 'Created',
                schema: {
                  type: 'object',
                  properties: { id: { type: 'integer' }, name: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Create item');

    expect(req.examples).toBeDefined();
    const example = req.examples[0];
    expect(example.response.status).toBe(201);

    // Request body should be populated from the body param schema
    expect(example.request.body.mode).toBe('json');
    const reqBody = JSON.parse(example.request.body.json);
    expect(reqBody).toHaveProperty('name');
    expect(reqBody).toHaveProperty('count');
  });

  it('should skip default responses when generating examples', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Default Response API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            responses: {
              200: {
                description: 'OK',
                schema: { type: 'object', properties: { id: { type: 'integer' } } }
              },
              default: {
                description: 'Error'
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get data');

    // Should only have 200 example, not default
    expect(req.examples.length).toBe(1);
    expect(req.examples[0].response.status).toBe(200);
  });

  it('should generate examples from description only responses', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'No Schema API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/data': {
          delete: {
            summary: 'Delete data',
            responses: {
              204: { description: 'No Content' },
              404: { description: 'Not Found' }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Delete data');

    expect(req.examples).toBeDefined();
    expect(req.examples.length).toBe(2);

    const noContentExample = req.examples.find((e) => e.response.status === 204);
    expect(noContentExample).toBeDefined();
    expect(noContentExample.name).toBe('204 Response');
    expect(noContentExample.description).toBe('No Content');
    expect(noContentExample.response.body.content).toBe('');
    expect(noContentExample.response.headers).toEqual([]);

    const notFoundExample = req.examples.find((e) => e.response.status === 404);
    expect(notFoundExample).toBeDefined();
    expect(notFoundExample.name).toBe('404 Response');
    expect(notFoundExample.description).toBe('Not Found');
  });

  it('should set correct statusText in response examples', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Status Text API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/items': {
          post: {
            summary: 'Create item',
            responses: {
              201: {
                description: 'Created',
                schema: { type: 'object', properties: { id: { type: 'integer' } } }
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Create item');
    const example = req.examples[0];

    expect(example.response.status).toBe(201);
    expect(example.response.statusText).toBe('Created');
  });

  it('should use produces content type for response examples when no examples key', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Produces API', version: '1.0' },
      host: 'api.example.com',
      produces: ['application/xml'],
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            responses: {
              200: {
                description: 'OK',
                schema: { type: 'object', properties: { name: { type: 'string' } } }
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get data');

    const example = req.examples[0];
    const ctHeader = example.response.headers.find((h) => h.name === 'Content-Type');
    expect(ctHeader.value).toBe('application/xml');
    expect(example.response.body.type).toBe('xml');
  });

  it('should use operation-level produces over global produces', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Override Produces API', version: '1.0' },
      host: 'api.example.com',
      produces: ['application/xml'],
      paths: {
        '/data': {
          get: {
            summary: 'Get data',
            produces: ['application/json'],
            responses: {
              200: {
                description: 'OK',
                schema: { type: 'object', properties: { key: { type: 'string' } } }
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Get data');

    const example = req.examples[0];
    const ctHeader = example.response.headers.find((h) => h.name === 'Content-Type');
    expect(ctHeader.value).toBe('application/json');
    expect(example.response.body.type).toBe('json');
  });

  it('should preserve example structure including uid, itemUid, and type', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Structure API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/items': {
          get: {
            summary: 'List items',
            responses: {
              200: {
                description: 'OK',
                schema: { type: 'object', properties: { id: { type: 'integer' } } }
              }
            }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'List items');
    const example = req.examples[0];

    expect(example.uid).toBeDefined();
    expect(example.itemUid).toBe(req.uid);
    expect(example.type).toBe('http-request');
    expect(example.request.url).toBe(req.request.url);
    expect(example.request.method).toBe(req.request.method);
  });
});
