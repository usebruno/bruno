import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importCollectionFromFilepath } from '../../src/insomnia/insomnia_to_bruno';

describe('insomnia-collection', () => {
  it('should correctly import a valid Insomnia collection file', async () => {
    // Path to the sample Insomnia file
    const fileName = path.resolve(__dirname, '../data', 'collections/sample_insomnia_collection.json');

    // Call the importCollection function with the sample file
    const brunoCollection = await importCollectionFromFilepath({ filepath: fileName });

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchObject(expectedOutput)
  });
});

const expectedOutput = {
  "environments": [],
  "items": [
    {
      "items": [
        {
          "name": "Request1",
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
            "url": "https://httpbin.org/get",
          },
          "seq": 1,
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
        },
        {
          "name": "Request1",
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
            "url": "https://httpbin.org/get",
          },
          "seq": 2,
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
        },
      ],
      "name": "Folder1",
      "type": "folder",
      "uid": "mockeduuidvalue123456",
    },
    {
      "items": [
        {
          "name": "Request2",
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
            "url": "https://httpbin.org/get",
          },
          "seq": 1,
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
        },
        {
          "name": "Request2",
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
            "url": "https://httpbin.org/get",
          },
          "seq": 2,
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
        },
      ],
      "name": "Folder2",
      "type": "folder",
      "uid": "mockeduuidvalue123456",
    },
  ],
  "name": "Hello World Workspace Insomnia",
  "uid": "mockeduuidvalue123456",
  "version": "1",
};