import {
  createOpenApiOperationDocument,
  listOpenApiOperations,
  parseOpenApiDocument,
  resolveOpenApiBodySchema,
  resolveOpenApiOperation
} from './body-schema';
import { Validator } from 'jsonschema';

const document = {
  openapi: '3.0.3',
  paths: {
    '/operations': {
      post: {
        operationId: 'CreateOperation',
        requestBody: {
          content: {
            'application/vnd.operation+json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/OperationBase' },
                  {
                    type: 'object',
                    required: ['duration'],
                    properties: {
                      cost: { type: 'number', maximum: 100 },
                      duration: { type: 'integer' }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      OperationBase: {
        type: 'object',
        required: ['cost'],
        properties: {
          cost: { type: 'number', minimum: 10 },
          answer_url: { type: 'string', nullable: true }
        }
      }
    }
  }
};

describe('OpenAPI body schema resolver', () => {
  it('parses YAML and selects a JSON-compatible body automatically', () => {
    const parsed = parseOpenApiDocument(`
openapi: 3.0.3
paths:
  /operations:
    post:
      operationId: CreateOperation
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                cost:
                  type: number
`);

    const result = resolveOpenApiBodySchema(parsed, { operationId: 'CreateOperation' }, {});

    expect(result.contentType).toBe('application/json');
    expect(result.schema.properties.cost.type).toBe('number');
  });

  it('dereferences local schemas without dropping allOf validation constraints', () => {
    const result = resolveOpenApiBodySchema(document, { operationId: 'CreateOperation' }, {});

    expect(result.contentType).toBe('application/vnd.operation+json');
    expect(result.schema.allOf).toHaveLength(2);
    expect(result.schema.required).toEqual(['cost', 'duration']);
    expect(result.schema.properties).toMatchObject({
      cost: { type: 'number' },
      answer_url: { type: ['string', 'null'] },
      duration: { type: 'integer' }
    });
    expect(new Validator().validate({ cost: 5, duration: 600 }, result.schema).errors).not.toHaveLength(0);
  });

  it('uses method and URL when operationId is not available', () => {
    const result = resolveOpenApiBodySchema(document, {}, {
      name: 'A request name that is not an operationId',
      method: 'POST',
      url: 'https://example.com/operations?debug=true'
    });

    expect(result.operationId).toBe('CreateOperation');
  });

  it('lists operations for the graphical operation selector', () => {
    expect(listOpenApiOperations(document)).toEqual([
      {
        operationId: 'CreateOperation',
        method: 'post',
        path: '/operations',
        summary: ''
      }
    ]);
  });

  it('creates a preview document containing only the selected operation', () => {
    const descriptor = resolveOpenApiOperation(document, { operationId: 'CreateOperation' }, {});
    const fragment = createOpenApiOperationDocument(document, descriptor);

    expect(fragment.paths).toEqual({
      '/operations': { post: document.paths['/operations'].post }
    });
    expect(fragment.components).toBe(document.components);
  });

  it('rejects operations without a JSON-compatible request body', () => {
    const xmlDocument = {
      openapi: '3.0.3',
      paths: {
        '/operations': {
          post: {
            operationId: 'CreateOperation',
            requestBody: {
              content: {
                'application/xml': { schema: { type: 'object' } }
              }
            }
          }
        }
      }
    };

    expect(() => resolveOpenApiBodySchema(xmlDocument, { operationId: 'CreateOperation' }, {}))
      .toThrow('does not define a JSON request body');
  });
});
