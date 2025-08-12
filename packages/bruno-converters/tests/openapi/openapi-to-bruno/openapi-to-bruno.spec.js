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
  - url: "https://httpbin.org"
`;

const expectedOutput = {
  "environments": [
    {
      "name": "Environment 1",
      "uid": "mockeduuidvalue123456",
      "variables": [
        {
          "enabled": true,
          "name": "baseUrl",
          "secret": false,
          "type": "text",
          "uid": "mockeduuidvalue123456",
          "value": "https://httpbin.org",
        },
      ],
    },
  ],
  "items": [
    {
      "items": [
        {
          "name": "Request1 and Request2",
          "request": {
            "auth": {
              "basic": null,
              "bearer": null,
              "digest": null,
              "mode": "inherit",
            },
            "body": {
              "formUrlEncoded": [],
              "json": null,
              "mode": "none",
              "multipartForm": [],
              "text": null,
              "xml": null,
            },
            "headers": [],
            "method": "GET",
            "params": [],
            "script": {
              "res": null,
            },
            "url": "{{baseUrl}}/get",
          },
          "seq": 1,
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
        },
      ],
      "name": "Folder1",
      "type": "folder",
      "uid": "mockeduuidvalue123456",
    },
  ],
  "name": "Hello World OpenAPI",
  "uid": "mockeduuidvalue123456",
  "version": "1",
};