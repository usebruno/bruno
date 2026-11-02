import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

const getBodyJson = (openApiSpec) => {
  const result = openApiToBruno(openApiSpec);
  expect(result.items.length).toBe(1);
  const request = result.items[0];
  expect(request.request.body.mode).toBe('json');
  expect(request.request.body.json).not.toBeNull();
  return JSON.parse(request.request.body.json);
};

describe('openapi composed schemas (oneOf / anyOf / allOf)', () => {
  it('should generate a body from the first alternative of a oneOf schema', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "oneOf Test"
servers:
  - url: "https://api.example.com"
paths:
  /pets:
    post:
      summary: "Create a pet"
      operationId: "createPet"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/Cat'
                - $ref: '#/components/schemas/Dog'
      responses:
        '201':
          description: "Created"
components:
  schemas:
    Cat:
      type: object
      properties:
        name:
          type: string
        whiskerCount:
          type: integer
    Dog:
      type: object
      properties:
        name:
          type: string
        barkVolume:
          type: integer
`;
    const body = getBodyJson(openApiSpec);
    // first alternative (Cat) wins
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('whiskerCount');
    expect(body).not.toHaveProperty('barkVolume');
  });

  it('should generate a body from the first alternative of an anyOf schema', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "anyOf Test"
servers:
  - url: "https://api.example.com"
paths:
  /search:
    post:
      summary: "Search"
      operationId: "search"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              anyOf:
                - type: object
                  properties:
                    query:
                      type: string
                    limit:
                      type: integer
                - type: object
                  properties:
                    cursor:
                      type: string
      responses:
        '200':
          description: "OK"
`;
    const body = getBodyJson(openApiSpec);
    expect(body).toHaveProperty('query');
    expect(body).toHaveProperty('limit');
    expect(body).not.toHaveProperty('cursor');
  });

  it('should merge properties of allOf parts (later parts win on conflicts), including $ref parts', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "allOf Test"
servers:
  - url: "https://api.example.com"
paths:
  /users:
    post:
      summary: "Create user"
      operationId: "createUser"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              allOf:
                - $ref: '#/components/schemas/Base'
                - type: object
                  properties:
                    email:
                      type: string
      responses:
        '201':
          description: "Created"
components:
  schemas:
    Base:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
`;
    const body = getBodyJson(openApiSpec);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('email');
  });

  it('should handle nested composition (oneOf inside allOf)', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Nested Test"
servers:
  - url: "https://api.example.com"
paths:
  /orders:
    post:
      summary: "Create order"
      operationId: "createOrder"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              allOf:
                - type: object
                  properties:
                    orderId:
                      type: string
                - oneOf:
                    - $ref: '#/components/schemas/CardPayment'
                    - $ref: '#/components/schemas/CashPayment'
      responses:
        '201':
          description: "Created"
components:
  schemas:
    CardPayment:
      type: object
      properties:
        cardNumber:
          type: string
    CashPayment:
      type: object
      properties:
        cashTendered:
          type: number
`;
    const body = getBodyJson(openApiSpec);
    expect(body).toHaveProperty('orderId');
    expect(body).toHaveProperty('cardNumber');
    expect(body).not.toHaveProperty('cashTendered');
  });

  it('should prefer explicit examples over composition', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Explicit Example Test"
servers:
  - url: "https://api.example.com"
paths:
  /pets:
    post:
      summary: "Create a pet"
      operationId: "createPet"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - type: object
                  properties:
                    name:
                      type: string
              example:
                name: "explicit-fluffy"
      responses:
        '201':
          description: "Created"
`;
    const body = getBodyJson(openApiSpec);
    expect(body).toEqual({ name: 'explicit-fluffy' });
  });

  it('should generate response examples from oneOf schemas', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Response oneOf Test"
servers:
  - url: "https://api.example.com"
paths:
  /pets:
    get:
      summary: "Get a pet"
      operationId: "getPet"
      responses:
        '200':
          description: "A pet"
          content:
            application/json:
              schema:
                oneOf:
                  - type: object
                    properties:
                      name:
                        type: string
                  - type: object
                    properties:
                      tag:
                        type: string
`;
    const result = openApiToBruno(openApiSpec);
    expect(result.items.length).toBe(1);
    const request = result.items[0];
    expect(request.examples).toBeDefined();
    expect(request.examples.length).toBeGreaterThan(0);
    const exampleBody = JSON.parse(request.examples[0].response.body.content);
    expect(exampleBody).toHaveProperty('name');
    expect(exampleBody).not.toHaveProperty('tag');
  });
});
