import { test, expect } from '../../../../playwright';
import path from 'path';
import { importOpenApiWithCli } from '../../../utils/cli';

const fixture = (name: string) => path.resolve(__dirname, '../fixtures', name);

const importSpec = async (createTmpDir: (tag?: string) => Promise<string>, specPath: string, flags: string[]) =>
  importOpenApiWithCli(specPath, path.join(await createTmpDir('openapi-collection-auth-cli'), 'collection.json'), flags);

const authModes = (collection) => Object.fromEntries(collection.items.map((item) => [item.name, item.request.auth.mode]));

test.describe('CLI: OpenAPI import with --auth-placement', () => {
  test('puts the security scheme on the collection with --auth-placement collection', async ({ createTmpDir }) => {
    const collection = await importSpec(createTmpDir, fixture('openapi-collection-auth-placement.yaml'), ['--auth-placement', 'collection']);

    expect(collection.root.request.auth.mode).toBe('bearer');
    expect(authModes(collection)).toEqual({ 'List orders': 'inherit', 'Admin reports': 'basic', 'Health check': 'none' });
  });

  test('keeps the auth on each request by default and with --auth-placement request', async ({ createTmpDir }) => {
    const requestAuthModes = { 'List orders': 'bearer', 'Admin reports': 'basic', 'Health check': 'none' };

    expect(authModes(await importSpec(createTmpDir, fixture('openapi-collection-auth-placement.yaml'), []))).toEqual(requestAuthModes);
    expect(authModes(await importSpec(createTmpDir, fixture('openapi-collection-auth-placement.yaml'), ['--auth-placement', 'request']))).toEqual(requestAuthModes);
  });

  test('applies --auth-placement collection to a Swagger 2.0 spec', async ({ createTmpDir }) => {
    const collection = await importSpec(createTmpDir, fixture('swagger2-collection-auth-placement.yaml'), ['--auth-placement', 'collection']);

    expect(collection.root.request.auth.mode).toBe('apikey');
    expect(authModes(collection)).toEqual({ 'List orders': 'inherit', 'Admin reports': 'basic', 'Health check': 'none' });
  });

  test('rejects an unknown placement', async ({ createTmpDir }) => {
    await expect(importSpec(createTmpDir, fixture('openapi-collection-auth-placement.yaml'), ['--auth-placement', 'folder'])).rejects.toThrow(/Invalid values/);
  });
});
