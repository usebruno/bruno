import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../src/openapi/openapi-to-bruno';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenAPI with Examples', () => {
  const openApiWithExamples = fs.readFileSync(path.resolve(__dirname, '../../../../tests/import/openapi/fixtures/openapi-with-examples.yaml'),
    'utf8');

  it('should import OpenAPI collection with response examples', () => {
    const brunoCollection = openApiToBruno(openApiWithExamples);

    expect(brunoCollection).toBeDefined();
    expect(brunoCollection.name).toBe('API with Examples');
    expect(brunoCollection.items).toHaveLength(3); // Three separate requests

    // Test GET /users endpoint
    const getUsersRequest = brunoCollection.items.find((item) => item.name === 'Get all users');
    expect(getUsersRequest).toBeDefined();
    expect(getUsersRequest.examples).toBeDefined();
    expect(getUsersRequest.examples).toHaveLength(4);

    // Check specific examples
    const successExample = getUsersRequest.examples.find((ex) => ex.name === 'Success Response');
    expect(successExample).toBeDefined();
    expect(successExample.response.status).toBe('200');
    expect(successExample.response.statusText).toBe('OK');
    expect(successExample.response.headers).toHaveLength(1);
    expect(successExample.response.headers[0].name).toBe('Content-Type');
    expect(successExample.response.headers[0].value).toBe('application/json');
    expect(JSON.parse(successExample.response.body.content)).toEqual({
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ]
    });

    const emptyExample = getUsersRequest.examples.find((ex) => ex.name === 'Empty Response');
    expect(emptyExample.response.status).toBe('200');
    expect(JSON.parse(emptyExample.response.body.content)).toEqual({ users: [] });

    const validationErrorExample = getUsersRequest.examples.find((ex) => ex.name === 'Validation Error');
    expect(validationErrorExample).toBeDefined();
    expect(validationErrorExample.response.status).toBe('400');
    expect(validationErrorExample.response.statusText).toBe('Bad Request');

    const serverErrorExample = getUsersRequest.examples.find((ex) => ex.name === 'Server Error');
    expect(serverErrorExample).toBeDefined();
    expect(serverErrorExample.response.status).toBe('500');
    expect(serverErrorExample.response.statusText).toBe('Internal Server Error');

    // Test POST /users endpoint
    const createUserRequest = brunoCollection.items.find((item) => item.name === 'Create a new user');
    expect(createUserRequest).toBeDefined();
    expect(createUserRequest.examples).toBeDefined();
    expect(createUserRequest.examples).toHaveLength(4); // 2 response + 2 request body examples

    // Check response examples
    const createdExample = createUserRequest.examples.find((ex) => ex.name === 'User Created');
    expect(createdExample).toBeDefined();
    expect(createdExample.response.status).toBe('201');
    expect(createdExample.response.statusText).toBe('Created');
    expect(JSON.parse(createdExample.response.body.content)).toEqual({
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
      created_at: '2023-01-01T00:00:00Z'
    });

    // Check request body examples
    const validUserExample = createUserRequest.examples.find((ex) => ex.name === 'Valid User');
    expect(validUserExample).toBeDefined();
    expect(validUserExample.request).toBeDefined();
    expect(validUserExample.request.body.mode).toBe('json');
    expect(JSON.parse(validUserExample.request.body.json)).toEqual({
      name: 'John Doe',
      email: 'john@example.com'
    });

    const invalidUserExample = createUserRequest.examples.find((ex) => ex.name === 'Invalid User');
    expect(invalidUserExample).toBeDefined();
    expect(invalidUserExample.request).toBeDefined();
    expect(invalidUserExample.request.body.mode).toBe('json');
    expect(JSON.parse(invalidUserExample.request.body.json)).toEqual({
      name: '',
      email: 'invalid-email'
    });
  });

  it('should handle OpenAPI examples with different content types', () => {
    const openApiWithDifferentContentTypes = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Different Content Types'
paths:
  /data:
    get:
      summary: 'Get data'
      operationId: 'getData'
      responses:
        '200':
          description: 'Successful response'
          content:
            application/json:
              examples:
                json_response:
                  summary: 'JSON Response'
                  value:
                    message: 'Hello World'
            text/plain:
              examples:
                text_response:
                  summary: 'Text Response'
                  value: 'Hello World'
servers:
  - url: 'https://api.example.com'
`;

    const brunoCollection = openApiToBruno(openApiWithDifferentContentTypes);
    const request = brunoCollection.items[0];

    expect(request.examples).toHaveLength(2);

    const jsonExample = request.examples.find((ex) => ex.name === 'JSON Response');
    expect(jsonExample).toBeDefined();
    expect(jsonExample.response.headers[0].value).toBe('application/json');

    const textExample = request.examples.find((ex) => ex.name === 'Text Response');
    expect(textExample).toBeDefined();
    expect(textExample.response.headers[0].value).toBe('text/plain');
    expect(textExample.response.body.content).toBe('Hello World');
    expect(textExample.response.body.type).toBe('text');
  });

  it('should handle OpenAPI examples without summary or description', () => {
    const openApiWithMinimalExamples = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Minimal Examples'
paths:
  /test:
    get:
      summary: 'Test endpoint'
      operationId: 'test'
      responses:
        '200':
          description: 'OK'
          content:
            application/json:
              examples:
                example1:
                  value:
                    message: 'test'
servers:
  - url: 'https://api.example.com'
`;

    const brunoCollection = openApiToBruno(openApiWithMinimalExamples);
    const request = brunoCollection.items[0];

    expect(request.examples).toHaveLength(1);
    const example = request.examples[0];
    expect(example.name).toBe('example1');
    expect(example.description).toBe('');
    expect(example.response.body.type).toBe('json');
    expect(JSON.parse(example.response.body.content)).toEqual({ message: 'test' });
  });

  it('should not create examples array if no examples are present', () => {
    const openApiWithoutExamples = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API without Examples'
paths:
  /test:
    get:
      summary: 'Test endpoint'
      operationId: 'test'
      responses:
        '200':
          description: 'OK'
          content:
            application/json:
              schema:
                type: object
servers:
  - url: 'https://api.example.com'
`;

    const brunoCollection = openApiToBruno(openApiWithoutExamples);
    const request = brunoCollection.items[0];

    expect(request.examples).toBeUndefined();
  });

  it('should support path-based grouping when specified', () => {
    const openApiWithPathGrouping = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Path Grouping'
paths:
  /users:
    get:
      summary: 'Get all users'
      operationId: 'getUsers'
      responses:
        '200':
          description: 'OK'
          content:
            application/json:
              examples:
                success:
                  summary: 'Success Response'
                  value:
                    users: []
    post:
      summary: 'Create user'
      operationId: 'createUser'
      responses:
        '201':
          description: 'Created'
          content:
            application/json:
              examples:
                created:
                  summary: 'User Created'
                  value:
                    id: 123
  /products:
    get:
      summary: 'Get all products'
      operationId: 'getProducts'
      responses:
        '200':
          description: 'OK'
          content:
            application/json:
              examples:
                success:
                  summary: 'Products Response'
                  value:
                    products: []
servers:
  - url: 'https://api.example.com'
`;

    // Test with path-based grouping
    const brunoCollection = openApiToBruno(openApiWithPathGrouping, { groupBy: 'path' });

    expect(brunoCollection).toBeDefined();
    expect(brunoCollection.name).toBe('API with Path Grouping');

    // Should have 2 folders: users and products (without leading slash)
    expect(brunoCollection.items).toHaveLength(2);

    const usersFolder = brunoCollection.items.find((item) => item.name === 'users');
    expect(usersFolder).toBeDefined();
    expect(usersFolder.type).toBe('folder');
    expect(usersFolder.items).toHaveLength(2); // GET and POST /users

    const productsFolder = brunoCollection.items.find((item) => item.name === 'products');
    expect(productsFolder).toBeDefined();
    expect(productsFolder.type).toBe('folder');
    expect(productsFolder.items).toHaveLength(1); // GET /products

    // Verify examples are preserved in path-based grouping
    const getUsersRequest = usersFolder.items.find((item) => item.name === 'Get all users');
    expect(getUsersRequest.examples).toBeDefined();
    expect(getUsersRequest.examples).toHaveLength(1);
    expect(getUsersRequest.examples[0].name).toBe('Success Response');
  });

  it('should default to tag-based grouping when no groupBy option is specified', () => {
    const openApiWithTags = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Tags'
paths:
  /users:
    get:
      summary: 'Get all users'
      operationId: 'getUsers'
      tags: ['Users']
      responses:
        '200':
          description: 'OK'
  /products:
    get:
      summary: 'Get all products'
      operationId: 'getProducts'
      tags: ['Products']
      responses:
        '200':
          description: 'OK'
servers:
  - url: 'https://api.example.com'
`;

    // Test with default grouping (tags)
    const brunoCollection = openApiToBruno(openApiWithTags);

    expect(brunoCollection).toBeDefined();
    expect(brunoCollection.name).toBe('API with Tags');

    // Should have 2 folders based on tags: Users and Products
    expect(brunoCollection.items).toHaveLength(2);

    const usersFolder = brunoCollection.items.find((item) => item.name === 'Users');
    expect(usersFolder).toBeDefined();
    expect(usersFolder.type).toBe('folder');
    expect(usersFolder.items).toHaveLength(1); // GET /users

    const productsFolder = brunoCollection.items.find((item) => item.name === 'Products');
    expect(productsFolder).toBeDefined();
    expect(productsFolder.type).toBe('folder');
    expect(productsFolder.items).toHaveLength(1); // GET /products
  });
});
