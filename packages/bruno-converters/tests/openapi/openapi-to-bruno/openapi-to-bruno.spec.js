import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi-collection', () => {
  it('should correctly import a valid OpenAPI file', async () => {
    const brunoCollection = openApiToBruno(openApiCollectionString);

    expect(brunoCollection).toMatchObject(expectedOutput);
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
              "mode": "none",
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