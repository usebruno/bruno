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

describe('openapi querystring parameter location', () => {
  it('should map in: "querystring" to query type', () => {
    const spec = {
      openapi: '3.2.0',
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
