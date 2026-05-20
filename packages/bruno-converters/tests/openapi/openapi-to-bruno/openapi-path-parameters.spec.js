import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi path-item level parameters', () => {
  it('should apply path-item parameters to all operations when no operation params exist', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Path Params API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /items/{itemId}:
    parameters:
      - name: itemId
        in: path
        required: true
        schema:
          type: string
        description: 'The item ID'
    get:
      summary: 'Get item'
      operationId: 'getItem'
      responses:
        '200':
          description: 'OK'
    put:
      summary: 'Update item'
      operationId: 'updateItem'
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);

    // Both GET and PUT should have the itemId path parameter
    const getItem = result.items.find((i) => i.name === 'Get item');
    const putItem = result.items.find((i) => i.name === 'Update item');

    expect(getItem.request.params).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'itemId', type: 'path', enabled: true })])
    );
    expect(putItem.request.params).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'itemId', type: 'path', enabled: true })])
    );
  });

  it('should preserve operation-only parameters unchanged', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Op Only Params API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /search:
    get:
      summary: 'Search'
      operationId: 'search'
      parameters:
        - name: q
          in: query
          required: true
          schema:
            type: string
          description: 'Search query'
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const search = result.items.find((i) => i.name === 'Search');
    const queryParams = search.request.params.filter((p) => p.type === 'query');
    expect(queryParams).toHaveLength(1);
    expect(queryParams[0].name).toBe('q');
  });

  it('should merge path-item and operation params with no overlap', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Merge No Overlap API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /items/{itemId}:
    parameters:
      - name: itemId
        in: path
        required: true
        schema:
          type: string
    get:
      summary: 'Get item'
      operationId: 'getItem'
      parameters:
        - name: fields
          in: query
          required: false
          schema:
            type: string
          description: 'Fields to include'
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const getItem = result.items.find((i) => i.name === 'Get item');

    // Should have both the path param from path-item and the query param from operation
    const pathParams = getItem.request.params.filter((p) => p.type === 'path');
    const queryParams = getItem.request.params.filter((p) => p.type === 'query');
    expect(pathParams).toHaveLength(1);
    expect(pathParams[0].name).toBe('itemId');
    expect(queryParams).toHaveLength(1);
    expect(queryParams[0].name).toBe('fields');
  });

  it('should let operation param override path-item param with same name and in', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Override API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /items:
    parameters:
      - name: limit
        in: query
        required: false
        schema:
          type: integer
        description: 'Default limit from path-item'
    get:
      summary: 'List items'
      operationId: 'listItems'
      parameters:
        - name: limit
          in: query
          required: true
          schema:
            type: integer
            maximum: 50
          description: 'Override limit for list operation'
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const listItems = result.items.find((i) => i.name === 'List items');

    // Should have exactly one 'limit' query param -- the operation-level one
    const limitParams = listItems.request.params.filter((p) => p.name === 'limit');
    expect(limitParams).toHaveLength(1);
    expect(limitParams[0].description).toBe('Override limit for list operation');
    expect(limitParams[0].enabled).toBe(true); // required=true from operation
  });

  it('should handle path-item params with different in values (query, path, header)', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Mixed In Values API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /resources/{resourceId}:
    parameters:
      - name: resourceId
        in: path
        required: true
        schema:
          type: string
      - name: format
        in: query
        required: false
        schema:
          type: string
        description: 'Response format'
      - name: X-Request-ID
        in: header
        required: false
        schema:
          type: string
        description: 'Request tracking ID'
    get:
      summary: 'Get resource'
      operationId: 'getResource'
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const getResource = result.items.find((i) => i.name === 'Get resource');

    const pathParams = getResource.request.params.filter((p) => p.type === 'path');
    const queryParams = getResource.request.params.filter((p) => p.type === 'query');
    const headers = getResource.request.headers;

    expect(pathParams).toHaveLength(1);
    expect(pathParams[0].name).toBe('resourceId');

    expect(queryParams).toHaveLength(1);
    expect(queryParams[0].name).toBe('format');

    // Header params end up in request.headers, not request.params
    const trackingHeader = headers.find((h) => h.name === 'X-Request-ID');
    expect(trackingHeader).toBeDefined();
    expect(trackingHeader.description).toBe('Request tracking ID');
  });
});

describe('openapi parameter default and example values', () => {
  it('should use param.example as the value when present', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Param Example API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /search:
    get:
      summary: 'Search'
      operationId: 'search'
      parameters:
        - name: q
          in: query
          required: true
          example: 'hello world'
          schema:
            type: string
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const search = result.items.find((i) => i.name === 'Search');
    const qParam = search.request.params.find((p) => p.name === 'q');
    expect(qParam.value).toBe('hello world');
  });

  it('should use schema.default when param.example is not present', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Schema Default API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /items:
    get:
      summary: 'List items'
      operationId: 'listItems'
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const listItems = result.items.find((i) => i.name === 'List items');
    const limitParam = listItems.request.params.find((p) => p.name === 'limit');
    expect(limitParam.value).toBe('20');
  });

  it('should use schema.example when no param.example or schema.default exists', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Schema Example API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /users/{userId}:
    get:
      summary: 'Get user'
      operationId: 'getUser'
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            example: 'user-123'
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const getUser = result.items.find((i) => i.name === 'Get user');
    const userIdParam = getUser.request.params.find((p) => p.name === 'userId');
    expect(userIdParam.value).toBe('user-123');
  });

  it('should fall back to empty string when no example or default is present', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'No Default API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /items:
    get:
      summary: 'List items'
      operationId: 'listItems'
      parameters:
        - name: filter
          in: query
          required: false
          schema:
            type: string
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const listItems = result.items.find((i) => i.name === 'List items');
    const filterParam = listItems.request.params.find((p) => p.name === 'filter');
    expect(filterParam.value).toBe('');
  });

  it('should use property example/default for object schema expansion', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Object Schema API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/items': {
          get: {
            summary: 'List items',
            operationId: 'listItems',
            parameters: [
              {
                name: 'pagination',
                in: 'query',
                schema: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', example: 1 },
                    size: { type: 'integer', default: 25 },
                    sort: { type: 'string' }
                  },
                  required: ['page']
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const listItems = result.items.find((i) => i.name === 'List items');
    const queryParams = listItems.request.params.filter((p) => p.type === 'query');

    const pageParam = queryParams.find((p) => p.name === 'page');
    expect(pageParam.value).toBe('1'); // from prop.example

    const sizeParam = queryParams.find((p) => p.name === 'size');
    expect(sizeParam.value).toBe('25'); // from prop.default

    const sortParam = queryParams.find((p) => p.name === 'sort');
    expect(sortParam.value).toBe(''); // no example or default
  });

  it('should use top-level schema.example object for property values when no prop-level example', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Schema Example API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/books': {
          get: {
            summary: 'List books',
            operationId: 'listBooks',
            parameters: [
              {
                name: 'filter',
                in: 'query',
                schema: {
                  type: 'object',
                  example: {
                    title: 'The Great Gatsby',
                    author: 'F. Scott Fitzgerald'
                  },
                  properties: {
                    title: { type: 'string' },
                    author: { type: 'string' },
                    genre: { type: 'string' }
                  }
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const listBooks = result.items.find((i) => i.name === 'List books');
    const queryParams = listBooks.request.params.filter((p) => p.type === 'query');

    const titleParam = queryParams.find((p) => p.name === 'title');
    expect(titleParam.value).toBe('The Great Gatsby'); // from schema.example.title

    const authorParam = queryParams.find((p) => p.name === 'author');
    expect(authorParam.value).toBe('F. Scott Fitzgerald'); // from schema.example.author

    const genreParam = queryParams.find((p) => p.name === 'genre');
    expect(genreParam.value).toBe(''); // not in schema.example, no prop example/default
  });

  it('should use first enum value as fallback when no example or default', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Enum Fallback API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/books': {
          get: {
            summary: 'List books',
            operationId: 'listBooks',
            parameters: [
              {
                name: 'filter',
                in: 'query',
                schema: {
                  type: 'object',
                  properties: {
                    genre: { type: 'string', enum: ['Fiction', 'Non-Fiction', 'Science'] },
                    format: { type: 'string', enum: ['hardcover', 'paperback'] },
                    sort: { type: 'string' }
                  }
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const listBooks = result.items.find((i) => i.name === 'List books');
    const queryParams = listBooks.request.params.filter((p) => p.type === 'query');

    const genreParam = queryParams.find((p) => p.name === 'genre');
    expect(genreParam.value).toBe('Fiction'); // first enum value

    const formatParam = queryParams.find((p) => p.name === 'format');
    expect(formatParam.value).toBe('hardcover'); // first enum value

    const sortParam = queryParams.find((p) => p.name === 'sort');
    expect(sortParam.value).toBe(''); // no enum, no example, no default
  });

  it('should prefer prop.example over schema.example[propName]', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Priority API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/books': {
          get: {
            summary: 'List books',
            operationId: 'listBooks',
            parameters: [
              {
                name: 'filter',
                in: 'query',
                schema: {
                  type: 'object',
                  example: {
                    title: 'Schema-level title',
                    author: 'Schema-level author'
                  },
                  properties: {
                    title: { type: 'string', example: 'Property-level title' },
                    author: { type: 'string' }
                  }
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const listBooks = result.items.find((i) => i.name === 'List books');
    const queryParams = listBooks.request.params.filter((p) => p.type === 'query');

    const titleParam = queryParams.find((p) => p.name === 'title');
    expect(titleParam.value).toBe('Property-level title'); // prop.example wins over schema.example

    const authorParam = queryParams.find((p) => p.name === 'author');
    expect(authorParam.value).toBe('Schema-level author'); // falls back to schema.example
  });

  it('should prefer param.example over schema.default', () => {
    const spec = `
openapi: '3.0.0'
info:
  title: 'Priority API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /items:
    get:
      summary: 'List items'
      operationId: 'listItems'
      parameters:
        - name: limit
          in: query
          required: false
          example: 50
          schema:
            type: integer
            default: 20
            example: 10
      responses:
        '200':
          description: 'OK'
`;
    const result = openApiToBruno(spec);
    const listItems = result.items.find((i) => i.name === 'List items');
    const limitParam = listItems.request.params.find((p) => p.name === 'limit');
    expect(limitParam.value).toBe('50'); // param.example wins over schema.default and schema.example
  });

  it('should use schema.examples (plural) when no other example or default exists', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Schema Examples API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/items': {
          get: {
            summary: 'List items',
            operationId: 'listItems',
            parameters: [
              {
                name: 'status',
                in: 'query',
                schema: {
                  type: 'string',
                  examples: ['active', 'archived']
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const listItems = result.items.find((i) => i.name === 'List items');
    const statusParam = listItems.request.params.find((p) => p.name === 'status');
    expect(statusParam.value).toBe('active'); // first schema.examples value
  });

  it('should use schema.minimum as fallback when no example, default, or enum exists', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Minimum API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/items': {
          get: {
            summary: 'List items',
            operationId: 'listItems',
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const listItems = result.items.find((i) => i.name === 'List items');
    const pageParam = listItems.request.params.find((p) => p.name === 'page');
    expect(pageParam.value).toBe('1'); // schema.minimum as fallback
  });
});

describe('array param serialization — OAS defaults per location', () => {
  describe('path — simple style, explode:false (comma-join)', () => {
    it('param.example array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/users/{ids}': {
            get: {
              summary: 'Get users',
              operationId: 'getUsers',
              parameters: [
                {
                  name: 'ids',
                  in: 'path',
                  required: true,
                  example: [3, 4, 5],
                  schema: { type: 'array', items: { type: 'integer' } }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const idsParams = result.items.find((i) => i.name === 'Get users').request.params.filter((p) => p.name === 'ids');
      expect(idsParams).toHaveLength(1);
      expect(idsParams[0].value).toBe('3,4,5');
      expect(idsParams[0].enabled).toBe(true);
    });

    it('param.examples[0].value array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/users/{ids}': {
            get: {
              summary: 'Get users',
              operationId: 'getUsers',
              parameters: [
                {
                  name: 'ids',
                  in: 'path',
                  required: true,
                  examples: { sample: { value: [10, 20, 30] } },
                  schema: { type: 'array', items: { type: 'integer' } }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const idsParams = result.items.find((i) => i.name === 'Get users').request.params.filter((p) => p.name === 'ids');
      expect(idsParams).toHaveLength(1);
      expect(idsParams[0].value).toBe('10,20,30');
      expect(idsParams[0].enabled).toBe(true);
    });

    it('schema.default array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/users/{roles}': {
            get: {
              summary: 'Get by roles',
              operationId: 'getByRoles',
              parameters: [
                {
                  name: 'roles',
                  in: 'path',
                  required: true,
                  schema: { type: 'array', items: { type: 'string' }, default: ['admin', 'user'] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const rolesParam = result.items.find((i) => i.name === 'Get by roles').request.params.find((p) => p.name === 'roles');
      expect(rolesParam.value).toBe('admin,user');
      expect(rolesParam.enabled).toBe(true);
    });

    it('items.enum default array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items/{types}': {
            get: {
              summary: 'Get by types',
              operationId: 'getByTypes',
              parameters: [
                {
                  name: 'types',
                  in: 'path',
                  required: true,
                  schema: { type: 'array', items: { type: 'string', enum: ['a', 'b', 'c'] }, default: ['a', 'b'] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const typesParam = result.items.find((i) => i.name === 'Get by types').request.params.find((p) => p.name === 'types');
      expect(typesParam.value).toBe('a,b');
      expect(typesParam.enabled).toBe(true);
    });

    it('schema.example array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/users/{ids}': {
            get: {
              summary: 'Get users',
              operationId: 'getUsers',
              parameters: [
                {
                  name: 'ids',
                  in: 'path',
                  required: true,
                  schema: { type: 'array', items: { type: 'integer' }, example: [7, 8, 9] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const params = result.items.find((i) => i.name === 'Get users').request.params.filter((p) => p.name === 'ids');
      expect(params).toHaveLength(1);
      expect(params[0].value).toBe('7,8,9');
      expect(params[0].enabled).toBe(true);
    });

    it('schema.examples[0] array', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/users/{ids}': {
            get: {
              summary: 'Get users',
              operationId: 'getUsers',
              parameters: [
                {
                  name: 'ids',
                  in: 'path',
                  required: true,
                  schema: { type: 'array', items: { type: 'integer' }, examples: [[1, 2, 3]] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const params = result.items.find((i) => i.name === 'Get users').request.params.filter((p) => p.name === 'ids');
      expect(params).toHaveLength(1);
      expect(params[0].value).toBe('1,2,3');
      expect(params[0].enabled).toBe(true);
    });
  });

  describe('header — simple style, explode:false (comma-join)', () => {
    it('param.example array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'X-Ids',
                  in: 'header',
                  example: [1, 2, 3],
                  schema: { type: 'array', items: { type: 'integer' } }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const header = result.items.find((i) => i.name === 'List items').request.headers.find((h) => h.name === 'X-Ids');
      expect(header.value).toBe('1,2,3');
      expect(header.enabled).toBe(true);
    });

    it('param.examples[0].value array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'X-Ids',
                  in: 'header',
                  examples: { sample: { value: ['a', 'b', 'c'] } },
                  schema: { type: 'array', items: { type: 'string' } }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const header = result.items.find((i) => i.name === 'List items').request.headers.find((h) => h.name === 'X-Ids');
      expect(header.value).toBe('a,b,c');
      expect(header.enabled).toBe(true);
    });

    it('schema.default array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'X-Roles',
                  in: 'header',
                  schema: { type: 'array', items: { type: 'string' }, default: ['read', 'write'] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const header = result.items.find((i) => i.name === 'List items').request.headers.find((h) => h.name === 'X-Roles');
      expect(header.value).toBe('read,write');
      expect(header.enabled).toBe(true);
    });

    it('schema.example array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'X-Ids',
                  in: 'header',
                  schema: { type: 'array', items: { type: 'integer' }, example: [4, 5, 6] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const header = result.items.find((i) => i.name === 'List items').request.headers.find((h) => h.name === 'X-Ids');
      expect(header.value).toBe('4,5,6');
      expect(header.enabled).toBe(true);
    });

    it('schema.examples[0] array', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'X-Tags',
                  in: 'header',
                  schema: { type: 'array', items: { type: 'string' }, examples: [['x', 'y', 'z']] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const header = result.items.find((i) => i.name === 'List items').request.headers.find((h) => h.name === 'X-Tags');
      expect(header.value).toBe('x,y,z');
      expect(header.enabled).toBe(true);
    });
  });

  describe('query — form style, explode:true (one entry per item)', () => {
    it('param.example array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'ids',
                  in: 'query',
                  example: [3, 4, 5],
                  schema: { type: 'array', items: { type: 'integer' } }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const params = result.items.find((i) => i.name === 'List items').request.params.filter((p) => p.name === 'ids');
      expect(params).toHaveLength(3);
      expect(params.map((p) => p.value)).toEqual(['3', '4', '5']);
      params.forEach((p) => expect(p.enabled).toBe(true));
    });

    it('param.examples[0].value array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'tags',
                  in: 'query',
                  examples: { sample: { value: ['foo', 'bar', 'baz'] } },
                  schema: { type: 'array', items: { type: 'string' } }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const params = result.items.find((i) => i.name === 'List items').request.params.filter((p) => p.name === 'tags');
      expect(params).toHaveLength(3);
      expect(params.map((p) => p.value)).toEqual(['foo', 'bar', 'baz']);
      params.forEach((p) => expect(p.enabled).toBe(true));
    });

    it('schema.default array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'status',
                  in: 'query',
                  schema: { type: 'array', items: { type: 'string' }, default: ['active', 'pending'] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const params = result.items.find((i) => i.name === 'List items').request.params.filter((p) => p.name === 'status');
      expect(params).toHaveLength(2);
      expect(params.map((p) => p.value)).toEqual(['active', 'pending']);
      params.forEach((p) => expect(p.enabled).toBe(true));
    });

    it('schema.example array', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'colors',
                  in: 'query',
                  schema: { type: 'array', items: { type: 'string' }, example: ['red', 'green', 'blue'] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const params = result.items.find((i) => i.name === 'List items').request.params.filter((p) => p.name === 'colors');
      expect(params).toHaveLength(3);
      expect(params.map((p) => p.value)).toEqual(['red', 'green', 'blue']);
      params.forEach((p) => expect(p.enabled).toBe(true));
    });

    it('schema.examples[0] array', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'tags',
                  in: 'query',
                  schema: { type: 'array', items: { type: 'string' }, examples: [['foo', 'bar', 'baz']] }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const params = result.items.find((i) => i.name === 'List items').request.params.filter((p) => p.name === 'tags');
      expect(params).toHaveLength(3);
      expect(params.map((p) => p.value)).toEqual(['foo', 'bar', 'baz']);
      params.forEach((p) => expect(p.enabled).toBe(true));
    });
  });

  describe('cookie — not mapped (Bruno has no cookie param type)', () => {
    it('cookie params are not added to request.params or request.headers', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {
          '/items': {
            get: {
              summary: 'List items',
              operationId: 'listItems',
              parameters: [
                {
                  name: 'session',
                  in: 'cookie',
                  example: ['x', 'y'],
                  schema: { type: 'array', items: { type: 'string' } }
                }
              ],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      };
      const result = openApiToBruno(spec);
      const req = result.items.find((i) => i.name === 'List items').request;
      expect(req.params.filter((p) => p.name === 'session')).toHaveLength(0);
      expect(req.headers.filter((h) => h.name === 'session')).toHaveLength(0);
    });
  });
});

// Tests backward-compat handling of non-standard in: 'querystring' (some importers emit this instead of 'query')
describe('openapi querystring parameter location', () => {
  it('should map in: "querystring" to query type', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Querystring API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/search': {
          get: {
            summary: 'Search',
            operationId: 'search',
            parameters: [
              {
                name: 'q',
                in: 'querystring',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const result = openApiToBruno(spec);
    const search = result.items.find((i) => i.name === 'Search');
    const queryParams = search.request.params.filter((p) => p.type === 'query');
    expect(queryParams).toHaveLength(1);
    expect(queryParams[0].name).toBe('q');
    expect(queryParams[0].enabled).toBe(true);
  });
});
