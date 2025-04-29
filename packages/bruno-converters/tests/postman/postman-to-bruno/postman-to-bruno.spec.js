import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    const brunoCollection = postmanToBruno(postmanCollection);
    expect(brunoCollection).toMatchObject(expectedOutput);
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
		"items": [
		  {
			"uid": "mockeduuidvalue123456",
			"name": "request",
			"type": "http-request",
			"request": {
			  "url": "https://usebruno.com",
			  "method": "GET",
			  "auth": {
				"mode": "inherit",
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
			"seq": 1
		  }
		],
		"root": {
		  "docs": "",
		  "meta": {
			"name": "folder"
		  },
		  "request": {
			"auth": {
			  "mode": "inherit",
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
		"request": {
		  "url": "https://usebruno.com",
		  "method": "GET",
		  "auth": {
			"mode": "inherit",
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
		"seq": 1
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
		  "mode": "inherit",
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
