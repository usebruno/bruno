import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, importCollection } from '../../../pages';

test.describe('OpenAPI Newline Handling', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should handle operation names with newlines', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-newline-in-operation-name.yaml');

    await importCollection(page, openApiFile, await createTmpDir('newline-test'), {
      expectedCollectionName: 'Newline Test Collection'
    });

    await test.step('Verify that all requests were imported correctly despite newlines in operation names', async () => {
      // the parser should clean up the operation names and create valid request names
      await expect(sidebar.collectionItemNames('Newline Test Collection')).toHaveCount(2);
    });
  });
});
