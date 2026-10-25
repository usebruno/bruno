const { describe, it, expect } = require('@jest/globals');
import { getOpenApiSpecError } from './utils';

describe('getOpenApiSpecError', () => {
  it('accepts an OpenAPI 3.x document', () => {
    expect(getOpenApiSpecError({ openapi: '3.0.0', info: { title: 'Pets' }, paths: {} })).toBeNull();
  });

  it('rejects a document that is not an OpenAPI spec', () => {
    expect(getOpenApiSpecError({ name: 'not a spec' })).toBe(
      'The selected file is not a valid OpenAPI 3.x specification'
    );
  });

  it('rejects a spec that failed to parse', () => {
    expect(getOpenApiSpecError(null)).toBe('The selected file is not a valid OpenAPI 3.x specification');
  });

  it('rejects Swagger 2.0 with a conversion hint', () => {
    expect(getOpenApiSpecError({ swagger: '2.0', info: { title: 'Pets' }, paths: {} })).toBe(
      'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.'
    );
  });
});
