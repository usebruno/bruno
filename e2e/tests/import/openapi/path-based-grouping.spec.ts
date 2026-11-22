import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, expandFolderIn, importCollection } from '../../../pages';

test.describe('OpenAPI Path-Based Grouping', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should import with path-based folder grouping', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const collectionName = 'Path Grouping Test API';
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-path-grouping.json');

    await importCollection(page, openApiFile, await createTmpDir('path-grouping-test'), {
      expectedCollectionName: collectionName,
      groupBy: 'path'
    });

    await test.step('Verify path-based folder structure was created', async () => {
      await expect(sidebar.itemsIn(collectionName, 'users')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'products')).toBeVisible();
    });

    await test.step('Verify that the products folder contains the {id} subfolder', async () => {
      await expandFolderIn(page, collectionName, 'products');

      await expect(sidebar.folderItemNames(collectionName, 'products')).toContainText(['{id}']);
    });
  });
});
