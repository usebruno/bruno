const { describe, it, expect } = require('@jest/globals');
import { getOpenApiSpecError, isSpecSourceReady } from './utils';

describe('getOpenApiSpecError', () => {
  it('accepts an OpenAPI 3.x document', () => {
    expect(getOpenApiSpecError({ openapi: '3.0.0', info: { title: 'Pets' }, paths: {} })).toBeNull();
  });

  it('rejects a document that is not an OpenAPI spec', () => {
    expect(getOpenApiSpecError({ name: 'not a spec' })).toBe(
      'The selected spec is not a valid OpenAPI 3.x specification'
    );
  });

  it('rejects a spec that failed to parse', () => {
    expect(getOpenApiSpecError(null)).toBe('The selected spec is not a valid OpenAPI 3.x specification');
  });

  it('rejects OpenAPI versions other than 3.x', () => {
    expect(getOpenApiSpecError({ openapi: '2.0', info: { title: 'Pets' }, paths: {} })).toBe(
      'The selected spec is not a valid OpenAPI 3.x specification'
    );
    expect(getOpenApiSpecError({ openapi: '4.0.0', info: { title: 'Pets' }, paths: {} })).toBe(
      'The selected spec is not a valid OpenAPI 3.x specification'
    );
  });

  it('rejects an OpenAPI 3.x document without paths', () => {
    expect(getOpenApiSpecError({ openapi: '3.0.0', info: { title: 'Pets' } })).toBe(
      'The selected spec is not a valid OpenAPI 3.x specification'
    );
  });

  it('rejects an OpenAPI 3.x document without an info object', () => {
    expect(getOpenApiSpecError({ openapi: '3.0.0', paths: {} })).toBe(
      'The selected spec is not a valid OpenAPI 3.x specification'
    );
  });

  it('rejects any Swagger version', () => {
    expect(getOpenApiSpecError({ swagger: '1.2', info: { title: 'Pets' }, paths: {} })).toBe(
      'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.'
    );
  });

  it('rejects Swagger 2.0 with a conversion hint', () => {
    expect(getOpenApiSpecError({ swagger: '2.0', info: { title: 'Pets' }, paths: {} })).toBe(
      'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.'
    );
  });
});

describe('isSpecSourceReady', () => {
  const workspaceSpecs = [{ uid: 'pets', pathname: '/ws/specs/pets.yaml' }];

  it('needs a workspace spec that is still in the workspace', () => {
    expect(isSpecSourceReady('workspace', '/ws/specs/pets.yaml', workspaceSpecs)).toBe(true);
    expect(isSpecSourceReady('workspace', '/ws/specs/removed.yaml', workspaceSpecs)).toBe(false);
    expect(isSpecSourceReady('workspace', '', workspaceSpecs)).toBe(false);
  });

  it('needs an http URL', () => {
    expect(isSpecSourceReady('url', ' https://api.example.com/openapi.json ', workspaceSpecs)).toBe(true);
    expect(isSpecSourceReady('url', 'not a url', workspaceSpecs)).toBe(false);
  });

  it('needs a chosen file', () => {
    expect(isSpecSourceReady('file', '/outside/spec.yaml', workspaceSpecs)).toBe(true);
    expect(isSpecSourceReady('file', '  ', workspaceSpecs)).toBe(false);
  });
});
