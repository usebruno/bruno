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
});
