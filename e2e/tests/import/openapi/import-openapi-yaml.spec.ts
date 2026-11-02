import { test } from '@e2e/test';
import * as path from 'path';
import { closeAllCollections, importCollection } from '@e2e/pages';

test.describe('Import OpenAPI v3 YAML Collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import comprehensive OpenAPI v3 YAML successfully', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'test-data', 'openapi-comprehensive.yaml');

    await importCollection(page, openApiFile, await createTmpDir('comprehensive-test'), {
      expectedCollectionName: 'Comprehensive API Test Collection'
    });
  });
});
