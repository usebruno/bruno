import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, importCollection } from '../../../pages';

test.describe('OpenAPI Duplicate Names Handling', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should handle duplicate operation names', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-duplicate-operation-name.yaml');

    await importCollection(page, openApiFile, await createTmpDir('duplicate-test'), {
      expectedCollectionName: 'Duplicate Test Collection'
    });

    await test.step('Verify that all 3 requests were imported correctly despite duplicate operation names', async () => {
      await expect(sidebar.collectionItemNames('Duplicate Test Collection')).toHaveCount(3);
    });
  });
});
