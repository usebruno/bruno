import postmanToBruno from '../src/postman/postman-to-bruno.js';

describe('Postman to Bruno Converter with Examples', () => {
  const postmanCollectionWithExamples = {
    info: {
      _postman_id: 'd7b47cc4-c3c5-4c9d-99d4-04b6025c9000',
      name: 'collection with examples',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _exporter_id: '41238764'
    },
    item: [
      {
        name: 'New Request',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: 'https://testbench-sanity.usebruno.com/ping',
            protocol: 'https',
            host: ['testbench-sanity', 'usebruno', 'com'],
            path: ['ping']
          }
        },
        response: [
          {
            name: 'Success Response',
            originalRequest: {
              method: 'GET',
              header: [],
              url: {
                raw: 'https://testbench-sanity.usebruno.com/ping',
                protocol: 'https',
                host: ['testbench-sanity', 'usebruno', 'com'],
                path: ['ping']
              }
            },
            status: 'OK',
            code: 200,
            _postman_previewlanguage: 'json',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
                name: 'Content-Type',
                description: '',
                type: 'text'
              },
              {
                key: 'x-powered-by',
                value: 'Express'
              }
            ],
            cookie: [],
            body: '{\n    "ping": "pong"\n}'
          },
          {
            name: 'Error Response',
            originalRequest: {
              method: 'GET',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                  type: 'text'
                }
              ],
              body: {
                mode: 'raw',
                raw: '{\n    "ping": "pong"\n}',
                options: {
                  raw: {
                    language: 'json'
                  }
                }
              },
              url: {
                raw: 'https://testbench-sanity.usebruno.com/ping',
                protocol: 'https',
                host: ['testbench-sanity', 'usebruno', 'com'],
                path: ['ping']
              }
            },
            status: 'Internal Server Error',
            code: 500,
            _postman_previewlanguage: 'json',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
                name: 'Content-Type',
                description: '',
                type: 'text'
              }
            ],
            cookie: [],
            body: '{\n    "error": "Internal Server Error"\n}'
          }
        ]
      }
    ]
  };

  test('should convert Postman collection with examples to Bruno format', async () => {
    const brunoCollection = await postmanToBruno(postmanCollectionWithExamples);

    expect(brunoCollection).toBeDefined();
    expect(brunoCollection.name).toBe('collection with examples');
    expect(brunoCollection.items).toHaveLength(1);

    const request = brunoCollection.items[0];
    expect(request.name).toBe('New Request');
    expect(request.type).toBe('http-request');
    expect(request.examples).toBeDefined();
    expect(request.examples).toHaveLength(2);

    // Test first example (Success Response)
    const successExample = request.examples[0];
    expect(successExample.name).toBe('Success Response');
    expect(successExample.type).toBe('http-request');
    expect(successExample.itemUid).toBe(request.uid);
    expect(successExample.request.url).toBe('https://testbench-sanity.usebruno.com/ping');
    expect(successExample.request.method).toBe('GET');
    expect(successExample.response.status).toBe('OK');
    expect(successExample.response.statusText).toBe('200');
    expect(successExample.response.body).toBe('{\n    "ping": "pong"\n}');
    expect(successExample.response.headers).toHaveLength(2);
    expect(successExample.response.headers[0].name).toBe('Content-Type');
    expect(successExample.response.headers[0].value).toBe('application/json');
    expect(successExample.response.headers[1].name).toBe('x-powered-by');
    expect(successExample.response.headers[1].value).toBe('Express');

    // Test second example (Error Response)
    const errorExample = request.examples[1];
    expect(errorExample.name).toBe('Error Response');
    expect(errorExample.type).toBe('http-request');
    expect(errorExample.itemUid).toBe(request.uid);
    expect(errorExample.request.url).toBe('https://testbench-sanity.usebruno.com/ping');
    expect(errorExample.request.method).toBe('GET');
    expect(errorExample.response.status).toBe('Internal Server Error');
    expect(errorExample.response.statusText).toBe('500');
    expect(errorExample.response.body).toBe('{\n    "error": "Internal Server Error"\n}');
    expect(errorExample.response.headers).toHaveLength(1);
    expect(errorExample.response.headers[0].name).toBe('Content-Type');
    expect(errorExample.response.headers[0].value).toBe('application/json');

    // Test that the example has the original request headers from the originalRequest
    expect(errorExample.request.headers).toHaveLength(1);
    expect(errorExample.request.headers[0].name).toBe('Content-Type');
    expect(errorExample.request.headers[0].value).toBe('application/json');

    // Test that the example has the original request body from the originalRequest
    expect(errorExample.request.body.mode).toBe('json');
    expect(errorExample.request.body.json).toBe('{\n    "ping": "pong"\n}');
  });

  test('should handle Postman collection without examples', async () => {
    const postmanCollectionWithoutExamples = {
      info: {
        _postman_id: 'd7b47cc4-c3c5-4c9d-99d4-04b6025c9000',
        name: 'collection without examples',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _exporter_id: '41238764'
      },
      item: [
        {
          name: 'Simple Request',
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

    const brunoCollection = await postmanToBruno(postmanCollectionWithoutExamples);

    expect(brunoCollection).toBeDefined();
    expect(brunoCollection.name).toBe('collection without examples');
    expect(brunoCollection.items).toHaveLength(1);

    const request = brunoCollection.items[0];
    expect(request.name).toBe('Simple Request');
    expect(request.type).toBe('http-request');
    expect(request.examples).toBeUndefined();
  });

  test('should handle Postman collection with empty examples array', async () => {
    const postmanCollectionWithEmptyExamples = {
      info: {
        _postman_id: 'd7b47cc4-c3c5-4c9d-99d4-04b6025c9000',
        name: 'collection with empty examples',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _exporter_id: '41238764'
      },
      item: [
        {
          name: 'Request with Empty Examples',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://api.example.com/test',
              protocol: 'https',
              host: ['api', 'example', 'com'],
              path: ['test']
            }
          },
          response: []
        }
      ]
    };

    const brunoCollection = await postmanToBruno(postmanCollectionWithEmptyExamples);

    expect(brunoCollection).toBeDefined();
    expect(brunoCollection.name).toBe('collection with empty examples');
    expect(brunoCollection.items).toHaveLength(1);

    const request = brunoCollection.items[0];
    expect(request.name).toBe('Request with Empty Examples');
    expect(request.type).toBe('http-request');
    expect(request.examples).toBeDefined();
    expect(request.examples).toHaveLength(0);
  });
});
