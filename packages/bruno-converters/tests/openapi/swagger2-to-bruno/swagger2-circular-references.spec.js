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

  describe('an example that refers to a recursive definition', () => {
    const folderRef = { $ref: '#/definitions/Folder' };
    const folder = { type: 'object', properties: { name: { type: 'string' }, children: { type: 'array', items: folderRef } } };
    const buildSpec = ({ bodySchema = folderRef, responseExamples, definitionsFirst = true } = {}) => {
      const head = { swagger: '2.0', info: { title: 'Demo', version: '1.0.0' } };
      const definitions = { Folder: folder };
      const paths = {
        '/folders': {
          post: {
            summary: 'Create folder',
            consumes: ['application/json'],
            produces: ['application/json'],
            parameters: [{ in: 'body', name: 'body', schema: bodySchema }],
            responses: { 200: { description: 'OK', schema: folderRef, ...(responseExamples ? { examples: responseExamples } : {}) } }
          }
        }
      };
      return definitionsFirst ? { ...head, definitions, paths } : { ...head, paths, definitions };
    };
    const firstRequest = (spec) => swagger2ToBruno(spec).items[0];
    const requestBody = (spec) => JSON.parse(firstRequest(spec).request.body.json);
    const responseBody = (spec) => JSON.parse(firstRequest(spec).examples[0].response.body.content);

    it.each([true, false])('builds the body from the schema when the body example points at the definition (definitions first: %s)', (definitionsFirst) => {
      const withExample = buildSpec({ bodySchema: { ...folder, example: folderRef }, definitionsFirst });
      expect(requestBody(withExample)).toEqual(requestBody(buildSpec({ bodySchema: { ...folder }, definitionsFirst })));
    });

    it.each([true, false])('builds the response example from the schema when it points at the definition (definitions first: %s)', (definitionsFirst) => {
      const withExample = buildSpec({ responseExamples: { 'application/json': folderRef }, definitionsFirst });
      expect(responseBody(withExample)).toEqual(responseBody(buildSpec({ definitionsFirst })));
    });

    it('keeps a definition reference inside a larger example as a plain value', () => {
      const spec = buildSpec({ bodySchema: { ...folder, example: { name: 'docs', children: [folderRef] } } });
      expect(requestBody(spec)).toEqual({ name: 'docs', children: [folderRef] });
    });
  });
});
