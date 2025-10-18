import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    const brunoCollection = await postmanToBruno(postmanCollection);
    expect(brunoCollection).toMatchObject(expectedOutput);
  });

  it('should handle falsy values in collection variables', async () => {
    const collectionWithFalsyVars = {
      "info": {
        "_postman_id": "7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9",
        "name": "collection with falsy vars",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      "variable": [
        {
          "type": "string"
        },
        {
          "key": "",
          "type": "string"
        },
        {
          "value": "",
          "type": "string"
        },
        {
          "key": "",
          "value": "",
          "type": "string"
        }
      ],
      "item": []
    };

    const brunoCollection = await postmanToBruno(collectionWithFalsyVars);
    
    expect(brunoCollection.root.request.vars.req).toEqual([
      {
        uid: "mockeduuidvalue123456",
        name: '',
        value: '',
        enabled: true
      },
      {
        uid: "mockeduuidvalue123456",
        name: '',
        value: '',
        enabled: true
      },
      {
        uid: "mockeduuidvalue123456",
        name: '',
        value: '',
        enabled: true
      }
    ]);
  });

  it("should handle empty variables", async () => {
    const collectionWithEmptyVars = {
      "info": {
        "_postman_id": "7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9",
        "name": "collection with falsy vars",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      "variable": [],
      "item": []
    };

    const brunoCollection = await postmanToBruno(collectionWithEmptyVars);
    expect(brunoCollection.root.request.vars.req).toEqual([]);
  });

  it('should correctly import protocolProfileBehavior settings from Postman requests', async () => {
    const collectionWithSettings = {
      info: {
        _postman_id: 'test-settings-id',
        name: 'Collection with Settings',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Request with all settings',
          protocolProfileBehavior: {
            maxRedirects: 10,
            followRedirects: false,
            disableUrlEncoding: true
          },
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://httpbin.org/get',
              protocol: 'https',
              host: ['httpbin', 'org'],
              path: ['get']
            }
          }
        },
        {
          name: 'Request with partial settings',
          protocolProfileBehavior: {
            followRedirects: true
          },
          request: {
            method: 'POST',
            header: [],
            url: {
              raw: 'https://httpbin.org/post',
              protocol: 'https',
              host: ['httpbin', 'org'],
              path: ['post']
            }
          }
        },
        {
          name: 'Request without settings',
          request: {
            method: 'PUT',
            header: [],
            url: {
              raw: 'https://httpbin.org/put',
              protocol: 'https',
              host: ['httpbin', 'org'],
              path: ['put']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithSettings);

    // Test request with all settings
    const requestWithAllSettings = brunoCollection.items[0];
    expect(requestWithAllSettings.settings).toEqual({
      encodeUrl: false,
      followRedirects: false,
      maxRedirects: 10
    });

    // Test request with partial settings
    const requestWithPartialSettings = brunoCollection.items[1];
    expect(requestWithPartialSettings.settings).toEqual({
      encodeUrl: true,
      followRedirects: true
    });

    // Test request without settings
    const requestWithoutSettings = brunoCollection.items[2];
    expect(requestWithoutSettings.settings).toEqual({
      encodeUrl: true
    });
  });

  it('should handle collection with auth object having undefined type', async () => {
    const collectionWithUndefinedAuthType = {
      'info': {
        '_postman_id': '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        'name': 'collection with undefined auth type',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      'auth': {
        'basic': [
          { key: 'username', value: 'testuser', type: 'string' },
          { key: 'password', value: 'testpass', type: 'string' }
        ]
      },
      'item': [
        {
          'name': 'request',
          'request': {
            'method': 'GET',
            'header': [],
            'url': {
              'raw': 'https://api.example.com/test',
              'protocol': 'https',
              'host': ['api', 'example', 'com'],
              'path': ['test']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithUndefinedAuthType);
    
    // Collection level auth should default to 'none'
    expect(brunoCollection.root.request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });

    // Request should inherit auth mode
    expect(brunoCollection.items[0].request.auth).toEqual({
      mode: 'inherit',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should handle collection with auth object having null type', async () => {
    const collectionWithNullAuthType = {
      'info': {
        '_postman_id': '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        'name': 'collection with null auth type',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      'auth': {
        'type': null,
        'bearer': {
          'token': 'test-token'
        }
      },
      'item': [
        {
          'name': 'request',
          'request': {
            'method': 'GET',
            'header': [],
            'url': {
              'raw': 'https://api.example.com/test',
              'protocol': 'https',
              'host': ['api', 'example', 'com'],
              'path': ['test']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNullAuthType);
    
    // Collection level auth should default to 'none'
    expect(brunoCollection.root.request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should handle collection with auth object having unexpected type value', async () => {
    const collectionWithUnexpectedAuthType = {
      'info': {
        '_postman_id': '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        'name': 'collection with unexpected auth type',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      'auth': {
        'type': 'unexpected_auth_type',
        'basic': [
          { key: 'username', value: 'testuser', type: 'string' },
          { key: 'password', value: 'testpass', type: 'string' }
        ]
      },
      'item': [
        {
          'name': 'request',
          'request': {
            'method': 'GET',
            'header': [],
            'url': {
              'raw': 'https://api.example.com/test',
              'protocol': 'https',
              'host': ['api', 'example', 'com'],
              'path': ['test']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithUnexpectedAuthType);
    
    // Collection level auth should default to 'none'
    expect(brunoCollection.root.request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });

    // Request should inherit auth mode
    expect(brunoCollection.items[0].request.auth).toEqual({
      mode: 'inherit',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should handle request with auth object having undefined type', async () => {
    const collectionWithRequestUndefinedAuthType = {
      'info': {
        '_postman_id': '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        'name': 'collection with request undefined auth type',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      'item': [
        {
          'name': 'request',
          'request': {
            'method': 'GET',
            'header': [],
            'url': {
              'raw': 'https://api.example.com/test',
              'protocol': 'https',
              'host': ['api', 'example', 'com'],
              'path': ['test']
            },
            'auth': {
              'basic': [
                { key: 'username', value: 'testuser', type: 'string' },
                { key: 'password', value: 'testpass', type: 'string' }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithRequestUndefinedAuthType);

    // Collection level auth should default to 'none'
    expect(brunoCollection.root.request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
    
    // Request auth should default to 'none'
    expect(brunoCollection.items[0].request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should handle folder with auth object having unexpected type', async () => {
    const collectionWithFolderUnexpectedAuthType = {
      'info': {
        '_postman_id': '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        'name': 'collection with folder unexpected auth type',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      'item': [
        {
          'name': 'folder',
          'auth': {
            'type': 'unexpected_folder_auth_type',
            'bearer': {
              'token': 'folder-token'
            }
          },
          'item': [
            {
              'name': 'request',
              'request': {
                'method': 'GET',
                'header': [],
                'url': {
                  'raw': 'https://api.example.com/test',
                  'protocol': 'https',
                  'host': ['api', 'example', 'com'],
                  'path': ['test']
                }
              }
            }
          ]
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithFolderUnexpectedAuthType);
    
    // Folder auth should default to 'none'
    expect(brunoCollection.items[0].root.request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });

    // Request should inherit auth mode
    expect(brunoCollection.items[0].items[0].request.auth).toEqual({
      mode: 'inherit',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
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
      "seq": 2,
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