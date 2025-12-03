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
  });
});
