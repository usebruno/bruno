import { brunoToPostman } from '../../src/postman/bruno-to-postman';

describe('Bruno to Postman Converter with Examples', () => {
  it('should export Bruno collection with examples to Postman format', () => {
    const brunoCollection = {
      name: 'Test Collection with Examples',
      items: [
        {
          name: 'Get Users',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users',
            headers: [
              {
                name: 'Accept',
                value: 'application/json',
                enabled: true
              }
            ],
            params: [],
            body: {
              mode: 'none'
            }
          },
          examples: [
            {
              name: 'Success Response',
              description: 'Successful response with user data',
              type: 'http-request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [
                  {
                    name: 'Accept',
                    value: 'application/json',
                    enabled: true
                  }
                ],
                params: [],
                body: {
                  mode: 'none'
                }
              },
              response: {
                status: '200',
                statusText: 'OK',
                headers: [
                  {
                    name: 'Content-Type',
                    value: 'application/json',
                    enabled: true
                  }
                ],
                body: JSON.stringify({
                  users: [
                    { id: 1, name: 'John Doe', email: 'john@example.com' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
                  ]
                })
              }
            },
            {
              name: 'Error Response',
              description: 'Error response when server fails',
              type: 'http-request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [
                  {
                    name: 'Accept',
                    value: 'application/json',
                    enabled: true
                  }
                ],
                params: [],
                body: {
                  mode: 'none'
                }
              },
              response: {
                status: '500',
                statusText: 'Internal Server Error',
                headers: [
                  {
                    name: 'Content-Type',
                    value: 'application/json',
                    enabled: true
                  }
                ],
                body: JSON.stringify({
                  error: 'Internal Server Error',
                  message: 'Something went wrong'
                })
              }
            }
          ]
        },
        {
          name: 'Create User',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://api.example.com/users',
            headers: [
              {
                name: 'Content-Type',
                value: 'application/json',
                enabled: true
              }
            ],
            params: [],
            body: {
              mode: 'json',
              json: JSON.stringify({
                name: 'New User',
                email: 'newuser@example.com'
              })
            }
          },
          examples: [
            {
              name: 'User Created',
              description: 'Successfully created user',
              type: 'http-request',
              request: {
                method: 'POST',
                url: 'https://api.example.com/users',
                headers: [
                  {
                    name: 'Content-Type',
                    value: 'application/json',
                    enabled: true
                  }
                ],
                params: [],
                body: {
                  mode: 'json',
                  json: JSON.stringify({
                    name: 'New User',
                    email: 'newuser@example.com'
                  })
                }
              },
              response: {
                status: '201',
                statusText: 'Created',
                headers: [
                  {
                    name: 'Content-Type',
                    value: 'application/json',
                    enabled: true
                  }
                ],
                body: JSON.stringify({
                  id: 123,
                  name: 'New User',
                  email: 'newuser@example.com',
                  createdAt: '2023-01-01T00:00:00Z'
                })
              }
            }
          ]
        }
      ]
    };

    const postmanCollection = brunoToPostman(brunoCollection);

    // Verify basic collection structure
    expect(postmanCollection).toBeDefined();
    expect(postmanCollection.info.name).toBe('Test Collection with Examples');
    expect(postmanCollection.item).toHaveLength(2);

    // Test first request with examples
    const getUsersRequest = postmanCollection.item[0];
    expect(getUsersRequest.name).toBe('Get Users');
    expect(getUsersRequest.request.method).toBe('GET');
    expect(getUsersRequest.request.url.raw).toBe('https://api.example.com/users');

    // Verify examples are converted to responses
    expect(getUsersRequest.response).toBeDefined();
    expect(getUsersRequest.response).toHaveLength(2);

    // Test first example (Success Response)
    const successResponse = getUsersRequest.response[0];
    expect(successResponse.name).toBe('Success Response');
    expect(successResponse.status).toBe('OK');
    expect(successResponse.code).toBe(200);
    expect(successResponse._postman_previewlanguage).toBe('json');
    expect(successResponse.header).toHaveLength(1);
    expect(successResponse.header[0].key).toBe('Content-Type');
    expect(successResponse.header[0].value).toBe('application/json');
    expect(JSON.parse(successResponse.body)).toEqual({
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ]
    });

    // Verify originalRequest is properly generated
    expect(successResponse.originalRequest).toBeDefined();
    expect(successResponse.originalRequest.method).toBe('GET');
    expect(successResponse.originalRequest.url.raw).toBe('https://api.example.com/users');
    expect(successResponse.originalRequest.header).toHaveLength(1);
    expect(successResponse.originalRequest.header[0].key).toBe('Accept');
    expect(successResponse.originalRequest.header[0].value).toBe('application/json');

    // Test second example (Error Response)
    const errorResponse = getUsersRequest.response[1];
    expect(errorResponse.name).toBe('Error Response');
    expect(errorResponse.status).toBe('Internal Server Error');
    expect(errorResponse.code).toBe(500);
    expect(JSON.parse(errorResponse.body)).toEqual({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });

    // Test second request with examples
    const createUserRequest = postmanCollection.item[1];
    expect(createUserRequest.name).toBe('Create User');
    expect(createUserRequest.request.method).toBe('POST');
    expect(createUserRequest.response).toBeDefined();
    expect(createUserRequest.response).toHaveLength(1);

    const createdResponse = createUserRequest.response[0];
    expect(createdResponse.name).toBe('User Created');
    expect(createdResponse.status).toBe('Created');
    expect(createdResponse.code).toBe(201);
    expect(JSON.parse(createdResponse.body)).toEqual({
      id: 123,
      name: 'New User',
      email: 'newuser@example.com',
      createdAt: '2023-01-01T00:00:00Z'
    });
  });

  it('should handle requests without examples', () => {
    const brunoCollection = {
      name: 'Collection without Examples',
      items: [
        {
          name: 'Simple Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            headers: [],
            params: [],
            body: { mode: 'none' }
          }
          // No examples
        }
      ]
    };

    const postmanCollection = brunoToPostman(brunoCollection);

    expect(postmanCollection).toBeDefined();
    expect(postmanCollection.item).toHaveLength(1);

    const request = postmanCollection.item[0];
    expect(request.name).toBe('Simple Request');
    expect(request.response).toBeUndefined(); // No examples, so no response array
  });

  it('should handle empty examples array', () => {
    const brunoCollection = {
      name: 'Collection with Empty Examples',
      items: [
        {
          name: 'Request with Empty Examples',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            headers: [],
            params: [],
            body: { mode: 'none' }
          },
          examples: [] // Empty array
        }
      ]
    };

    const postmanCollection = brunoToPostman(brunoCollection);

    expect(postmanCollection).toBeDefined();
    expect(postmanCollection.item).toHaveLength(1);

    const request = postmanCollection.item[0];
    expect(request.name).toBe('Request with Empty Examples');
    expect(request.response).toBeUndefined(); // Empty examples array, so no response array
  });

  it('should handle different content types in examples', () => {
    const brunoCollection = {
      name: 'Collection with Different Content Types',
      items: [
        {
          name: 'XML Response',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/xml',
            headers: [],
            params: [],
            body: { mode: 'none' }
          },
          examples: [
            {
              name: 'XML Example',
              type: 'http-request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/xml',
                headers: [],
                params: [],
                body: { mode: 'none' }
              },
              response: {
                status: '200',
                statusText: 'OK',
                headers: [
                  {
                    name: 'Content-Type',
                    value: 'application/xml',
                    enabled: true
                  }
                ],
                body: '<users><user><id>1</id><name>John</name></user></users>'
              }
            },
            {
              name: 'HTML Example',
              type: 'http-request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/html',
                headers: [],
                params: [],
                body: { mode: 'none' }
              },
              response: {
                status: '200',
                statusText: 'OK',
                headers: [
                  {
                    name: 'Content-Type',
                    value: 'text/html',
                    enabled: true
                  }
                ],
                body: '<html><body><h1>Hello World</h1></body></html>'
              }
            }
          ]
        }
      ]
    };

    const postmanCollection = brunoToPostman(brunoCollection);

    expect(postmanCollection).toBeDefined();
    expect(postmanCollection.item).toHaveLength(1);

    const request = postmanCollection.item[0];
    expect(request.response).toHaveLength(2);

    // Test XML response
    const xmlResponse = request.response[0];
    expect(xmlResponse.name).toBe('XML Example');
    expect(xmlResponse._postman_previewlanguage).toBe('xml');
    expect(xmlResponse.body).toBe('<users><user><id>1</id><name>John</name></user></users>');

    // Test HTML response
    const htmlResponse = request.response[1];
    expect(htmlResponse.name).toBe('HTML Example');
    expect(htmlResponse._postman_previewlanguage).toBe('html');
    expect(htmlResponse.body).toBe('<html><body><h1>Hello World</h1></body></html>');
  });

  it('should handle folders with examples', () => {
    const brunoCollection = {
      name: 'Collection with Folders and Examples',
      items: [
        {
          name: 'Users API',
          type: 'folder',
          items: [
            {
              name: 'Get User',
              type: 'http-request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users/1',
                headers: [],
                params: [],
                body: { mode: 'none' }
              },
              examples: [
                {
                  name: 'User Found',
                  type: 'http-request',
                  request: {
                    method: 'GET',
                    url: 'https://api.example.com/users/1',
                    headers: [],
                    params: [],
                    body: { mode: 'none' }
                  },
                  response: {
                    status: '200',
                    statusText: 'OK',
                    headers: [
                      {
                        name: 'Content-Type',
                        value: 'application/json',
                        enabled: true
                      }
                    ],
                    body: JSON.stringify({ id: 1, name: 'John Doe' })
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const postmanCollection = brunoToPostman(brunoCollection);

    expect(postmanCollection).toBeDefined();
    expect(postmanCollection.item).toHaveLength(1);

    const folder = postmanCollection.item[0];
    expect(folder.name).toBe('Users API');
    expect(folder.item).toHaveLength(1);

    const request = folder.item[0];
    expect(request.name).toBe('Get User');
    expect(request.response).toBeDefined();
    expect(request.response).toHaveLength(1);
    expect(request.response[0].name).toBe('User Found');
  });
});
