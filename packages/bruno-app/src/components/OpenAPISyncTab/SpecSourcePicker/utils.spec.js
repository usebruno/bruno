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
