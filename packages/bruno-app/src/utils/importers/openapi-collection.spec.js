import { isOpenApiSpec } from './openapi-collection';

describe('isOpenApiSpec', () => {
  it.each([
    ['OpenAPI 3.0', { openapi: '3.0.3', info: { title: 'A' } }],
    ['OpenAPI 3.1', { openapi: '3.1.0', info: { title: 'A' } }],
    ['Swagger 2.0', { swagger: '2.0', info: { title: 'A' } }]
  ])('accepts %s', (_, doc) => {
    expect(isOpenApiSpec(doc)).toBe(true);
  });

  it.each([
    ['null (unparseable file)', null],
    ['empty object', {}],
    ['missing info block', { openapi: '3.0.0' }],
    ['numeric version', { openapi: 3, info: {} }],
    ['blank version', { openapi: '   ', info: {} }],
    ['a Postman collection', { info: { name: 'P', schema: 'https://schema.getpostman.com' }, item: [] }],
    ['a string', 'openapi: 3.0.0']
  ])('rejects %s', (_, doc) => {
    expect(isOpenApiSpec(doc)).toBe(false);
  });
});
