import { test, expect } from '../../../../playwright';
import path from 'path';
import { importOpenApiWithCli } from '../../../utils/cli';

const specPath = path.resolve(__dirname, '../fixtures/openapi-request-naming.yaml');

const importedNames = async (createTmpDir: (tag?: string) => Promise<string>, flags: string[]) =>
  importOpenApiWithCli(specPath, path.join(await createTmpDir('openapi-request-name-source-cli'), 'collection.json'), flags).items.map((item) => item.name);

test.describe('CLI: OpenAPI import with --request-name-source', () => {
  test('names requests from the summary by default', async ({ createTmpDir }) => {
    expect(await importedNames(createTmpDir, [])).toEqual(['Find pet by ID', 'listPets', 'Adds a pet to the store', 'GET /health']);
  });

  test('names requests from the chosen field, falling back where it is missing', async ({ createTmpDir }) => {
    expect(await importedNames(createTmpDir, ['--request-name-source', 'operationId'])).toEqual(['getPetById', 'listPets', 'Adds a pet to the store', 'GET /health']);
    expect(await importedNames(createTmpDir, ['--request-name-source', 'description'])).toEqual(['Returns a single pet', 'Lists every pet in the store', 'Adds a pet to the store', 'GET /health']);
    expect(await importedNames(createTmpDir, ['--request-name-source', 'path'])).toEqual(['GET /pets/{petId}', 'GET /pets', 'POST /pets', 'GET /health']);
  });

  test('rejects an unknown source', async ({ createTmpDir }) => {
    await expect(importedNames(createTmpDir, ['--request-name-source', 'title'])).rejects.toThrow(/Invalid values/);
  });
});
