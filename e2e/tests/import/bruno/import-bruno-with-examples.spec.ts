import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, importCollection } from '../../../pages';

test.describe('Import Bruno Collection with Examples', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Bruno collection with examples successfully', async ({ page, createTmpDir }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-with-examples.json');
    const collectionName = 'bruno-with-examples';
    const { sidebar } = buildCommonLocators(page);

    await test.step('Import the collection', async () => {
      await importCollection(page, brunoFile, await createTmpDir('bruno-with-examples'), {
        expectedCollectionName: collectionName
      });
    });

    await test.step('Verify the request keeps its example', async () => {
      await expect(sidebar.itemRowIn(collectionName, 'echo-request')).toBeVisible();
      await sidebar.requestExamplesToggleIn(collectionName, 'echo-request').click();
      await expect(sidebar.exampleIn(collectionName, 'example')).toBeVisible();
    });
  });
});
