import { resolveCollectionForHtmlDocumentation } from './html-documentation';

describe('resolveCollectionForHtmlDocumentation', () => {
  it('resolves global variables in request URLs for HTML docs export', () => {
    const collection = {
      uid: 'collection-1',
      activeEnvironmentUid: 'env-1',
      globalEnvironmentVariables: {
        url: 'https://postman-echo.com'
      },
      environments: [
        {
          uid: 'env-1',
          variables: []
        }
      ],
      root: {
        request: {
          vars: {
            req: []
          }
        }
      },
      items: [
        {
          uid: 'request-1',
          type: 'http-request',
          request: {
            url: '{{url}}/get',
            method: 'get',
            headers: [],
            params: [],
            body: {
              mode: 'none'
            },
            auth: {
              mode: 'none'
            },
            vars: {
              req: []
            }
          },
          examples: []
        }
      ]
    };

    resolveCollectionForHtmlDocumentation(collection);

    expect(collection.items[0].request.url).toBe('https://postman-echo.com/get');
    expect(collection.items[0].request.url).not.toContain('{{url}}');
  });

  it('resolves global, collection, and environment variables in request payloads', () => {
    const collection = {
      uid: 'collection-2',
      activeEnvironmentUid: 'env-1',
      globalEnvironmentVariables: {
        url: 'https://postman-echo.com'
      },
      environments: [
        {
          uid: 'env-1',
          variables: [
            {
              name: 'token',
              value: 'env-token',
              enabled: true
            }
          ]
        }
      ],
      root: {
        request: {
          vars: {
            req: [
              {
                name: 'endpoint',
                value: 'get',
                enabled: true
              }
            ]
          }
        }
      },
      items: [
        {
          uid: 'request-2',
          type: 'http-request',
          request: {
            url: '{{url}}/:resource',
            method: 'get',
            headers: [
              {
                uid: 'header-1',
                name: 'Authorization',
                value: 'Bearer {{token}}',
                enabled: true
              }
            ],
            params: [
              {
                uid: 'param-1',
                type: 'path',
                name: 'resource',
                value: '{{endpoint}}',
                enabled: true
              }
            ],
            body: {
              mode: 'text',
              text: '{{url}}/{{endpoint}}?token={{token}}'
            },
            auth: {
              mode: 'none'
            },
            vars: {
              req: []
            }
          },
          examples: []
        }
      ]
    };

    resolveCollectionForHtmlDocumentation(collection);

    const request = collection.items[0].request;

    expect(request.url).toBe('https://postman-echo.com/get');
    expect(request.headers[0].value).toBe('Bearer env-token');
    expect(request.body.text).toBe('https://postman-echo.com/get?token=env-token');
    expect(JSON.stringify(request)).not.toContain('{{');
  });

  it('redacts secret variables and does not resolve process.env variables', () => {
    const collection = {
      uid: 'collection-3',
      activeEnvironmentUid: 'env-1',
      globalEnvironmentVariables: {
        url: 'https://postman-echo.com',
        globalSecret: 'super-secret-global-token'
      },
      globalEnvSecrets: ['globalSecret'],
      processEnvVariables: {
        API_KEY: 'local-machine-value'
      },
      environments: [
        {
          uid: 'env-1',
          variables: [
            {
              name: 'token',
              value: 'super-secret-token',
              enabled: true,
              secret: true
            }
          ]
        }
      ],
      root: {
        request: {
          vars: {
            req: []
          }
        }
      },
      items: [
        {
          uid: 'request-3',
          type: 'http-request',
          request: {
            url: '{{url}}/get?apiKey={{process.env.API_KEY}}',
            method: 'get',
            headers: [
              {
                uid: 'header-1',
                name: 'Authorization',
                value: 'Bearer {{token}}',
                enabled: true
              },
              {
                uid: 'header-2',
                name: 'X-Global',
                value: '{{globalSecret}}',
                enabled: true
              }
            ],
            params: [],
            body: {
              mode: 'text',
              text: '{{token}}/{{globalSecret}}/{{process.env.API_KEY}}'
            },
            auth: {
              mode: 'none'
            },
            vars: {
              req: []
            }
          },
          examples: []
        }
      ]
    };

    resolveCollectionForHtmlDocumentation(collection);

    const request = collection.items[0].request;

    expect(request.headers[0].value).toBe('Bearer [REDACTED]');
    expect(request.headers[1].value).toBe('[REDACTED]');
    expect(request.body.text).toBe('[REDACTED]/[REDACTED]/{{process.env.API_KEY}}');
    expect(request.url).toBe('https://postman-echo.com/get?apiKey={{process.env.API_KEY}}');
  });

  it('resolves GraphQL body when represented as an object', () => {
    const collection = {
      uid: 'collection-4',
      activeEnvironmentUid: 'env-1',
      globalEnvironmentVariables: {
        userId: '42'
      },
      environments: [
        {
          uid: 'env-1',
          variables: [
            {
              name: 'token',
              value: 'env-token',
              enabled: true
            }
          ]
        }
      ],
      root: {
        request: {
          vars: {
            req: []
          }
        }
      },
      items: [
        {
          uid: 'request-4',
          type: 'graphql-request',
          request: {
            url: 'https://postman-echo.com/graphql',
            method: 'post',
            headers: [],
            params: [],
            body: {
              mode: 'graphql',
              graphql: {
                query: 'query User { user(id: "{{userId}}") { id token } }',
                variables: '{ "auth": "{{token}}" }'
              }
            },
            auth: {
              mode: 'none'
            },
            vars: {
              req: []
            }
          },
          examples: []
        }
      ]
    };

    resolveCollectionForHtmlDocumentation(collection);

    const request = collection.items[0].request;

    expect(request.body.graphql.query).toBe('query User { user(id: "42") { id token } }');
    expect(request.body.graphql.variables).toContain('"auth": "env-token"');
  });

  it('interpolates multipart field names for non-text entries and preserves non-text values', () => {
    const collection = {
      uid: 'collection-5',
      activeEnvironmentUid: 'env-1',
      globalEnvironmentVariables: {
        fileFieldName: 'upload_file',
        filePathVar: '/tmp/secret.txt'
      },
      environments: [
        {
          uid: 'env-1',
          variables: []
        }
      ],
      root: {
        request: {
          vars: {
            req: []
          }
        }
      },
      items: [
        {
          uid: 'request-5',
          type: 'http-request',
          request: {
            url: 'https://postman-echo.com/post',
            method: 'post',
            headers: [],
            params: [],
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  uid: 'entry-1',
                  type: 'file',
                  name: '{{fileFieldName}}',
                  value: '{{filePathVar}}',
                  enabled: true
                }
              ]
            },
            auth: {
              mode: 'none'
            },
            vars: {
              req: []
            }
          },
          examples: []
        }
      ]
    };

    resolveCollectionForHtmlDocumentation(collection);

    const multipartEntry = collection.items[0].request.body.multipartForm[0];

    expect(multipartEntry.name).toBe('upload_file');
    expect(multipartEntry.value).toBe('{{filePathVar}}');
  });
});
