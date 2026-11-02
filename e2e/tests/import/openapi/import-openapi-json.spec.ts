import { test } from '@e2e/test';
import * as path from 'path';
import { closeAllCollections, importCollection } from '@e2e/pages';

test.describe('Import OpenAPI v3 JSON Collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import simple OpenAPI v3 JSON successfully', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'test-data', 'openapi-simple.json');

    await importCollection(page, openApiFile, await createTmpDir('simple-test'), {
      expectedCollectionName: 'Simple Test API'
    });
  });
});
