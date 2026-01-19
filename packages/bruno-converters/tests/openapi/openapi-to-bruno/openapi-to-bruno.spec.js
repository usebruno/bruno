import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi-collection', () => {
  it('should correctly import a valid OpenAPI file', async () => {
    const brunoCollection = openApiToBruno(openApiCollectionString);

    expect(brunoCollection).toMatchObject(expectedOutput);
  });

  it('should set auth mode to inherit when no security is defined in the collection', () => {
    const brunoCollection = openApiToBruno(openApiCollectionString);

    // The openApiCollectionString has no security defined, so auth mode should be 'inherit'
    expect(brunoCollection.items[0].items[0].request.auth.mode).toBe('inherit');
  });

  it('trims whitespace from info.title and uses the trimmed value as the collection name', () => {
    const openApiWithTitle = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: '  My API  '
paths:
  /get:
    get:
      summary: 'Request'
      operationId: 'getRequest'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
    const result = openApiToBruno(openApiWithTitle);
    expect(result.name).toBe('My API');
  });

  it('defaults to Untitled Collection if info.title is only whitespace', () => {
    const openApiWithTitle = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: '   '
paths:
  /get:
    get:
      summary: 'Request'
      operationId: 'getRequest'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
    const result = openApiToBruno(openApiWithTitle);
    expect(result.name).toBe('Untitled Collection');
  });

  it('defaults to Untitled Collection if info.title is an empty string', () => {
    const openApiWithEmptyTitle = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: ''
paths:
  /get:
    get:
      summary: 'Request'
      operationId: 'getRequest'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
    const result = openApiToBruno(openApiWithEmptyTitle);
    expect(result.name).toBe('Untitled Collection');
  });

  it('defaults to Untitled Collection if info.title is missing', () => {
    const openApiWithoutTitle = `
openapi: '3.0.0'
info:
  version: '1.0.0'
paths:
  /get:
    get:
      summary: 'Request'
      operationId: 'getRequest'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
    const result = openApiToBruno(openApiWithoutTitle);
    expect(result.name).toBe('Untitled Collection');
  });

  it('defaults to Untitled Collection if info is missing entirely', () => {
    const openApiWithMissingInfo = `
openapi: '3.0.0'
paths:
  /get:
    get:
      summary: 'Request'
      operationId: 'getRequest'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
    const result = openApiToBruno(openApiWithMissingInfo);
    expect(result.name).toBe('Untitled Collection');
  });

  describe('authentication inheritance', () => {
    it('should set auth mode to inherit when no security is defined', () => {
      const openApiWithoutSecurity = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API without security'
paths:
  /test:
    get:
      summary: 'Test endpoint'
      operationId: 'testEndpoint'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
      const result = openApiToBruno(openApiWithoutSecurity);
      expect(result.items[0].request.auth.mode).toBe('inherit');
    });

    it('should set auth mode to inherit when no global security schemes exist', () => {
      const openApiWithEmptySecurity = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with empty security'
security: []
paths:
  /test:
    get:
      summary: 'Test endpoint'
      operationId: 'testEndpoint'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
      const result = openApiToBruno(openApiWithEmptySecurity);
      expect(result.items[0].request.auth.mode).toBe('inherit');
    });

    it('should set auth mode to inherit when components.securitySchemes is empty', () => {
      const openApiWithEmptyComponents = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with empty components'
components:
  securitySchemes: {}
paths:
  /test:
    get:
      summary: 'Test endpoint'
      operationId: 'testEndpoint'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
      const result = openApiToBruno(openApiWithEmptyComponents);
      expect(result.items[0].request.auth.mode).toBe('inherit');
    });

    it('should set auth mode to inherit when operation has empty security array', () => {
      const openApiWithEmptyOperationSecurity = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with empty operation security'
components:
  securitySchemes:
    basicAuth:
      type: http
      scheme: basic
paths:
  /test:
    get:
      summary: 'Test endpoint'
      operationId: 'testEndpoint'
      security: []
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
      const result = openApiToBruno(openApiWithEmptyOperationSecurity);
      expect(result.items[0].request.auth.mode).toBe('inherit');
    });

    it('should set auth mode to inherit for folder root when no security is defined', () => {
      const openApiWithTags = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with tags'
paths:
  /test:
    get:
      tags:
        - TestGroup
      summary: 'Test endpoint'
      operationId: 'testEndpoint'
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
      const result = openApiToBruno(openApiWithTags);
      expect(result.items[0].type).toBe('folder');
      expect(result.items[0].root.request.auth.mode).toBe('inherit');
    });
  });

  it('should handle requestBody with empty content object (undefined mimeType)', () => {
    const openApiWithEmptyContent = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with empty requestBody content'
paths:
  /test:
    post:
      summary: 'Test endpoint with empty content'
      operationId: 'testEndpoint'
      requestBody:
        content: {}
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://example.com'
`;
    const result = openApiToBruno(openApiWithEmptyContent);
    expect(result.items[0].request.body.mode).toBe('none');
    expect(result.items[0].request.body.json).toBe(null);
    expect(result.items[0].request.body.text).toBe(null);
    expect(result.items[0].request.body.xml).toBe(null);
  });
});

const openApiCollectionString = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Hello World OpenAPI"
paths:
  /get:
    get:
      tags:
        - Folder1
        - Folder2
      summary: "Request1 and Request2"
      operationId: "getRequests"
      responses:
        '200':
          description: "Successful response"
components:
  parameters:
    var1:
      in: "query"
      name: "var1"
      required: true
      schema:
        type: "string"
        default: "value1"
    var2:
      in: "query"
      name: "var2"
      required: true
      schema:
        type: "string"
        default: "value2"
servers:
  - url: "https://echo.usebruno.com"
`;

const expectedOutput = {
  environments: [
    {
      name: 'Environment 1',
      uid: 'mockeduuidvalue123456',
      variables: [
        {
          enabled: true,
          name: 'baseUrl',
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456',
          value: 'https://echo.usebruno.com'
        }
      ]
    }
  ],
  items: [
    {
      items: [
        {
          name: 'Request1 and Request2',
          request: {
            auth: {
              basic: null,
              bearer: null,
              digest: null,
              mode: 'inherit'
            },
            body: {
              formUrlEncoded: [],
              json: null,
              mode: 'none',
              multipartForm: [],
              text: null,
              xml: null
            },
            headers: [],
            method: 'GET',
            params: [],
            script: {
              res: null
            },
            url: '{{baseUrl}}/get'
          },
          seq: 1,
          type: 'http-request',
          uid: 'mockeduuidvalue123456'
        }
      ],
      name: 'Folder1',
      type: 'folder',
      uid: 'mockeduuidvalue123456'
    }
  ],
  name: 'Hello World OpenAPI',
  uid: 'mockeduuidvalue123456',
  version: '1'
};

describe('openapi-collection: object schema parameters', () => {
  it('should expand object schema query parameters with $ref into individual properties', () => {
    const openApiSpec = `
openapi: '3.0.3'
info:
  title: 'Test API for Object Schema Parameters'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com/v1'
paths:
  /items:
    get:
      summary: 'Get items with pagination'
      operationId: 'getItems'
      parameters:
        - name: date
          in: query
          required: true
          schema:
            type: string
            format: date
          description: 'Filter by date'
        - name: paginationParams
          in: query
          required: true
          schema:
            $ref: '#/components/schemas/PaginationParams'
      responses:
        '200':
          description: 'Successful response'
components:
  schemas:
    PaginationParams:
      type: object
      properties:
        page:
          type: integer
          format: int32
          minimum: 0
          description: 'Page number'
        size:
          type: integer
          format: int32
          maximum: 100
          minimum: 1
          description: 'Page size'
      required:
        - page
        - size
`;

    const result = openApiToBruno(openApiSpec);

    // Find the request item
    const requestItem = result.items[0];

    // Verify that we have 3 query parameters: date, page, size
    const queryParams = requestItem.request.params.filter((p) => p.type === 'query');
    expect(queryParams.length).toBe(3);

    // Check that 'date' parameter exists
    const dateParam = queryParams.find((p) => p.name === 'date');
    expect(dateParam).toBeDefined();
    expect(dateParam.description).toBe('Filter by date');
    expect(dateParam.enabled).toBe(true);

    // Check that 'page' parameter exists (expanded from PaginationParams)
    const pageParam = queryParams.find((p) => p.name === 'page');
    expect(pageParam).toBeDefined();
    expect(pageParam.description).toBe('Page number');
    expect(pageParam.enabled).toBe(true); // required in schema

    // Check that 'size' parameter exists (expanded from PaginationParams)
    const sizeParam = queryParams.find((p) => p.name === 'size');
    expect(sizeParam).toBeDefined();
    expect(sizeParam.description).toBe('Page size');
    expect(sizeParam.enabled).toBe(true); // required in schema

    // Verify that 'paginationParams' does NOT exist as a parameter
    const paginationParam = queryParams.find((p) => p.name === 'paginationParams');
    expect(paginationParam).toBeUndefined();
  });
});
