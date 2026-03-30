import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

/**
 * Integration test: verifies that Swagger 2.0 specs are correctly routed
 * through openApiToBruno to the dedicated swagger2ToBruno converter.
 *
 * Detailed feature tests live in tests/openapi/swagger2-to-bruno/.
 */
describe('Swagger 2.0 → Bruno integration (via openApiToBruno entry point)', () => {
  it('should route Swagger 2.0 JSON specs through the dedicated converter', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Petstore', version: '1.0.0' },
      host: 'petstore.swagger.io',
      basePath: '/v2',
      schemes: ['https'],
      paths: {
        '/pet': {
          get: {
            tags: ['pet'],
            summary: 'List pets',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = openApiToBruno(spec);
    expect(collection).toBeDefined();
    expect(collection.name).toBe('Petstore');
    expect(collection.version).toBe('1');
  });

  it('should accept YAML string input for Swagger 2.0', () => {
    const yamlSpec = `
swagger: "2.0"
info:
  title: YAML Petstore
  version: "1.0"
host: api.example.com
basePath: /v1
schemes:
  - https
paths:
  /pets:
    get:
      summary: List pets
      responses:
        "200":
          description: OK
`;
    const collection = openApiToBruno(yamlSpec);
    expect(collection.name).toBe('YAML Petstore');
    expect(collection.environments.length).toBeGreaterThan(0);
  });

  it('should not confuse Swagger 2.0 with OpenAPI 3.0 specs', () => {
    const oas3Spec = {
      openapi: '3.0.0',
      info: { title: 'OAS3 API', version: '1.0' },
      paths: {
        '/test': {
          get: { summary: 'Test', responses: { 200: { description: 'OK' } } }
        }
      }
    };
    const collection = openApiToBruno(oas3Spec);
    expect(collection).toBeDefined();
    expect(collection.name).toBe('OAS3 API');
  });
});
