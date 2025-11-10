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
    expect(createUserRequest.examples).toHaveLength(4);

    // Check response examples
    const createdExample = createUserRequest.examples.find((ex) => ex.name === 'User Created (Valid User)');
    expect(createdExample).toBeDefined();
    expect(createdExample.response.status).toBe('201');
    expect(createdExample.response.statusText).toBe('Created');
    expect(JSON.parse(createdExample.response.body.content)).toEqual({
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
      created_at: '2023-01-01T00:00:00Z'
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

  it('should create examples without specified request body, when response is present', () => {
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

    expect(request.examples).toHaveLength(1);
    const example = request.examples[0];
    expect(example.name).toBe('200 Response');
    expect(example.description).toBe('OK');
    expect(example.response.body.type).toBe('json');
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

  describe('Request Body Examples', () => {
    it('should match request body examples by key when response example key matches', () => {
      const openApiWithMatchingKeys = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Matching Keys'
paths:
  /users:
    post:
      summary: 'Create user'
      operationId: 'createUser'
      requestBody:
        required: true
        content:
          application/json:
            examples:
              valid_user:
                summary: 'Valid User'
                value:
                  name: 'John Doe'
                  email: 'john@example.com'
              invalid_user:
                summary: 'Invalid User'
                value:
                  name: ''
                  email: 'invalid'
      responses:
        '201':
          description: 'Created'
          content:
            application/json:
              examples:
                valid_user:
                  summary: 'User Created'
                  value:
                    id: 123
                    name: 'John Doe'
                invalid_user:
                  summary: 'Validation Error'
                  value:
                    error: 'Invalid input'
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithMatchingKeys);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      expect(request.examples).toHaveLength(2);

      // Check that matching keys are used
      const validUserExample = request.examples.find((ex) => ex.name === 'User Created');
      expect(validUserExample).toBeDefined();
      expect(validUserExample.request.body.mode).toBe('json');
      expect(JSON.parse(validUserExample.request.body.json)).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(JSON.parse(validUserExample.response.body.content)).toEqual({
        id: 123,
        name: 'John Doe'
      });

      const invalidUserExample = request.examples.find((ex) => ex.name === 'Validation Error');
      expect(invalidUserExample).toBeDefined();
      expect(JSON.parse(invalidUserExample.request.body.json)).toEqual({
        name: '',
        email: 'invalid'
      });
      expect(JSON.parse(invalidUserExample.response.body.content)).toEqual({
        error: 'Invalid input'
      });
    });

    it('should create all combinations when response example keys do not match request body examples', () => {
      const openApiWithNonMatchingKeys = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Non-Matching Keys'
paths:
  /users:
    post:
      summary: 'Create user'
      operationId: 'createUser'
      requestBody:
        required: true
        content:
          application/json:
            examples:
              valid_user:
                summary: 'Valid User'
                value:
                  name: 'John Doe'
                  email: 'john@example.com'
              invalid_user:
                summary: 'Invalid User'
                value:
                  name: ''
                  email: 'invalid'
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
        '400':
          description: 'Bad Request'
          content:
            application/json:
              examples:
                error:
                  summary: 'Validation Error'
                  value:
                    error: 'Invalid input'
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithNonMatchingKeys);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      // Should have 4 examples: 2 response examples × 2 request body examples
      expect(request.examples).toHaveLength(4);

      // Check combinations for 201 response
      const createdWithValid = request.examples.find((ex) => ex.name === 'User Created (Valid User)');
      expect(createdWithValid).toBeDefined();
      expect(createdWithValid.response.status).toBe('201');
      expect(JSON.parse(createdWithValid.request.body.json)).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });

      const createdWithInvalid = request.examples.find((ex) => ex.name === 'User Created (Invalid User)');
      expect(createdWithInvalid).toBeDefined();
      expect(createdWithInvalid.response.status).toBe('201');
      expect(JSON.parse(createdWithInvalid.request.body.json)).toEqual({
        name: '',
        email: 'invalid'
      });

      // Check combinations for 400 response
      const errorWithValid = request.examples.find((ex) => ex.name === 'Validation Error (Valid User)');
      expect(errorWithValid).toBeDefined();
      expect(errorWithValid.response.status).toBe('400');

      const errorWithInvalid = request.examples.find((ex) => ex.name === 'Validation Error (Invalid User)');
      expect(errorWithInvalid).toBeDefined();
      expect(errorWithInvalid.response.status).toBe('400');
    });

    it('should use single request body example for all response examples', () => {
      const openApiWithSingleRequestBody = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Single Request Body'
paths:
  /users:
    post:
      summary: 'Create user'
      operationId: 'createUser'
      requestBody:
        required: true
        content:
          application/json:
            example:
              name: 'John Doe'
              email: 'john@example.com'
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
                duplicate:
                  summary: 'Duplicate User'
                  value:
                    error: 'User already exists'
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithSingleRequestBody);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      expect(request.examples).toHaveLength(2);

      // Both examples should have the same request body
      const createdExample = request.examples.find((ex) => ex.name === 'User Created');
      expect(createdExample).toBeDefined();
      expect(createdExample.request.body.mode).toBe('json');
      expect(JSON.parse(createdExample.request.body.json)).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });

      const duplicateExample = request.examples.find((ex) => ex.name === 'Duplicate User');
      expect(duplicateExample).toBeDefined();
      expect(JSON.parse(duplicateExample.request.body.json)).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should use schema-based request body for all response examples', () => {
      const openApiWithSchemaRequestBody = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Schema Request Body'
paths:
  /users:
    post:
      summary: 'Create user'
      operationId: 'createUser'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - email
              properties:
                name:
                  type: string
                  example: 'John Doe'
                email:
                  type: string
                  format: email
                  example: 'john@example.com'
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
                error:
                  summary: 'Error Response'
                  value:
                    error: 'Something went wrong'
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithSchemaRequestBody);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      expect(request.examples).toHaveLength(2);

      // Both examples should have request body generated from schema
      const createdExample = request.examples.find((ex) => ex.name === 'User Created');
      expect(createdExample).toBeDefined();
      expect(createdExample.request.body.mode).toBe('json');
      const requestBody = JSON.parse(createdExample.request.body.json);
      expect(requestBody).toHaveProperty('name');
      expect(requestBody).toHaveProperty('email');

      const errorExample = request.examples.find((ex) => ex.name === 'Error Response');
      expect(errorExample).toBeDefined();
      expect(JSON.parse(errorExample.request.body.json)).toEqual(requestBody);
    });

    it('should handle request body examples with different content types', () => {
      const openApiWithDifferentRequestBodyTypes = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Different Request Body Types'
paths:
  /data:
    post:
      summary: 'Post data'
      operationId: 'postData'
      requestBody:
        required: true
        content:
          application/json:
            examples:
              json_data:
                summary: 'JSON Data'
                value:
                  message: 'Hello'
          text/plain:
            examples:
              text_data:
                summary: 'Text Data'
                value: 'Hello World'
      responses:
        '200':
          description: 'OK'
          content:
            application/json:
              examples:
                success:
                  summary: 'Success'
                  value:
                    status: 'ok'
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithDifferentRequestBodyTypes);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      // Should create combinations: 1 response × 2 request body examples = 2 examples
      expect(request.examples).toHaveLength(2);

      const jsonExample = request.examples.find((ex) => ex.name === 'Success (JSON Data)');
      expect(jsonExample).toBeDefined();
      expect(jsonExample.request.body.mode).toBe('json');
      expect(JSON.parse(jsonExample.request.body.json)).toEqual({ message: 'Hello' });

      const textExample = request.examples.find((ex) => ex.name === 'Success (Text Data)');
      expect(textExample).toBeDefined();
      expect(textExample.request.body.mode).toBe('text');
      expect(textExample.request.body.text).toBe('Hello World');
    });

    it('should handle mixed matching and non-matching request body examples', () => {
      const openApiWithMixedMatching = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Mixed Matching'
paths:
  /users:
    post:
      summary: 'Create user'
      operationId: 'createUser'
      requestBody:
        required: true
        content:
          application/json:
            examples:
              valid_user:
                summary: 'Valid User'
                value:
                  name: 'John Doe'
                  email: 'john@example.com'
              invalid_user:
                summary: 'Invalid User'
                value:
                  name: ''
                  email: 'invalid'
      responses:
        '201':
          description: 'Created'
          content:
            application/json:
              examples:
                valid_user:
                  summary: 'User Created'
                  value:
                    id: 123
                unmatched:
                  summary: 'Unmatched Response'
                  value:
                    id: 456
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithMixedMatching);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      // Should have: 1 matched (valid_user) + 2 combinations for unmatched (unmatched × 2 request body examples) = 3
      expect(request.examples).toHaveLength(3);

      // Matched example
      const matchedExample = request.examples.find((ex) => ex.name === 'User Created');
      expect(matchedExample).toBeDefined();
      expect(JSON.parse(matchedExample.request.body.json)).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });

      // Unmatched combinations
      const unmatchedWithValid = request.examples.find((ex) => ex.name === 'Unmatched Response (Valid User)');
      expect(unmatchedWithValid).toBeDefined();

      const unmatchedWithInvalid = request.examples.find((ex) => ex.name === 'Unmatched Response (Invalid User)');
      expect(unmatchedWithInvalid).toBeDefined();
    });

    it('should not create request body when no request body is defined', () => {
      const openApiWithoutRequestBody = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API without Request Body'
paths:
  /users:
    get:
      summary: 'Get users'
      operationId: 'getUsers'
      responses:
        '200':
          description: 'OK'
          content:
            application/json:
              examples:
                success:
                  summary: 'Success'
                  value:
                    users: []
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithoutRequestBody);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      expect(request.examples).toHaveLength(1);

      const example = request.examples[0];
      expect(example.request.body.mode).toBe('none');
      expect(example.request.body.json).toBeNull();
    });

    it('should handle request body with singular example and multiple response examples', () => {
      const openApiWithSingularExample = `
openapi: '3.0.0'
info:
  version: '1.0.0'
  title: 'API with Singular Example'
paths:
  /users:
    post:
      summary: 'Create user'
      operationId: 'createUser'
      requestBody:
        required: true
        content:
          application/json:
            example:
              name: 'Jane Doe'
              email: 'jane@example.com'
      responses:
        '201':
          description: 'Created'
          content:
            application/json:
              examples:
                created:
                  summary: 'User Created'
                  value:
                    id: 1
                duplicate:
                  summary: 'Duplicate'
                  value:
                    id: 2
        '400':
          description: 'Bad Request'
          content:
            application/json:
              examples:
                error:
                  summary: 'Error'
                  value:
                    error: 'Bad request'
servers:
  - url: 'https://api.example.com'
`;

      const brunoCollection = openApiToBruno(openApiWithSingularExample);
      const request = brunoCollection.items[0];

      expect(request.examples).toBeDefined();
      expect(request.examples).toHaveLength(3);

      // All examples should have the same request body
      const requestBodyValue = { name: 'Jane Doe', email: 'jane@example.com' };
      request.examples.forEach((example) => {
        expect(example.request.body.mode).toBe('json');
        expect(JSON.parse(example.request.body.json)).toEqual(requestBodyValue);
      });
    });
  });
});
