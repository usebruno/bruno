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

  it('keeps duplicate request display names clean when HTTP methods differ', async () => {
    const brunoCollection = await postmanToBruno({
      info: {
        name: 'Projects API',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: '/projects',
          request: {
            method: 'GET',
            url: 'https://api.example.com/projects'
          }
        },
        {
          name: '/projects',
          request: {
            method: 'POST',
            url: 'https://api.example.com/projects'
          }
        }
      ]
    });

    expect(brunoCollection.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '/projects', filename: 'GET projects', request: expect.objectContaining({ method: 'GET' }) }),
        expect.objectContaining({ name: '/projects', filename: 'POST projects', request: expect.objectContaining({ method: 'POST' }) })
      ])
    );
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

  it('should convert non-string variable values to strings', async () => {
    const collectionWithNonStringVars = {
      info: {
        name: 'Non-String Variable Demo',
        _postman_id: 'abcd1234-5678-90ef-ghij-1234567890ab',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [
        { key: 'timeout', value: 5000 },
        { key: 'enabled', value: true },
        { key: 'user', value: { id: 1, name: 'Alice' } }
      ],
      item: [
        {
          name: 'Sample Request',
          request: {
            method: 'GET',
            url: {
              raw: 'https://postman-echo.com/get',
              protocol: 'https',
              host: ['postman-echo', 'com'],
              path: ['get']
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNonStringVars);
    const vars = brunoCollection.root.request.vars.req;

    expect(vars).toHaveLength(3);
    expect(vars[0]).toMatchObject({ name: 'timeout', value: '5000' });
    expect(vars[1]).toMatchObject({ name: 'enabled', value: 'true' });
    expect(vars[2]).toMatchObject({ name: 'user', value: '{"id":1,"name":"Alice"}' });
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
      oauth1: null,
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
      oauth1: null,
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
      oauth1: null,
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
      oauth1: null,
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
      oauth1: null,
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
      oauth1: null,
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
      oauth1: null,
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
      oauth1: null,
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
      oauth1: null,
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

  it('should convert numeric values to strings in headers, params, and body fields', async () => {
    const collectionWithNumericValues = {
      info: {
        _postman_id: 'test-numeric-values',
        name: 'collection with numeric values',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with numeric values',
          request: {
            method: 'POST',
            header: [
              { key: 'X-Account-Id', value: 0 },
              { key: 'X-Retry-Count', value: 3 }
            ],
            url: {
              raw: 'https://example.com/api/:accountId',
              protocol: 'https',
              host: ['example', 'com'],
              path: ['api', ':accountId'],
              query: [
                { key: 'limit', value: 100 },
                { key: 'offset', value: 0 }
              ],
              variable: [
                { key: 'accountId', value: 0 }
              ]
            },
            body: {
              mode: 'urlencoded',
              urlencoded: [
                { key: 'timeout', value: 5000 }
              ]
            }
          }
        },
        {
          name: 'request with numeric multipart form values',
          request: {
            method: 'POST',
            header: [],
            url: { raw: 'https://example.com/upload' },
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'retries', value: 3, type: 'text' },
                { key: 'priority', value: 0, type: 'text' }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNumericValues);
    const item = brunoCollection.items[0];

    // Headers should have string values
    expect(item.request.headers[0].value).toBe('0');
    expect(item.request.headers[1].value).toBe('3');

    // Query params should have string values
    const queryParams = item.request.params.filter((p) => p.type === 'query');
    expect(queryParams[0].value).toBe('100');
    expect(queryParams[1].value).toBe('0');

    // Path params should have string values
    const pathParams = item.request.params.filter((p) => p.type === 'path');
    expect(pathParams[0].value).toBe('0');

    // Form URL-encoded should have string values
    expect(item.request.body.formUrlEncoded[0].value).toBe('5000');

    // Multipart form should have string values
    const multipartItem = brunoCollection.items[1];
    expect(multipartItem.request.body.multipartForm[0].value).toBe('3');
    expect(multipartItem.request.body.multipartForm[1].value).toBe('0');
  });

  it('should convert numeric values to strings in example request and response fields', async () => {
    const collectionWithNumericExamples = {
      info: {
        _postman_id: 'test-numeric-examples',
        name: 'collection with numeric example values',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with numeric example',
          request: {
            method: 'GET',
            header: [],
            url: { raw: 'https://example.com/api' }
          },
          response: [
            {
              name: 'Example with numerics',
              originalRequest: {
                method: 'GET',
                header: [
                  { key: 'X-Account-Id', value: 42 }
                ],
                url: {
                  raw: 'https://example.com/api/:id?page=1',
                  protocol: 'https',
                  host: ['example', 'com'],
                  path: ['api', ':id'],
                  query: [
                    { key: 'page', value: 1 }
                  ],
                  variable: [
                    { key: 'id', value: 99 }
                  ]
                },
                body: {
                  mode: 'urlencoded',
                  urlencoded: [
                    { key: 'retries', value: 3 }
                  ]
                }
              },
              status: 'OK',
              code: 200,
              header: [
                { key: 'X-RateLimit-Remaining', value: 0 }
              ],
              body: '{"ok": true}'
            }
          ]
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNumericExamples);
    const example = brunoCollection.items[0].examples[0];

    // Example request headers
    expect(example.request.headers[0].value).toBe('42');

    // Example request query params
    const queryParams = example.request.params.filter((p) => p.type === 'query');
    expect(queryParams[0].value).toBe('1');

    // Example request path params
    const pathParams = example.request.params.filter((p) => p.type === 'path');
    expect(pathParams[0].value).toBe('99');

    // Example request form URL-encoded
    expect(example.request.body.formUrlEncoded[0].value).toBe('3');

    // Example response headers
    expect(example.response.headers[0].value).toBe('0');
  });

  it('should convert numeric auth values to strings (array-backed v2.1 format)', async () => {
    const collectionWithNumericAuth = {
      info: {
        _postman_id: 'test-numeric-auth',
        name: 'collection with numeric auth values',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with numeric bearer token',
          request: {
            method: 'GET',
            header: [],
            url: { raw: 'https://example.com/api' },
            auth: {
              type: 'bearer',
              bearer: [
                { key: 'token', value: 123 }
              ]
            }
          }
        },
        {
          name: 'request with numeric apikey values',
          request: {
            method: 'GET',
            header: [],
            url: { raw: 'https://example.com/api' },
            auth: {
              type: 'apikey',
              apikey: [
                { key: 'key', value: 456 },
                { key: 'value', value: 789 }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNumericAuth);

    // Bearer token should be stringified
    expect(brunoCollection.items[0].request.auth.mode).toBe('bearer');
    expect(brunoCollection.items[0].request.auth.bearer.token).toBe('123');

    // API key fields should be stringified
    expect(brunoCollection.items[1].request.auth.mode).toBe('apikey');
    expect(brunoCollection.items[1].request.auth.apikey.key).toBe('456');
    expect(brunoCollection.items[1].request.auth.apikey.value).toBe('789');
  });

  it('should convert numeric auth values to strings (object-backed format)', async () => {
    const collectionWithObjectAuth = {
      info: {
        _postman_id: 'test-object-auth',
        name: 'collection with object-backed auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with object-backed basic auth',
          request: {
            method: 'GET',
            header: [],
            url: { raw: 'https://example.com/api' },
            auth: {
              type: 'basic',
              basic: {
                username: 12345,
                password: 67890
              }
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithObjectAuth);

    expect(brunoCollection.items[0].request.auth.mode).toBe('basic');
    expect(brunoCollection.items[0].request.auth.basic.username).toBe('12345');
    expect(brunoCollection.items[0].request.auth.basic.password).toBe('67890');
  });

  it('should parse string headers in request header arrays', async () => {
    const collectionWithStringHeaders = {
      info: {
        _postman_id: 'test-string-headers',
        name: 'collection with string headers',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with string headers',
          request: {
            method: 'GET',
            header: [
              'Content-Type: application/json',
              { key: 'X-Custom', value: 'test' },
              'Authorization: Bearer token123'
            ],
            url: { raw: 'https://example.com/api' }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithStringHeaders);
    const headers = brunoCollection.items[0].request.headers;

    expect(headers).toHaveLength(3);
    expect(headers[0].name).toBe('Content-Type');
    expect(headers[0].value).toBe('application/json');
    expect(headers[1].name).toBe('X-Custom');
    expect(headers[1].value).toBe('test');
    expect(headers[2].name).toBe('Authorization');
    expect(headers[2].value).toBe('Bearer token123');
  });

  it('should parse a single concatenated string as the header field', async () => {
    const collectionWithConcatenatedHeaders = {
      info: {
        _postman_id: 'test-concat-headers',
        name: 'collection with concatenated header string',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with concatenated header',
          request: {
            method: 'GET',
            header: 'Content-Type: application/json\r\nHost: example.com',
            url: { raw: 'https://example.com/api' }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithConcatenatedHeaders);
    const headers = brunoCollection.items[0].request.headers;

    expect(headers).toHaveLength(2);
    expect(headers[0].name).toBe('Content-Type');
    expect(headers[0].value).toBe('application/json');
    expect(headers[1].name).toBe('Host');
    expect(headers[1].value).toBe('example.com');
  });

  it('should handle string headers with no value', async () => {
    const collectionWithNoValueHeader = {
      info: {
        _postman_id: 'test-no-value-header',
        name: 'collection with no-value string header',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'request with no-value header',
          request: {
            method: 'GET',
            header: ['X-No-Value'],
            url: { raw: 'https://example.com/api' }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collectionWithNoValueHeader);
    const headers = brunoCollection.items[0].request.headers;

    expect(headers).toHaveLength(1);
    expect(headers[0].name).toBe('X-No-Value');
    expect(headers[0].value).toBe('');
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
              oauth1: null,
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
            oauth1: null,
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
          oauth1: null,
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
        oauth1: null,
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
