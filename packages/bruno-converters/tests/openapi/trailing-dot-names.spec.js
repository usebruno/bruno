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

// Environment names come from a server's name or description, and become the environment's
// filename the same way. Swagger 2 is not covered here because it labels environments
// positionally (`Environment 1`, `Environment 2`) rather than from spec text.
describe('OpenAPI 3 trailing-dot environment names', () => {
  const buildSpecWithServers = (servers) => ({
    openapi: '3.0.0',
    info: { title: 'Petstore' },
    servers,
    paths: {
      '/pet': {
        get: { summary: 'Get a pet', responses: {} }
      }
    }
  });

  const environmentNamesOf = (servers) =>
    openApiToBruno(buildSpecWithServers(servers)).environments.map((env) => env.name);

  it('strips a trailing period from a server description', () => {
    expect(environmentNamesOf([{ url: 'https://a.example.com', description: 'Production server.' }]))
      .toEqual(['Production server']);
  });

  it('strips a trailing period from a server name', () => {
    expect(environmentNamesOf([{ url: 'https://a.example.com', name: 'Production.' }]))
      .toEqual(['Production']);
  });

  it('keeps servers whose descriptions differ only by a trailing period apart', () => {
    expect(environmentNamesOf([
      { url: 'https://a.example.com', description: 'Production server.' },
      { url: 'https://b.example.com', description: 'Production server' }
    ])).toEqual(['Production server', 'Production server (2)']);
  });

  it('keeps servers sharing an identical description apart instead of overwriting', () => {
    expect(environmentNamesOf([
      { url: 'https://a.example.com', description: 'Staging server' },
      { url: 'https://b.example.com', description: 'Staging server' },
      { url: 'https://c.example.com', description: 'Staging server' }
    ])).toEqual(['Staging server', 'Staging server (2)', 'Staging server (3)']);
  });

  it('preserves every server as its own environment', () => {
    const servers = [
      { url: 'https://a.example.com', description: 'Production server.' },
      { url: 'https://b.example.com', description: 'Production server' },
      { url: 'https://c.example.com', description: 'Staging server' },
      { url: 'https://d.example.com', description: 'Staging server' }
    ];
    const environments = openApiToBruno(buildSpecWithServers(servers)).environments;

    expect(environments).toHaveLength(4);
    expect(new Set(environments.map((env) => env.name)).size).toBe(4);
    expect(environments.map((env) => env.variables.find((v) => v.name === 'baseUrl')?.value))
      .toEqual(servers.map((server) => server.url));
  });

  it('falls back to a positional name when the description is only dots and whitespace', () => {
    expect(environmentNamesOf([{ url: 'https://a.example.com', description: ' ... ' }]))
      .toEqual(['Environment 1']);
  });

  it('leaves interior dots in a server description untouched', () => {
    expect(environmentNamesOf([{ url: 'https://a.example.com', description: 'Prod v1.2' }]))
      .toEqual(['Prod v1.2']);
  });
});
