/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importCollectionFromFilePath } from '../../src/openapi/openapi_to_bruno';

describe('openapi-collection', () => {
  it('should correctly import a valid OpenAPI file', async () => {
    // Path to the sample OpenAPI file
    const fileName = path.resolve(__dirname, '../data', 'collections/sample_openapi_collection.yaml');

    // Call the importCollection function with the sample file
    const brunoCollection = await importCollectionFromFilePath({ filepath: fileName });

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchObject(expectedOutput);
  });
});

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