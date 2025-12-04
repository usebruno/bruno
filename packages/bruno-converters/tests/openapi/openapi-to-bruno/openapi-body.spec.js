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
});
