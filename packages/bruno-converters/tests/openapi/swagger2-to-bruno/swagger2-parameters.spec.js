import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';

describe('swagger2-to-bruno parameters', () => {
  describe('path-item level parameters', () => {
    it('should apply path-item parameters to all operations when no operation params exist', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Path Params API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items/{itemId}': {
            parameters: [
              { name: 'itemId', in: 'path', required: true, type: 'string', description: 'The item ID' }
            ],
            get: {
              summary: 'Get item',
              operationId: 'getItem',
              responses: { 200: { description: 'OK' } }
            },
            put: {
              summary: 'Update item',
              operationId: 'updateItem',
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const getItem = collection.items.find((i) => i.name === 'Get item');
      const putItem = collection.items.find((i) => i.name === 'Update item');

      expect(getItem.request.params).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'itemId', type: 'path', enabled: true })])
      );
      expect(putItem.request.params).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'itemId', type: 'path', enabled: true })])
      );
    });

    it('should preserve operation-only parameters unchanged', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Op Params API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/search': {
            get: {
              summary: 'Search',
              operationId: 'search',
              parameters: [
                { name: 'q', in: 'query', required: true, type: 'string', description: 'Search query' }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const search = collection.items.find((i) => i.name === 'Search');
      const queryParams = search.request.params.filter((p) => p.type === 'query');
      expect(queryParams).toHaveLength(1);
      expect(queryParams[0].name).toBe('q');
    });

    it('should merge path-item and operation params with no overlap', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Merge Params API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/users/{userId}': {
            parameters: [
              { name: 'userId', in: 'path', required: true, type: 'string' }
            ],
            get: {
              summary: 'Get user',
              parameters: [
                { name: 'fields', in: 'query', type: 'string' }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const getUser = collection.items.find((i) => i.name === 'Get user');

      const pathParam = getUser.request.params.find((p) => p.name === 'userId' && p.type === 'path');
      const queryParam = getUser.request.params.find((p) => p.name === 'fields' && p.type === 'query');
      expect(pathParam).toBeDefined();
      expect(queryParam).toBeDefined();
    });

    it('should let operation param override path-item param with same name and in', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Override Params API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Path-level ID' }
            ],
            get: {
              summary: 'Get item',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'integer', description: 'Operation-level ID' }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Get item');
      const idParams = req.request.params.filter((p) => p.name === 'id' && p.type === 'path');

      // Should only have one 'id' param (operation overrides path-item)
      expect(idParams).toHaveLength(1);
      expect(idParams[0].description).toBe('Operation-level ID');
    });

    it('should handle path-item params with different in values (query, path, header)', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Mixed Params API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, type: 'string' },
              { name: 'X-Request-ID', in: 'header', type: 'string' },
              { name: 'format', in: 'query', type: 'string' }
            ],
            get: {
              summary: 'Get item',
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Get item');

      expect(req.request.params.find((p) => p.name === 'id' && p.type === 'path')).toBeDefined();
      expect(req.request.params.find((p) => p.name === 'format' && p.type === 'query')).toBeDefined();
      expect(req.request.headers.find((h) => h.name === 'X-Request-ID')).toBeDefined();
    });
  });

  describe('parameter value priority', () => {
    it('should use param.example as the value when present', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Example Param API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/test': {
            get: {
              summary: 'Test',
              parameters: [
                { name: 'q', in: 'query', type: 'string', example: 'hello world' }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Test');
      const param = req.request.params.find((p) => p.name === 'q');
      expect(param.value).toBe('hello world');
      expect(param.enabled).toBe(true);
    });

    it('should use param.default when no example is present', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Default Param API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/test': {
            get: {
              summary: 'Test',
              parameters: [
                { name: 'limit', in: 'query', type: 'integer', default: 20 }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Test');
      const param = req.request.params.find((p) => p.name === 'limit');
      expect(param.value).toBe('20');
      expect(param.enabled).toBe(true);
    });

    it('should use first enum value as fallback when no example or default', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Enum Param API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/test': {
            get: {
              summary: 'Test',
              parameters: [
                { name: 'sort', in: 'query', type: 'string', enum: ['asc', 'desc'], required: true }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Test');
      const sortParams = req.request.params.filter((p) => p.name === 'sort');

      // Should create entry for each enum value
      expect(sortParams.length).toBe(2);
      expect(sortParams[0].value).toBe('asc');
      expect(sortParams[0].enabled).toBe(true); // first + required
      expect(sortParams[1].value).toBe('desc');
    });

    it('should fall back to empty string when no example, default, or enum', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Empty Param API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/test': {
            get: {
              summary: 'Test',
              parameters: [
                { name: 'q', in: 'query', type: 'string' }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Test');
      const param = req.request.params.find((p) => p.name === 'q');
      expect(param.value).toBe('');
      expect(param.enabled).toBe(false);
    });

    it('should prefer param.example over param.default', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Priority Param API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/test': {
            get: {
              summary: 'Test',
              parameters: [
                { name: 'q', in: 'query', type: 'string', example: 'from-example', default: 'from-default' }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Test');
      const param = req.request.params.find((p) => p.name === 'q');
      expect(param.value).toBe('from-example');
    });

    it('should enable param with default when enum has matching default', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Enum Default API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/test': {
            get: {
              summary: 'Test',
              parameters: [
                { name: 'status', in: 'query', type: 'string', enum: ['active', 'inactive', 'pending'], default: 'pending' }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Test');
      const statusParams = req.request.params.filter((p) => p.name === 'status');

      // The default value should be enabled
      const pendingParam = statusParams.find((p) => p.value === 'pending');
      expect(pendingParam.enabled).toBe(true);

      // Non-default values should be disabled
      const activeParam = statusParams.find((p) => p.value === 'active');
      expect(activeParam.enabled).toBe(false);
    });
  });

  describe('collectionFormat support', () => {
    it('should handle collectionFormat=multi by creating separate entries', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Multi API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/pets': {
            get: {
              summary: 'Find pets',
              parameters: [
                {
                  in: 'query', name: 'status', type: 'array',
                  items: { type: 'string', enum: ['available', 'pending', 'sold'] },
                  collectionFormat: 'multi',
                  required: true
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Find pets');
      const statusParams = req.request.params.filter((p) => p.name === 'status' && p.type === 'query');

      expect(statusParams.length).toBe(3);
      expect(statusParams.map((p) => p.value)).toEqual(['available', 'pending', 'sold']);
    });

    it('should handle collectionFormat=csv by joining values with comma', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'CSV API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              parameters: [
                {
                  in: 'query', name: 'tags', type: 'array',
                  items: { type: 'string', enum: ['a', 'b', 'c'] },
                  collectionFormat: 'csv'
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'List items');
      const tagsParams = req.request.params.filter((p) => p.name === 'tags');

      expect(tagsParams.length).toBe(1);
      expect(tagsParams[0].value).toBe('a,b,c');
    });

    it('should handle collectionFormat=pipes by joining with pipe', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Pipes API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              parameters: [
                {
                  in: 'query', name: 'ids', type: 'array',
                  items: { type: 'string', enum: ['x', 'y', 'z'] },
                  collectionFormat: 'pipes'
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'List items');
      const idsParams = req.request.params.filter((p) => p.name === 'ids');

      expect(idsParams.length).toBe(1);
      expect(idsParams[0].value).toBe('x|y|z');
    });

    it('should handle collectionFormat=ssv by joining with space', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'SSV API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              parameters: [
                {
                  in: 'query', name: 'tags', type: 'array',
                  items: { type: 'string', enum: ['a', 'b'] },
                  collectionFormat: 'ssv'
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'List items');
      const tagsParams = req.request.params.filter((p) => p.name === 'tags');

      expect(tagsParams.length).toBe(1);
      expect(tagsParams[0].value).toBe('a b');
    });

    it('should handle collectionFormat=tsv by joining with tab', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'TSV API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              parameters: [
                {
                  in: 'query', name: 'tags', type: 'array',
                  items: { type: 'string', enum: ['a', 'b'] },
                  collectionFormat: 'tsv'
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'List items');
      const tagsParams = req.request.params.filter((p) => p.name === 'tags');

      expect(tagsParams.length).toBe(1);
      expect(tagsParams[0].value).toBe('a\tb');
    });

    it('should default to csv collectionFormat when not specified for array params with enum', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Default Format API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              parameters: [
                {
                  in: 'query', name: 'colors', type: 'array',
                  items: { type: 'string', enum: ['red', 'blue'] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'List items');
      const colorParams = req.request.params.filter((p) => p.name === 'colors');

      expect(colorParams.length).toBe(1);
      expect(colorParams[0].value).toBe('red,blue');
    });
  });

  describe('object parameter expansion', () => {
    it('should expand object-type query params into individual properties', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Object Param API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/search': {
            get: {
              summary: 'Search',
              parameters: [
                {
                  in: 'query', name: 'filter', type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', description: 'Filter by status', enum: ['active', 'inactive'] },
                    limit: { type: 'integer', description: 'Max results', default: 10 }
                  }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Search');

      const statusParam = req.request.params.find((p) => p.name === 'status' && p.type === 'query');
      const limitParam = req.request.params.find((p) => p.name === 'limit' && p.type === 'query');
      expect(statusParam).toBeDefined();
      expect(statusParam.value).toBe('active');
      expect(limitParam).toBeDefined();
      expect(limitParam.value).toBe('10');

      // Should NOT have a 'filter' param
      const filterParam = req.request.params.find((p) => p.name === 'filter');
      expect(filterParam).toBeUndefined();
    });

    it('should expand object-type path params into individual properties', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Path Object API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items/{composite}': {
            get: {
              summary: 'Get item',
              parameters: [
                {
                  in: 'path', name: 'composite', type: 'object',
                  properties: {
                    type: { type: 'string', example: 'widget' },
                    id: { type: 'integer', example: 42 }
                  }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Get item');

      const typeParam = req.request.params.find((p) => p.name === 'type' && p.type === 'path');
      const idParam = req.request.params.find((p) => p.name === 'id' && p.type === 'path');
      expect(typeParam).toBeDefined();
      expect(typeParam.value).toBe('widget');
      expect(idParam).toBeDefined();
      expect(idParam.value).toBe('42');
    });

    it('should expand object-type header params into individual headers', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Header Object API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/data': {
            get: {
              summary: 'Get data',
              parameters: [
                {
                  in: 'header', name: 'X-Custom', type: 'object',
                  properties: {
                    'X-Trace-ID': { type: 'string', example: 'abc123' },
                    'X-Version': { type: 'string', default: 'v2' }
                  }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items.find((i) => i.name === 'Get data');

      const traceHeader = req.request.headers.find((h) => h.name === 'X-Trace-ID');
      const versionHeader = req.request.headers.find((h) => h.name === 'X-Version');
      expect(traceHeader).toBeDefined();
      expect(traceHeader.value).toBe('abc123');
      expect(versionHeader).toBeDefined();
      expect(versionHeader.value).toBe('v2');
    });
  });
});
