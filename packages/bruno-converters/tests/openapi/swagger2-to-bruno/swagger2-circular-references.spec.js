import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';

describe('swagger2-to-bruno circular references', () => {
  it('should handle simple circular references in definitions', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Circular Ref API', version: '1.0' },
      host: 'api.example.com',
      definitions: {
        TreeNode: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            children: {
              type: 'array',
              items: { $ref: '#/definitions/TreeNode' }
            }
          }
        }
      },
      paths: {
        '/tree': {
          post: {
            summary: 'Create tree',
            operationId: 'createTree',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: { $ref: '#/definitions/TreeNode' }
              }
            ],
            responses: {
              200: {
                description: 'OK',
                schema: { $ref: '#/definitions/TreeNode' }
              }
            }
          }
        }
      }
    };

    // Should not throw due to circular references
    expect(() => swagger2ToBruno(spec)).not.toThrow();

    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Create tree');
    expect(req).toBeDefined();
    expect(req.request.body.mode).toBe('json');

    // Should have a JSON body with at least the name field
    const body = JSON.parse(req.request.body.json);
    expect(body).toHaveProperty('name');
  });

  it('should handle complex circular reference chains (A → B → A)', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Complex Circular API', version: '1.0' },
      host: 'api.example.com',
      definitions: {
        Category: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            parentCategory: { $ref: '#/definitions/SubCategory' }
          }
        },
        SubCategory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            category: { $ref: '#/definitions/Category' }
          }
        }
      },
      paths: {
        '/categories': {
          post: {
            summary: 'Create category',
            operationId: 'createCategory',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: { $ref: '#/definitions/Category' }
              }
            ],
            responses: {
              201: {
                description: 'Created',
                schema: { $ref: '#/definitions/Category' }
              }
            }
          }
        }
      }
    };

    expect(() => swagger2ToBruno(spec)).not.toThrow();

    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Create category');
    expect(req).toBeDefined();
    expect(req.request.body.mode).toBe('json');

    const body = JSON.parse(req.request.body.json);
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('parentCategory');
  });

  it('should handle self-referencing definitions', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Self Ref API', version: '1.0' },
      host: 'api.example.com',
      definitions: {
        LinkedList: {
          type: 'object',
          properties: {
            value: { type: 'string' },
            next: { $ref: '#/definitions/LinkedList' }
          }
        }
      },
      paths: {
        '/list': {
          get: {
            summary: 'Get list',
            operationId: 'getList',
            responses: {
              200: {
                description: 'OK',
                schema: { $ref: '#/definitions/LinkedList' }
              }
            }
          }
        }
      }
    };

    expect(() => swagger2ToBruno(spec)).not.toThrow();
    const collection = swagger2ToBruno(spec);
    expect(collection).toBeDefined();
  });
});
