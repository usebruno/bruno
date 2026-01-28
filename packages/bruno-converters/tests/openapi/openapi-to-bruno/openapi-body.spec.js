import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi requestBody with $ref', () => {
  it('should import body fields when requestBody uses $ref to components/requestBodies with inline schema (no explicit type: object)', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "RequestBody Ref Inline Schema Test"
servers:
  - url: "https://api.example.com"
paths:
  /salesInvoices:
    post:
      summary: "Creates a salesInvoice"
      operationId: "postSalesInvoice"
      requestBody:
        $ref: '#/components/requestBodies/salesInvoice'
      responses:
        '201':
          description: "A new salesInvoice has been successfully created"
components:
  requestBodies:
    salesInvoice:
      required: true
      content:
        application/json:
          schema:
            properties:
              id:
                type: string
                format: uuid
              number:
                type: string
                maxLength: 20
              externalDocumentNumber:
                type: string
                maxLength: 35
              invoiceDate:
                type: string
                format: date-time
              dueDate:
                type: string
                format: date-time
              fees:
                type: array
                items:
                  $ref: '#/components/requestBodies/fees'
    fees:
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          maxLength: 50
        amount:
          type: number
      required:
       - id
       - amount
`;

    const result = openApiToBruno(openApiSpec);

    // Should have one request item
    expect(result.items.length).toBe(1);
    const request = result.items[0];

    // Body mode should be json
    expect(request.request.body.mode).toBe('json');

    // Body should contain the properties from the schema
    expect(request.request.body.json).not.toBeNull();

    const bodyJson = JSON.parse(request.request.body.json);
    expect(bodyJson).toHaveProperty('id');
    expect(bodyJson).toHaveProperty('number');
    expect(bodyJson).toHaveProperty('externalDocumentNumber');
    expect(bodyJson).toHaveProperty('invoiceDate');
    expect(bodyJson).toHaveProperty('dueDate');
    expect(bodyJson).toHaveProperty('fees');
    expect(bodyJson['fees'][0]).toHaveProperty('id');
  });

  it('should import formUrlEncoded body when requestBody uses $ref with inline schema', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Form URL Encoded Ref Test"
servers:
  - url: "https://api.example.com"
paths:
  /login:
    post:
      summary: "Login"
      operationId: "login"
      requestBody:
        $ref: '#/components/requestBodies/loginForm'
      responses:
        '200':
          description: "Login successful"
components:
  requestBodies:
    loginForm:
      required: true
      content:
        application/x-www-form-urlencoded:
          schema:
            properties:
              username:
                type: string
              password:
                type: string
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('formUrlEncoded');
    expect(request.request.body.formUrlEncoded.length).toBe(2);

    const fieldNames = request.request.body.formUrlEncoded.map((f) => f.name);
    expect(fieldNames).toContain('username');
    expect(fieldNames).toContain('password');
  });

  it('should import multipartForm body when requestBody uses $ref with inline schema', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Multipart Form Ref Test"
servers:
  - url: "https://api.example.com"
paths:
  /upload:
    post:
      summary: "Upload file"
      operationId: "uploadFile"
      requestBody:
        $ref: '#/components/requestBodies/fileUpload'
      responses:
        '200':
          description: "Upload successful"
components:
  requestBodies:
    fileUpload:
      required: true
      content:
        multipart/form-data:
          schema:
            properties:
              file:
                type: string
                format: binary
              description:
                type: string
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('multipartForm');
    expect(request.request.body.multipartForm.length).toBe(2);

    const fieldNames = request.request.body.multipartForm.map((f) => f.name);
    expect(fieldNames).toContain('file');
    expect(fieldNames).toContain('description');
  });

  it('should handle number and integer types with correct default values', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Number Type Test"
servers:
  - url: "https://api.example.com"
paths:
  /orders:
    post:
      summary: "Create order"
      operationId: "createOrder"
      requestBody:
        content:
          application/json:
            schema:
              properties:
                quantity:
                  type: integer
                price:
                  type: number
                discount:
                  type: number
                name:
                  type: string
                active:
                  type: boolean
      responses:
        '201':
          description: "Order created"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('json');
    expect(request.request.body.json).not.toBeNull();

    const bodyJson = JSON.parse(request.request.body.json);

    // integer type should be 0
    expect(bodyJson.quantity).toBe(0);

    // number type should be 0 (not empty string)
    expect(bodyJson.price).toBe(0);
    expect(bodyJson.discount).toBe(0);

    // string type should be empty string
    expect(bodyJson.name).toBe('');

    // boolean type should be false
    expect(bodyJson.active).toBe(false);
  });
});

describe('openapi requestBody content types', () => {
  it('should handle raw body with */* content type as text', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Raw Body Test"
servers:
  - url: "https://api.example.com"
paths:
  /raw:
    post:
      summary: "Raw body endpoint"
      operationId: "postRaw"
      requestBody:
        required: true
        content:
          "*/*":
            schema:
              type: string
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('text');
    expect(request.request.body.text).toBe('');
  });

  it('should handle binary body with application/octet-stream as text', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Binary Body Test"
servers:
  - url: "https://api.example.com"
paths:
  /binary:
    post:
      summary: "Binary body endpoint"
      operationId: "postBinary"
      requestBody:
        required: true
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('text');
    expect(request.request.body.text).toBe('');
  });

  it('should handle XML body with application/xml content type', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "XML Body Test"
servers:
  - url: "https://api.example.com"
paths:
  /xml:
    post:
      summary: "XML body endpoint"
      operationId: "postXml"
      requestBody:
        required: true
        content:
          application/xml:
            schema:
              type: object
              properties:
                name:
                  type: string
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('xml');
    expect(request.request.body.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(request.request.body.xml).toContain('<name></name>');
  });

  it('should handle XML body with text/xml content type', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Text XML Body Test"
servers:
  - url: "https://api.example.com"
paths:
  /xml:
    post:
      summary: "XML body endpoint"
      operationId: "postXml"
      requestBody:
        required: true
        content:
          text/xml:
            schema:
              type: object
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('xml');
  });

  it('should handle SPARQL query with application/sparql-query content type', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "SPARQL Query Test"
servers:
  - url: "https://api.example.com"
paths:
  /sparql:
    post:
      summary: "SPARQL query endpoint"
      operationId: "postSparql"
      requestBody:
        required: true
        content:
          application/sparql-query:
            schema:
              type: string
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('sparql');
    expect(request.request.body.sparql).toBe('');
  });

  it('should handle text/plain content type', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Text Plain Test"
servers:
  - url: "https://api.example.com"
paths:
  /text:
    post:
      summary: "Text body endpoint"
      operationId: "postText"
      requestBody:
        required: true
        content:
          text/plain:
            schema:
              type: string
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('text');
    expect(request.request.body.text).toBe('');
  });

  it('should detect file fields in multipart/form-data based on format: binary', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Multipart File Detection Test"
servers:
  - url: "https://api.example.com"
paths:
  /upload:
    post:
      summary: "Upload with file and text fields"
      operationId: "uploadFile"
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: "The file to upload"
                description:
                  type: string
                  description: "File description"
                userId:
                  type: integer
                  description: "User ID"
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('multipartForm');
    expect(request.request.body.multipartForm.length).toBe(3);

    // Find the file field
    const fileField = request.request.body.multipartForm.find((f) => f.name === 'file');
    expect(fileField).toBeDefined();
    expect(fileField.type).toBe('file');
    expect(fileField.value).toEqual([]); // File fields should have array value

    // Find the text fields
    const descField = request.request.body.multipartForm.find((f) => f.name === 'description');
    expect(descField).toBeDefined();
    expect(descField.type).toBe('text');
    expect(descField.value).toBe(''); // Text fields should have string value

    const userIdField = request.request.body.multipartForm.find((f) => f.name === 'userId');
    expect(userIdField).toBeDefined();
    expect(userIdField.type).toBe('text');
    expect(userIdField.value).toBe('');
  });

  it('should handle JSON variants like application/ld+json', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "JSON-LD Test"
servers:
  - url: "https://api.example.com"
paths:
  /jsonld:
    post:
      summary: "JSON-LD endpoint"
      operationId: "postJsonLd"
      requestBody:
        required: true
        content:
          application/ld+json:
            schema:
              type: object
              properties:
                "@context":
                  type: string
                name:
                  type: string
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('json');
    expect(request.request.body.json).not.toBeNull();
  });

  it('should handle XML variants like application/atom+xml', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Atom XML Test"
servers:
  - url: "https://api.example.com"
paths:
  /feed:
    post:
      summary: "Atom feed endpoint"
      operationId: "postFeed"
      requestBody:
        required: true
        content:
          application/atom+xml:
            schema:
              type: object
      responses:
        '200':
          description: "Success"
`;

    const result = openApiToBruno(openApiSpec);

    expect(result.items.length).toBe(1);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('xml');
  });
});

describe('openapi example request body - should match main request body handling', () => {
  const bodyTypesOpenApiSpec = `
openapi: 3.1.0
info:
  title: Body Types Demo API
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /raw-body:
    post:
      summary: Raw body
      requestBody:
        content:
          "*/*":
            schema:
              type: string
      responses:
        "200":
          description: Success
  /json-body:
    post:
      summary: JSON body
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  example: "John"
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
  /xml-body:
    post:
      summary: XML body
      requestBody:
        content:
          application/xml:
            schema:
              type: object
              xml:
                name: Root
              properties:
                name:
                  type: string
      responses:
        "200":
          description: Success
  /multipart-body:
    post:
      summary: Multipart body
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                desc:
                  type: string
      responses:
        "200":
          description: Success
  /form-body:
    post:
      summary: Form body
      requestBody:
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              properties:
                query:
                  type: string
                page:
                  type: integer
                  default: 1
      responses:
        "200":
          description: Success
  /sparql-body:
    post:
      summary: SPARQL body
      requestBody:
        content:
          application/sparql-query:
            schema:
              type: string
              example: "SELECT * WHERE { ?s ?p ?o }"
      responses:
        "200":
          description: Success
`;

  it('should match body mode between request and example for all content types', () => {
    const result = openApiToBruno(bodyTypesOpenApiSpec);
    const tests = [
      { name: 'Raw body', mode: 'text' },
      { name: 'JSON body', mode: 'json' },
      { name: 'XML body', mode: 'xml' },
      { name: 'Multipart body', mode: 'multipartForm' },
      { name: 'Form body', mode: 'formUrlEncoded' },
      { name: 'SPARQL body', mode: 'sparql' }
    ];

    tests.forEach(({ name, mode }) => {
      const request = result.items.find((item) => item.name === name);
      expect(request.request.body.mode).toBe(mode);
      expect(request.examples[0].request.body.mode).toBe(mode);
    });
  });

  it('should generate proper XML in example (not JSON)', () => {
    const result = openApiToBruno(bodyTypesOpenApiSpec);
    const xmlRequest = result.items.find((item) => item.name === 'XML body');

    expect(xmlRequest.examples[0].request.body.xml).toContain('<?xml');
    expect(xmlRequest.examples[0].request.body.xml).toContain('<Root');
    expect(xmlRequest.examples[0].request.body.xml).not.toContain('{');
  });

  it('should detect file fields in multipart example', () => {
    const result = openApiToBruno(bodyTypesOpenApiSpec);
    const multipartRequest = result.items.find((item) => item.name === 'Multipart body');
    const fileField = multipartRequest.examples[0].request.body.multipartForm.find((f) => f.name === 'file');
    expect(fileField.type).toBe('file');
  });

  it('should use default values in form example', () => {
    const result = openApiToBruno(bodyTypesOpenApiSpec);
    const formRequest = result.items.find((item) => item.name === 'Form body');
    const pageField = formRequest.examples[0].request.body.formUrlEncoded.find((f) => f.name === 'page');
    expect(pageField.value).toBe('1');
  });

  it('should use example and enum values from schema in request body', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Test"
servers:
  - url: "https://api.example.com"
paths:
  /test:
    post:
      summary: "Test"
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  example: "John"
                status:
                  type: string
                  enum: [active, inactive]
      responses:
        "200":
          description: "OK"
`;
    const result = openApiToBruno(openApiSpec);
    const bodyJson = JSON.parse(result.items[0].request.body.json);
    expect(bodyJson.name).toBe('John');
    expect(bodyJson.status).toBe('active');
  });

  it('should use schema example values in main request body (not just examples)', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Schema Example Values Test"
servers:
  - url: "https://api.example.com"
paths:
  /users:
    post:
      summary: "Create user"
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: integer
                  example: 9007199254740991
                name:
                  type: string
                  example: "example string"
                email:
                  type: string
                  format: email
                  example: "user@example.com"
                status:
                  type: string
                  enum: [pending, active, inactive]
                createdDate:
                  type: string
                  format: date
                  example: "2025-01-01"
                score:
                  type: number
                  example: 3.1415926535
      responses:
        "201":
          description: "Created"
`;
    const result = openApiToBruno(openApiSpec);
    const request = result.items[0];

    // Main request body should use example values from schema
    const bodyJson = JSON.parse(request.request.body.json);
    expect(bodyJson.id).toBe(9007199254740991);
    expect(bodyJson.name).toBe('example string');
    expect(bodyJson.email).toBe('user@example.com');
    expect(bodyJson.status).toBe('pending'); // first enum value
    expect(bodyJson.createdDate).toBe('2025-01-01');
    expect(bodyJson.score).toBe(3.1415926535);
  });

  it('should handle XML body with object example (not produce [object Object])', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "XML Object Example Test"
servers:
  - url: "https://api.example.com"
paths:
  /user:
    post:
      summary: "Create user"
      operationId: "createUser"
      requestBody:
        required: true
        content:
          application/xml:
            schema:
              type: object
              example:
                name: "John"
                age: 30
              properties:
                name:
                  type: string
                age:
                  type: integer
      responses:
        "201":
          description: "Created"
`;
    const result = openApiToBruno(openApiSpec);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('xml');
    // Should NOT contain [object Object]
    expect(request.request.body.xml).not.toContain('[object Object]');
    // Should contain the example values
    expect(request.request.body.xml).toContain('<name>John</name>');
    expect(request.request.body.xml).toContain('<age>30</age>');
  });

  it('should handle XML body with string example (raw XML)', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "XML String Example Test"
servers:
  - url: "https://api.example.com"
paths:
  /user:
    post:
      summary: "Create user"
      operationId: "createUser"
      requestBody:
        required: true
        content:
          application/xml:
            schema:
              type: string
              example: '<user><name>John</name></user>'
      responses:
        "201":
          description: "Created"
`;
    const result = openApiToBruno(openApiSpec);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('xml');
    // Should preserve the raw XML string
    expect(request.request.body.xml).toBe('<user><name>John</name></user>');
  });

  it('should not crash when array schema has no items defined', () => {
    const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Array Without Items Test"
servers:
  - url: "https://api.example.com"
paths:
  /items:
    post:
      summary: "Create items"
      operationId: "createItems"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
      responses:
        "201":
          description: "Created"
`;
    // Should not throw an error
    expect(() => openApiToBruno(openApiSpec)).not.toThrow();

    const result = openApiToBruno(openApiSpec);
    const request = result.items[0];

    expect(request.request.body.mode).toBe('json');
    // Should produce an empty array
    expect(request.request.body.json).toBe('[]');
  });
});
