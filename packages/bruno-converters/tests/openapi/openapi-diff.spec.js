import { describe, it, expect } from '@jest/globals';
import { extractEndpoints, diffSpecs, generateEndpointId } from '../../src/openapi/openapi-diff';

describe('openapi-diff', () => {
  describe('generateEndpointId', () => {
    it('should generate endpoint ID with method and normalized path', () => {
      expect(generateEndpointId('get', '/users/{id}')).toBe('GET:/users/:id');
      expect(generateEndpointId('POST', '/users')).toBe('POST:/users');
      expect(generateEndpointId('delete', '/users/{userId}/posts/{postId}')).toBe('DELETE:/users/:userId/posts/:postId');
    });
  });

  describe('extractEndpoints', () => {
    it('should return empty array for null or invalid spec', () => {
      expect(extractEndpoints(null)).toEqual([]);
      expect(extractEndpoints({})).toEqual([]);
      expect(extractEndpoints({ paths: null })).toEqual([]);
    });

    it('should extract basic endpoint information', () => {
      const spec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get all users',
              description: 'Returns a list of users',
              operationId: 'getUsers',
              tags: ['users']
            }
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]).toMatchObject({
        id: 'GET:/users',
        method: 'GET',
        path: '/users',
        normalizedPath: '/users',
        summary: 'Get all users',
        description: 'Returns a list of users',
        operationId: 'getUsers',
        tags: ['users'],
        deprecated: false
      });
    });

    it('should extract deprecated status', () => {
      const spec = {
        paths: {
          '/legacy': {
            get: {
              summary: 'Legacy endpoint',
              deprecated: true
            }
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints[0].deprecated).toBe(true);
    });

    it('should extract parameters categorized by location', () => {
      const spec = {
        paths: {
          '/users/{id}': {
            get: {
              summary: 'Get user by ID',
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                { name: 'include', in: 'query', required: false, schema: { type: 'string' } },
                { name: 'Authorization', in: 'header', required: true, schema: { type: 'string' } }
              ]
            }
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints[0].details.parameters).toEqual({
        path: [{ name: 'id', type: 'string', required: true, description: null }],
        query: [{ name: 'include', type: 'string', required: false, description: null }],
        header: [{ name: 'Authorization', type: 'string', required: true, description: null }]
      });
    });

    it('should extract request body information', () => {
      const spec = {
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                required: true,
                description: 'User data',
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { name: { type: 'string' } } }
                  }
                }
              }
            }
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints[0].details.requestBody).toEqual({
        required: true,
        contentType: 'application/json',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
        description: 'User data'
      });
    });

    it('should extract response information', () => {
      const spec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                200: {
                  description: 'Successful response',
                  content: {
                    'application/json': {
                      schema: { type: 'array', items: { type: 'object' } }
                    }
                  }
                },
                404: {
                  description: 'Not found'
                }
              }
            }
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints[0].details.responses).toEqual([
        {
          code: '200',
          description: 'Successful response',
          schema: { type: 'array', items: { type: 'object' } }
        },
        {
          code: '404',
          description: 'Not found',
          schema: null
        }
      ]);
    });

    it('should generate hash for comparison', () => {
      const spec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users'
            }
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints[0]._hash).toBeDefined();
      expect(typeof endpoints[0]._hash).toBe('string');
    });

    it('should extract multiple endpoints from multiple paths and methods', () => {
      const spec = {
        paths: {
          '/users': {
            get: { summary: 'List users' },
            post: { summary: 'Create user' }
          },
          '/users/{id}': {
            get: { summary: 'Get user' },
            put: { summary: 'Update user' },
            delete: { summary: 'Delete user' }
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints).toHaveLength(5);
      expect(endpoints.map((e) => e.id)).toEqual([
        'GET:/users',
        'POST:/users',
        'GET:/users/:id',
        'PUT:/users/:id',
        'DELETE:/users/:id'
      ]);
    });

    it('should ignore non-HTTP method properties in path item', () => {
      const spec = {
        paths: {
          '/users': {
            get: { summary: 'Get users' },
            parameters: [{ name: 'version', in: 'header' }],
            description: 'User operations',
            $ref: '#/components/pathItems/users'
          }
        }
      };

      const endpoints = extractEndpoints(spec);
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].method).toBe('GET');
    });
  });

  describe('diffSpecs', () => {
    it('should detect added endpoints', () => {
      const oldSpec = {
        paths: {
          '/users': { get: { summary: 'Get users' } }
        }
      };

      const newSpec = {
        paths: {
          '/users': { get: { summary: 'Get users' } },
          '/posts': { get: { summary: 'Get posts' } }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].id).toBe('GET:/posts');
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.hasChanges).toBe(true);
    });

    it('should detect removed endpoints', () => {
      const oldSpec = {
        paths: {
          '/users': { get: { summary: 'Get users' } },
          '/posts': { get: { summary: 'Get posts' } }
        }
      };

      const newSpec = {
        paths: {
          '/users': { get: { summary: 'Get users' } }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0].id).toBe('GET:/posts');
      expect(diff.modified).toHaveLength(0);
      expect(diff.hasChanges).toBe(true);
    });

    it('should detect modified endpoints when parameters change', () => {
      const oldSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }]
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
                { name: 'offset', in: 'query', schema: { type: 'integer' } }
              ]
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].id).toBe('GET:/users');
      expect(diff.modified[0].oldEndpoint).toBeDefined();
      expect(diff.hasChanges).toBe(true);
    });

    it('should detect modified endpoints when request body changes', () => {
      const oldSpec = {
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { name: { type: 'string' } } }
                  }
                }
              }
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].id).toBe('POST:/users');
      expect(diff.hasChanges).toBe(true);
    });

    it('should detect modified endpoints when responses change', () => {
      const oldSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                200: { description: 'Success' }
              }
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                200: { description: 'Success' },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].id).toBe('GET:/users');
      expect(diff.hasChanges).toBe(true);
    });

    it('should detect modified endpoints when deprecated status changes', () => {
      const oldSpec = {
        paths: {
          '/legacy': {
            get: {
              summary: 'Legacy endpoint',
              deprecated: false
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/legacy': {
            get: {
              summary: 'Legacy endpoint',
              deprecated: true
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].id).toBe('GET:/legacy');
      expect(diff.modified[0].deprecated).toBe(true);
      expect(diff.modified[0].oldEndpoint.deprecated).toBe(false);
      expect(diff.hasChanges).toBe(true);
    });

    it('should NOT detect modification when only summary changes', () => {
      const oldSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get all users'
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'List all users in the system'
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(1);
      expect(diff.hasChanges).toBe(false);
    });

    it('should NOT detect modification when only description changes', () => {
      const oldSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              description: 'Returns all users'
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              description: 'Returns a paginated list of all users in the system'
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(1);
      expect(diff.hasChanges).toBe(false);
    });

    it('should detect unchanged endpoints', () => {
      const spec = {
        paths: {
          '/users': { get: { summary: 'Get users' } },
          '/posts': { get: { summary: 'Get posts' } }
        }
      };

      const diff = diffSpecs(spec, spec);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(2);
      expect(diff.hasChanges).toBe(false);
    });

    it('should handle complex diff with added, removed, modified, and unchanged', () => {
      const oldSpec = {
        paths: {
          '/users': {
            get: { summary: 'Get users' },
            post: {
              summary: 'Create user',
              parameters: [{ name: 'name', in: 'query', schema: { type: 'string' } }]
            }
          },
          '/legacy': { get: { summary: 'Legacy endpoint' } }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            get: { summary: 'Get users' },
            post: {
              summary: 'Create user',
              parameters: [
                { name: 'name', in: 'query', schema: { type: 'string' } },
                { name: 'email', in: 'query', schema: { type: 'string' } }
              ]
            }
          },
          '/posts': { get: { summary: 'Get posts' } }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].id).toBe('GET:/posts');

      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0].id).toBe('GET:/legacy');

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].id).toBe('POST:/users');

      expect(diff.unchanged).toHaveLength(1);
      expect(diff.unchanged[0].id).toBe('GET:/users');

      expect(diff.hasChanges).toBe(true);
    });

    it('should handle empty specs', () => {
      const diff = diffSpecs({}, {});
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(0);
      expect(diff.hasChanges).toBe(false);
    });

    it('should handle null specs', () => {
      const diff = diffSpecs(null, null);
      expect(diff.hasChanges).toBe(false);
    });

    it('should detect modification when parameter type changes', () => {
      const oldSpec = {
        paths: {
          '/users/{id}': {
            get: {
              summary: 'Get user',
              parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }]
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users/{id}': {
            get: {
              summary: 'Get user',
              parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' } }]
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified).toHaveLength(1);
      expect(diff.hasChanges).toBe(true);
    });

    it('should detect modification when parameter required status changes', () => {
      const oldSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }]
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              parameters: [{ name: 'limit', in: 'query', required: true, schema: { type: 'integer' } }]
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified).toHaveLength(1);
      expect(diff.hasChanges).toBe(true);
    });

    it('should include oldEndpoint reference in modified endpoints for comparison', () => {
      const oldSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }]
            }
          }
        }
      };

      const newSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'Get users - updated',
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
                { name: 'page', in: 'query', schema: { type: 'integer' } }
              ]
            }
          }
        }
      };

      const diff = diffSpecs(oldSpec, newSpec);
      expect(diff.modified[0].oldEndpoint).toBeDefined();
      expect(diff.modified[0].oldEndpoint.details.parameters.query).toHaveLength(1);
      expect(diff.modified[0].details.parameters.query).toHaveLength(2);
    });
  });
});
