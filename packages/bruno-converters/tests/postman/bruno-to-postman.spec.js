import { sanitizeUrl, transformUrl, brunoToPostman } from "../../src/postman/bruno-to-postman";

describe('transformUrl', () => {
  it('should handle basic URL with path variables', () => {
    const url = 'https://example.com/{{username}}/api/resource/:id';
    const params = [
      { name: 'id', value: '123', type: 'path' },
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/{{username}}/api/resource/:id',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['{{username}}', 'api', 'resource', ':id'],
      query: [],
      variable: [
        { key: 'id', value: '123' },
      ]
    });
  });

  it('should handle URL with query parameters', () => {
    const url = 'https://example.com/api/resource?limit=10&offset=20';
    const params = [
      { name: 'limit', value: '10', type: 'query' },
      { name: 'offset', value: '20', type: 'query' }
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/api/resource?limit=10&offset=20',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [
        { key: 'limit', value: '10' },
        { key: 'offset', value: '20' }
      ],
      variable: []
    });
  });

  it('should handle URL without protocol', () => {
    const url = 'example.com/api/resource';
    const params = [];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'example.com/api/resource',
      protocol: '',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [],
      variable: []
    });
  });
});

describe('sanitizeUrl', () => {
  it('should replace backslashes with slashes', () => {
    const input = 'http:\\\\example.com\\path\\to\\file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should collapse multiple slashes into a single slash', () => {
    const input = 'http://example.com//path///to////file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should handle URLs with mixed slashes', () => {
    const input = 'http:\\example.com//path\\to//file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });
});

describe('brunoToPostman null checks and fallbacks', () => {
  it('should handle null or undefined headers', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            headers: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.header).toEqual([]);
  });

  it('should handle null or undefined items in headers', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            headers: [
              { name: null, value: 'test-value', enabled: true },
              { name: 'Content-Type', value: null, enabled: true }
            ]
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.header).toEqual([
      { key: '', value: 'test-value', disabled: false, type: 'default' },
      { key: 'Content-Type', value: '', disabled: false, type: 'default' }
    ]);
  });

  it('should handle null or undefined body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    // Should not have body property since we're checking for body before adding it
    expect(result.item[0].request.body).toBeUndefined();
  });

  it('should handle null or undefined body mode', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: {}
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    // Should use default raw mode for undefined body mode
    expect(result.item[0].request.body).toEqual({
      mode: 'raw',
      raw: ''
    });
  });

  it('should handle null or undefined formUrlEncoded array', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: null
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'urlencoded',
      urlencoded: []
    });
  });

  it('should handle null or undefined multipartForm array', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: null
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: []
    });
  });

  it('should handle null or undefined items in form data', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: [
                { name: null, value: 'test-value', enabled: true },
                { name: 'field', value: null, enabled: true }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body.urlencoded).toEqual([
      { key: '', value: 'test-value', disabled: false, type: 'default' },
      { key: 'field', value: '', disabled: false, type: 'default' }
    ]);
  });

  it('should handle null or undefined method', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            url: 'https://example.com',
            method: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.method).toBe('GET');
  });

  it('should handle null or undefined url', () => {
    // Mock console.error to prevent it from logging during test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.url.raw).toBe('');
  });

  it('should handle null or undefined params', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            params: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.url.variable).toEqual([]);
  });

  it('should handle null or undefined docs', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            docs: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.description).toBe('');
  });

  it('should handle null or undefined folder name', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: null,
          items: []
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].name).toBe('Untitled Folder');
  });

  it('should handle null or undefined request name', () => {
    const simpleCollection = {
      items: [
        {
          type: 'http-request',
          name: null,
          request: {
            method: 'GET',
            url: 'https://example.com'
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].name).toBe('Untitled Request');
  });

  it('should handle null or undefined folder items', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Test Folder',
          items: null
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].item).toEqual([]);
  });

  it('should handle null or undefined auth object', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({ type: 'noauth' });
  });

  it('should handle missing token in bearer auth', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: {
              mode: 'bearer',
              bearer: { token: null }
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({
      type: 'bearer',
      bearer: {
        key: 'token',
        value: '',
        type: 'string'
      }
    });
  });

  it('should handle missing username/password in basic auth', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: {
              mode: 'basic',
              basic: { username: null, password: undefined }
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({
      type: 'basic',
      basic: [
        {
          key: 'password',
          value: '',
          type: 'string'
        },
        {
          key: 'username',
          value: '',
          type: 'string'
        }
      ]
    });
  });

  it('should handle missing key/value in apikey auth', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: {
              mode: 'apikey',
              apikey: { key: null, value: undefined }
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({
      type: 'apikey',
      apikey: [
        {
          key: 'key',
          value: '',
          type: 'string'
        },
        {
          key: 'value',
          value: '',
          type: 'string'
        }
      ]
    });
  });
});

describe('brunoToPostman event handling', () => {
  it('should generate events for request scripts (req/res)', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            script: {
              req: 'console.log("pre");',
              res: 'console.log("post");'
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const events = result.item[0].event;

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ listen: 'prerequest', script: { exec: ['console.log("pre");'] } });
    expect(events[1]).toMatchObject({ listen: 'test', script: { exec: ['console.log("post");'] } });
  });

  it('should generate events for folder scripts', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Test Folder',
          script: {
            req: 'console.log("folder pre");',
            res: 'console.log("folder post");'
          },
          items: []
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const folder = result.item[0];

    expect(folder.name).toBe('Test Folder');
    expect(folder.event).toHaveLength(2);
    expect(folder.event[0].listen).toBe('prerequest');
    expect(folder.event[1].listen).toBe('test');
  });

  it('should generate collection-level events from root', () => {
    const simpleCollection = {
      root: {
        script: {
          req: 'console.log("collection pre");',
          res: 'console.log("collection post");'
        }
      },
      items: []
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.event).toHaveLength(2);
    expect(result.event[0].listen).toBe('prerequest');
    expect(result.event[1].listen).toBe('test');
  });

  it('should handle nested folders and requests with scripts', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Parent Folder',
          items: [
            {
              type: 'http-request',
              name: 'Nested Request',
              request: {
                method: 'GET',
                url: 'https://example.com',
                script: { req: 'console.log("nested pre");' }
              }
            }
          ]
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const folder = result.item[0];
    const nestedRequest = folder.item[0];

    expect(folder.name).toBe('Parent Folder');
    expect(nestedRequest.name).toBe('Nested Request');
    expect(nestedRequest.event).toHaveLength(1);
    expect(nestedRequest.event[0].listen).toBe('prerequest');
    expect(nestedRequest.event[0].script.exec).toEqual(['console.log("nested pre");']);
  });
});