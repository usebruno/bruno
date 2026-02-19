import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import { invalidVariableCharacterRegex } from '../../../src/constants';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    const brunoCollection = await postmanToBruno(postmanCollection);
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

  it('should handle falsy values in collection variables', async () => {
    const collectionWithFalsyVars = {
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with falsy vars',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [
        {
          type: 'string'
        },
        {
          key: '',
          type: 'string'
        },
        {
          value: '',
          type: 'string'
        },
        {
          key: '',
          value: '',
          type: 'string'
        }
      ],
      item: []
    };

    const brunoCollection = await postmanToBruno(collectionWithFalsyVars);

    expect(brunoCollection.root.request.vars.req).toEqual([
      {
        uid: 'mockeduuidvalue123456',
        name: '',
        value: '',
        enabled: true
      },
      {
        uid: 'mockeduuidvalue123456',
        name: '',
        value: '',
        enabled: true
      },
      {
        uid: 'mockeduuidvalue123456',
        name: '',
        value: '',
        enabled: true
      }
    ]);
  });

  it('should successfully translate a URL path array with no empty elements', async () => {
    const collectionWithFalsyVars = {
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with falsy vars',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [
        {
          type: 'string'
        },
        {
          key: '',
          type: 'string'
        },
        {
          value: '',
          type: 'string'
        },
        {
          key: '',
          value: '',
          type: 'string'
        }
      ],
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
              protocol: 'https',
              host: ['httpbin', 'org'],
              path: ['api', 'v1', 'resource']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithFalsyVars);

    expect(brunoCollection.items.map((item) => item.request.url)).toEqual([
      'https://httpbin.org/api/v1/resource'
    ]);
  });

  it('should not mutate a URL path with an empty element representing a trailing slash', async () => {
    const collectionWithFalsyVars = {
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with falsy vars',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [
        {
          type: 'string'
        },
        {
          key: '',
          type: 'string'
        },
        {
          value: '',
          type: 'string'
        },
        {
          key: '',
          value: '',
          type: 'string'
        }
      ],
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
              protocol: 'https',
              host: ['httpbin', 'org'],
              path: ['api', 'v1', 'resource', '']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithFalsyVars);

    expect(brunoCollection.items.map((item) => item.request.url)).toEqual([
      'https://httpbin.org/api/v1/resource/'
    ]);
  });

  it('should not mutate a URL path with an empty element representing a trailing slash', async () => {
    const collectionWithFalsyVars = {
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with falsy vars',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [
        {
          type: 'string'
        },
        {
          key: '',
          type: 'string'
        },
        {
          value: '',
          type: 'string'
        },
        {
          key: '',
          value: '',
          type: 'string'
        }
      ],
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
              protocol: 'https',
              host: ['httpbin', 'org'],
              path: ['api', '', 'resource']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithFalsyVars);

    expect(brunoCollection.items.map((item) => item.request.url)).toEqual([
      'https://httpbin.org/api//resource'
    ]);
  });

  it('should handle empty variables', async () => {
    const collectionWithEmptyVars = {
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with falsy vars',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [],
      item: []
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
              raw: 'https://echo.usebruno.com/get',
              protocol: 'https',
              host: ['echo', 'usebruno', 'com'],
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
              raw: 'https://echo.usebruno.com/post',
              protocol: 'https',
              host: ['echo', 'usebruno', 'com'],
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
              raw: 'https://echo.usebruno.com/put',
              protocol: 'https',
              host: ['echo', 'usebruno', 'com'],
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
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with undefined auth type',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        basic: [
          { key: 'username', value: 'testuser', type: 'string' },
          { key: 'password', value: 'testpass', type: 'string' }
        ]
      },
      item: [
        {
          name: 'request',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://api.example.com/test',
              protocol: 'https',
              host: ['api', 'example', 'com'],
              path: ['test']
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
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with null auth type',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: null,
        bearer: {
          token: 'test-token'
        }
      },
      item: [
        {
          name: 'request',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://api.example.com/test',
              protocol: 'https',
              host: ['api', 'example', 'com'],
              path: ['test']
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
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with unexpected auth type',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'unexpected_auth_type',
        basic: [
          { key: 'username', value: 'testuser', type: 'string' },
          { key: 'password', value: 'testpass', type: 'string' }
        ]
      },
      item: [
        {
          name: 'request',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://api.example.com/test',
              protocol: 'https',
              host: ['api', 'example', 'com'],
              path: ['test']
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
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with request undefined auth type',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://api.example.com/test',
              protocol: 'https',
              host: ['api', 'example', 'com'],
              path: ['test']
            },
            auth: {
              basic: [
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
      info: {
        _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
        name: 'collection with folder unexpected auth type',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'folder',
          auth: {
            type: 'unexpected_folder_auth_type',
            bearer: {
              token: 'folder-token'
            }
          },
          item: [
            {
              name: 'request',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: 'https://api.example.com/test',
                  protocol: 'https',
                  host: ['api', 'example', 'com'],
                  path: ['test']
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

  it('should skip headers where both key and value are null, and coalesce partial nulls', async () => {
    const collectionWithNullHeaders = {
      info: {
        _postman_id: 'test-null-headers',
        name: 'collection with null headers',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with null headers',
          request: {
            method: 'GET',
            header: [
              { key: 'Content-Type', value: 'application/json' },
              { key: null, value: null },
              { key: null, value: 'somevalue' },
              { key: 'X-Custom', value: null }
            ],
            url: { raw: 'https://example.com/api' }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNullHeaders);
    const headers = brunoCollection.items[0].request.headers;

    expect(headers).toHaveLength(3);
    expect(headers[0].name).toBe('Content-Type');
    expect(headers[0].value).toBe('application/json');
    expect(headers[1].name).toBe('');
    expect(headers[1].value).toBe('somevalue');
    expect(headers[2].name).toBe('X-Custom');
    expect(headers[2].value).toBe('');
  });

  it('should skip urlencoded params where both key and value are null', async () => {
    const collectionWithNullUrlencoded = {
      info: {
        _postman_id: 'test-null-urlencoded',
        name: 'collection with null urlencoded',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with null urlencoded',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/api' },
            body: {
              mode: 'urlencoded',
              urlencoded: [
                { key: 'field1', value: 'value1' },
                { key: null, value: null },
                { key: null, value: 'partialvalue' },
                { key: 'field2', value: null }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNullUrlencoded);
    const formUrlEncoded = brunoCollection.items[0].request.body.formUrlEncoded;

    expect(formUrlEncoded).toHaveLength(3);
    expect(formUrlEncoded[0].name).toBe('field1');
    expect(formUrlEncoded[0].value).toBe('value1');
    expect(formUrlEncoded[1].name).toBe('');
    expect(formUrlEncoded[1].value).toBe('partialvalue');
    expect(formUrlEncoded[2].name).toBe('field2');
    expect(formUrlEncoded[2].value).toBe('');
  });

  it('should skip formdata params where both key and value are null', async () => {
    const collectionWithNullFormdata = {
      info: {
        _postman_id: 'test-null-formdata',
        name: 'collection with null formdata',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with null formdata',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/api' },
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'field1', value: 'value1', type: 'text' },
                { key: null, value: null, type: 'text' },
                { key: 'field2', value: null, type: 'text' }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNullFormdata);
    const multipartForm = brunoCollection.items[0].request.body.multipartForm;

    expect(multipartForm).toHaveLength(2);
    expect(multipartForm[0].name).toBe('field1');
    expect(multipartForm[0].value).toBe('value1');
    expect(multipartForm[1].name).toBe('field2');
    expect(multipartForm[1].value).toBe('');
  });

  it('should skip query params where both key and value are null', async () => {
    const collectionWithNullQueryParams = {
      info: {
        _postman_id: 'test-null-query-params',
        name: 'collection with null query params',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with null query params',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://example.com/api?search=test',
              protocol: 'https',
              host: ['example', 'com'],
              path: ['api'],
              query: [
                { key: 'search', value: 'test' },
                { key: null, value: null },
                { key: null, value: 'somevalue' },
                { key: 'emptyval', value: null }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNullQueryParams);
    const params = brunoCollection.items[0].request.params;

    // Fully-null entry should be skipped
    expect(params).toHaveLength(3);

    // Normal param preserved as-is
    expect(params[0].name).toBe('search');
    expect(params[0].value).toBe('test');
    expect(params[0].type).toBe('query');

    // Null key normalized to empty string, value preserved
    expect(params[1].name).toBe('');
    expect(params[1].value).toBe('somevalue');
    expect(params[1].type).toBe('query');

    // Key preserved, null value normalized to empty string
    expect(params[2].name).toBe('emptyval');
    expect(params[2].value).toBe('');
    expect(params[2].type).toBe('query');
  });
});

// Simple Collection (postman)
// ├── folder
// │   └── request (GET)
// └── request (GET)

const postmanCollection = {
  info: {
    _postman_id: '7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9',
    name: 'simple collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    _exporter_id: '21992467',
    _collection_link: 'https://random-user-007.postman.co/workspace/testing~7523f559-3d5f-4c30-8315-3cb3c3ff98b7/collection/21992467-7f91bbd8-cb97-41ac-8d0b-e1fcd8bb4ce9?action=share&source=collection_link&creator=007'
  },
  item: [
    {
      name: 'folder',
      item: [
        {
          name: 'request',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://usebruno.com',
              protocol: 'https',
              host: [
                'usebruno',
                'com'
              ]
            }
          },
          response: []
        }
      ]
    },
    {
      name: 'request',
      request: {
        method: 'GET',
        header: [],
        url: {
          raw: 'https://usebruno.com',
          protocol: 'https',
          host: [
            'usebruno',
            'com'
          ]
        }
      },
      response: []
    }
  ]
};

// Simple Collection (bruno)
// ├── folder
// │   └── request (GET)
// └── request (GET)

describe('postman-collection formdata import', () => {
  it('should import formdata with type: file correctly', async () => {
    const collectionWithFileFormdata = {
      info: {
        _postman_id: 'test-id',
        name: 'collection with file formdata',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with file',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/upload' },
            body: {
              mode: 'formdata',
              formdata: [
                {
                  key: 'myFile',
                  type: 'file',
                  src: ['/path/to/file1.txt', '/path/to/file2.txt'],
                  disabled: false
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithFileFormdata);
    const multipartForm = brunoCollection.items[0].request.body.multipartForm;

    expect(multipartForm).toHaveLength(1);
    expect(multipartForm[0].type).toBe('file');
    expect(multipartForm[0].name).toBe('myFile');
    expect(multipartForm[0].value).toEqual(['/path/to/file1.txt', '/path/to/file2.txt']);
    expect(multipartForm[0].enabled).toBe(true);
  });

  it('should import formdata with type: default and src field as file', async () => {
    const collectionWithDefaultTypeAndSrc = {
      info: {
        _postman_id: 'test-id',
        name: 'collection with default type formdata',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with default type',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/upload' },
            body: {
              mode: 'formdata',
              formdata: [
                {
                  key: 'myFile',
                  type: 'default',
                  src: '/path/to/file.txt',
                  disabled: false
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithDefaultTypeAndSrc);
    const multipartForm = brunoCollection.items[0].request.body.multipartForm;

    expect(multipartForm).toHaveLength(1);
    expect(multipartForm[0].type).toBe('file');
    expect(multipartForm[0].name).toBe('myFile');
    expect(multipartForm[0].value).toEqual(['/path/to/file.txt']);
    expect(multipartForm[0].enabled).toBe(true);
  });

  it('should import formdata with type: default and value array as text', async () => {
    const collectionWithDefaultTypeAndValueArray = {
      info: {
        _postman_id: 'test-id',
        name: 'collection with default type and value array',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with default type',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/upload' },
            body: {
              mode: 'formdata',
              formdata: [
                {
                  key: 'myField',
                  type: 'default',
                  value: ['some', 'text'],
                  disabled: false
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithDefaultTypeAndValueArray);
    const multipartForm = brunoCollection.items[0].request.body.multipartForm;

    expect(multipartForm).toHaveLength(1);
    expect(multipartForm[0].type).toBe('text');
    expect(multipartForm[0].name).toBe('myField');
    expect(multipartForm[0].value).toBe('sometext');
    expect(multipartForm[0].enabled).toBe(true);
  });

  it('should preserve contentType when importing formdata', async () => {
    const collectionWithContentType = {
      info: {
        _postman_id: 'test-id',
        name: 'collection with contentType',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with contentType',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/upload' },
            body: {
              mode: 'formdata',
              formdata: [
                {
                  key: 'myFile',
                  type: 'file',
                  src: '/path/to/file.json',
                  contentType: 'application/json',
                  disabled: false
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithContentType);
    const multipartForm = brunoCollection.items[0].request.body.multipartForm;

    expect(multipartForm).toHaveLength(1);
    expect(multipartForm[0].type).toBe('file');
    expect(multipartForm[0].contentType).toBe('application/json');
  });

  it('should handle mixed file and text fields in formdata', async () => {
    const collectionWithMixedFormdata = {
      info: {
        _postman_id: 'test-id',
        name: 'collection with mixed formdata',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with mixed fields',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/upload' },
            body: {
              mode: 'formdata',
              formdata: [
                {
                  key: 'textField',
                  type: 'text',
                  value: 'hello world',
                  disabled: false
                },
                {
                  key: 'fileField',
                  type: 'file',
                  src: '/path/to/file.txt',
                  disabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithMixedFormdata);
    const multipartForm = brunoCollection.items[0].request.body.multipartForm;

    expect(multipartForm).toHaveLength(2);
    expect(multipartForm[0].type).toBe('text');
    expect(multipartForm[0].value).toBe('hello world');
    expect(multipartForm[0].enabled).toBe(true);
    expect(multipartForm[1].type).toBe('file');
    expect(multipartForm[1].value).toEqual(['/path/to/file.txt']);
    expect(multipartForm[1].enabled).toBe(false);
  });
});

const expectedOutput = {
  name: 'simple collection',
  uid: 'mockeduuidvalue123456',
  version: '1',
  items: [
    {
      uid: 'mockeduuidvalue123456',
      name: 'folder',
      type: 'folder',
      seq: 1,
      items: [
        {
          uid: 'mockeduuidvalue123456',
          name: 'request',
          type: 'http-request',
          seq: 1,
          request: {
            url: 'https://usebruno.com',
            method: 'GET',
            auth: {
              mode: 'inherit',
              basic: null,
              bearer: null,
              awsv4: null,
              apikey: null,
              oauth2: null,
              digest: null
            },
            headers: [],
            params: [],
            body: {
              mode: 'none',
              json: null,
              text: null,
              xml: null,
              formUrlEncoded: [],
              multipartForm: []
            },
            docs: ''
          }
        }
      ],
      root: {
        docs: '',
        meta: {
          name: 'folder'
        },
        request: {
          auth: {
            mode: 'inherit',
            basic: null,
            bearer: null,
            awsv4: null,
            apikey: null,
            oauth2: null,
            digest: null
          },
          headers: [],
          script: {},
          tests: '',
          vars: {}
        }
      }
    },
    {
      uid: 'mockeduuidvalue123456',
      name: 'request',
      type: 'http-request',
      seq: 2,
      request: {
        url: 'https://usebruno.com',
        method: 'GET',
        auth: {
          mode: 'inherit',
          basic: null,
          bearer: null,
          awsv4: null,
          apikey: null,
          oauth2: null,
          digest: null
        },
        headers: [],
        params: [],
        body: {
          mode: 'none',
          json: null,
          text: null,
          xml: null,
          formUrlEncoded: [],
          multipartForm: []
        },
        docs: ''
      }
    }
  ],
  environments: [],
  root: {
    docs: '',
    meta: {
      name: 'simple collection'
    },
    request: {
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        awsv4: null,
        apikey: null,
        oauth2: null,
        digest: null
      },
      headers: [],
      script: {},
      tests: '',
      vars: {}
    }
  }
};
