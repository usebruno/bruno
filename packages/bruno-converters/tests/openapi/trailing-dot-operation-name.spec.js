import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../src/openapi/openapi-to-bruno';

const buildOpenApiSpec = (paths) => ({
  openapi: '3.0.0',
  info: { title: 'Petstore' },
  servers: [{ url: 'https://api.example.com' }],
  paths
});

const buildSwaggerSpec = (paths) => ({
  swagger: '2.0',
  info: { title: 'Petstore' },
  host: 'api.example.com',
  basePath: '/v2',
  schemes: ['https'],
  paths
});

// A name ending in a dot becomes `<name>..bru` on disk, because the import writers append
// the extension before the filesystem sanitizer trims trailing dots. That filename then
// disagrees with the name-derived path the app computes, producing a duplicate request.
describe.each([
  ['OpenAPI 3', buildOpenApiSpec],
  ['Swagger 2', buildSwaggerSpec]
])('%s trailing-dot operation names', (_label, buildSpec) => {
  it('strips a trailing period from the summary', () => {
    const collection = openApiToBruno(
      buildSpec({
        '/pet': {
          post: { summary: 'Add a new pet to the store.', responses: {} }
        }
      })
    );

    expect(collection.items.map((item) => item.name)).toEqual(['Add a new pet to the store']);
  });

  it('strips trailing dot runs and trailing whitespace', () => {
    const collection = openApiToBruno(
      buildSpec({
        '/pet': {
          post: { summary: 'Add a pet...  ', responses: {} }
        },
        '/store': {
          post: { summary: '  Place an order .', responses: {} }
        }
      })
    );

    expect(collection.items.map((item) => item.name).sort()).toEqual(['Add a pet', 'Place an order']);
  });

  it('deduplicates summaries that differ only by a trailing period instead of colliding', () => {
    const collection = openApiToBruno(
      buildSpec({
        '/pet': {
          post: { summary: 'Add a new pet to the store.', responses: {} },
          get: { summary: 'Add a new pet to the store', responses: {} }
        }
      })
    );

    const names = collection.items.map((item) => item.name);
    expect(new Set(names).size).toBe(2);
    expect(names).toContain('Add a new pet to the store');
    expect(names).toContain('Add a new pet to the store (GET)');
  });

  it('falls back to the method and path when the summary is only dots and whitespace', () => {
    const collection = openApiToBruno(
      buildSpec({
        '/pet': {
          post: { summary: ' ... ', responses: {} }
        }
      })
    );

    expect(collection.items.map((item) => item.name)).toEqual(['post /pet']);
  });

  it('leaves interior dots and names without a trailing dot untouched', () => {
    const collection = openApiToBruno(
      buildSpec({
        '/pet': {
          post: { summary: 'Add pet v1.2 to the store', responses: {} }
        }
      })
    );

    expect(collection.items.map((item) => item.name)).toEqual(['Add pet v1.2 to the store']);
  });
});
