import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importCollectionFromFilepath } from '../../src/postman/postman_to_bruno';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    // Path to the sample Postman collection file
    const fileName = path.resolve(__dirname, '../data', 'collections/sample_postman_collection.json');

    // Call the importCollection function with the sample file
    const brunoCollection = await importCollectionFromFilepath({ filepath: fileName, options: {
      enablePostmanTranslations: {
        enabled: true,
        label: 'Auto translate postman scripts',
        subLabel:
          "When enabled, Bruno will try as best to translate the scripts from the imported collection to Bruno's format."
      }
    }});

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchObject(expectedOutput);
  });
});

const expectedOutput = {
  "collection": {
    "name": "CRUD",
    "uid": "mockeduuidvalue123456",
    "version": "1",
    "items": [
      {
        "uid": "mockeduuidvalue123456",
        "name": "GET",
        "type": "http-request",
        "request": {
          "url": "https://node-task2.herokuapp.com/api/notes/",
          "method": "GET",
          "auth": {
            "mode": "none",
            "basic": null,
            "bearer": null,
            "awsv4": null
          },
          "headers": [],
          "params": [],
          "body": {
            "mode": "none",
            "json": null,
            "text": null,
            "xml": null,
            "formUrlEncoded": [],
            "multipartForm": []
          }
        }
      },
      {
        "uid": "mockeduuidvalue123456",
        "name": "POST",
        "type": "http-request",
        "request": {
          "url": "https://node-task2.herokuapp.com/api/notes/",
          "method": "POST",
          "auth": {
            "mode": "none",
            "basic": null,
            "bearer": null,
            "awsv4": null
          },
          "headers": [],
          "params": [],
          "body": {
            "mode": "json",
            "json": "{\"id\": 1, \"title\": \"first\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
            "text": null,
            "xml": null,
            "formUrlEncoded": [],
            "multipartForm": []
          },
          "script": {
            "req": ""
          },
          "tests": ""
        }
      },
      {
        "uid": "mockeduuidvalue123456",
        "name": "POST_1",
        "type": "http-request",
        "request": {
          "url": "https://node-task2.herokuapp.com/api/notes/",
          "method": "POST",
          "auth": {
            "mode": "none",
            "basic": null,
            "bearer": null,
            "awsv4": null
          },
          "headers": [],
          "params": [],
          "body": {
            "mode": "json",
            "json": "{\"id\": 2, \"title\": \"second\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
            "text": null,
            "xml": null,
            "formUrlEncoded": [],
            "multipartForm": []
          }
        }
      },
      {
        "uid": "mockeduuidvalue123456",
        "name": "PUT",
        "type": "http-request",
        "request": {
          "url": "https://node-task2.herokuapp.com/api/notes/1",
          "method": "PUT",
          "auth": {
            "mode": "none",
            "basic": null,
            "bearer": null,
            "awsv4": null
          },
          "headers": [],
          "params": [],
          "body": {
            "mode": "json",
            "json": "{\"id\": 1, \"title\": \"first changed\", \"content\": \"new text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
            "text": null,
            "xml": null,
            "formUrlEncoded": [],
            "multipartForm": []
          }
        }
      },
      {
        "uid": "mockeduuidvalue123456",
        "name": "DELETE",
        "type": "http-request",
        "request": {
          "url": "https://node-task2.herokuapp.com/api/notes/2",
          "method": "DELETE",
          "auth": {
            "mode": "none",
            "basic": null,
            "bearer": null,
            "awsv4": null
          },
          "headers": [],
          "params": [],
          "body": {
            "mode": "none",
            "json": null,
            "text": null,
            "xml": null,
            "formUrlEncoded": [],
            "multipartForm": []
          }
        }
      }
    ],
    "environments": [],
    "root": {
      "docs": "",
      "meta": {
        "name": "CRUD"
      },
      "request": {
        "auth": {
          "mode": "none",
          "basic": null,
          "bearer": null,
          "awsv4": null
        },
        "headers": [],
        "script": {},
        "tests": "",
        "vars": {}
      }
    }
  },
  "translationLog": {}
};