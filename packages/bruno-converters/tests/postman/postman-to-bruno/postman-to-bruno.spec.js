import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import { invalidVariableCharacterRegex } from '../../../src/constants';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    const brunoCollection = postmanToBruno(postmanCollection);
    expect(brunoCollection).toMatchObject(expectedOutput);
  });

  it('should replace invalid variable characters with underscores', () => {
    const variables = [
      { key: 'validKey', value: 'value1' },
      { key: 'invalid key', value: 'value2' },
      { key: 'another@invalid#key$', value: 'value3' }
    ];

    const processedVariables = variables.map((v) => ({
      name: v.key.replace(invalidVariableCharacterRegex, '_'),
      value: v.value
    }));

    expect(processedVariables).toEqual([
      { name: 'validKey', value: 'value1' },
      { name: 'invalid_key', value: 'value2' },
      { name: 'another_invalid_key_', value: 'value3' }
    ]);
  });
});

// Simple Collection (postman)
// ├── folder
// │   └── request (GET)
// └── request (GET)

const postmanCollection = {
	"info": {
		"_postman_id": "7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9",
		"name": "simple collection",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		"_exporter_id": "21992467",
		"_collection_link": "https://random-user-007.postman.co/workspace/testing~7523f559-3d5f-4c30-8315-3cb3c3ff98b7/collection/21992467-7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9?action=share&source=collection_link&creator=007"
	},
	"item": [
		{
			"name": "folder",
			"item": [
				{
					"name": "request",
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "https://usebruno.com",
							"protocol": "https",
							"host": [
								"usebruno",
								"com"
							]
						}
					},
					"response": []
				}
			]
		},
		{
			"name": "request",
			"request": {
				"method": "GET",
				"header": [],
				"url": {
					"raw": "https://usebruno.com",
					"protocol": "https",
					"host": [
						"usebruno",
						"com"
					]
				}
			},
			"response": []
		}
	]
};

// Simple Collection (bruno)
// ├── folder
// │   └── request (GET)
// └── request (GET)

const expectedOutput = {
	"name": "simple collection",
	"uid": "mockeduuidvalue123456",
	"version": "1",
	"items": [
	  {
      "uid": "mockeduuidvalue123456",	
      "name": "folder",
      "type": "folder",
      "seq": 1,
      "items": [
        {
          "uid": "mockeduuidvalue123456",
          "name": "request",
          "type": "http-request",
          "seq": 1,
          "request": {
            "url": "https://usebruno.com",
            "method": "GET",
            "auth": {
              "mode": "none",
              "basic": null,
              "bearer": null,
              "awsv4": null,
              "apikey": null,
              "oauth2": null,
              "digest": null
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
            },
            "docs": ""
          }
        }
      ],
      "root": {
        "docs": "",
        "meta": {
        "name": "folder"
        },
        "request": {
        "auth": {
          "mode": "none",
          "basic": null,
          "bearer": null,
          "awsv4": null,
          "apikey": null,
          "oauth2": null,
          "digest": null
        },
        "headers": [],
        "script": {},
        "tests": "",
        "vars": {}
        }
      }
	  },
	  {
      "uid": "mockeduuidvalue123456",
      "name": "request",
      "type": "http-request",
      "seq": 2,
      "request": {
        "url": "https://usebruno.com",
        "method": "GET",
        "auth": {
          "mode": "none",
          "basic": null,
          "bearer": null,
          "awsv4": null,
          "apikey": null,
          "oauth2": null,
          "digest": null
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
        },
        "docs": ""
      },
	  }
	],
	"environments": [],
	"root": {
	  "docs": "",
	  "meta": {
		"name": "simple collection"
	  },
	  "request": {
		"auth": {
		  "mode": "none",
		  "basic": null,
		  "bearer": null,
		  "awsv4": null,
		  "apikey": null,
		  "oauth2": null,
		  "digest": null
		},
		"headers": [],
		"script": {},
		"tests": "",
		"vars": {}
	  }
	}
  };