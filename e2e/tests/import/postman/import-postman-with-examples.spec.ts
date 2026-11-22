import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection, buildCommonLocators } from '../../../pages';

test.describe('Import Postman Collection with Examples', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import Postman collection with examples successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-examples.json');
    const collectionName = 'collection with examples';
    const { sidebar } = buildCommonLocators(page);
    const importDir = await createTmpDir('imported-collection');

    await importCollection(page, postmanFile, importDir, { expectedCollectionName: collectionName });

    await test.step('Verify collection name appears in sidebar', async () => {
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });

    await test.step('Verify request exists in the collection', async () => {
      await expect(sidebar.itemsIn(collectionName, 'New Request')).toBeVisible();
    });

    await test.step('Click chevron to expand examples', async () => {
      await expect(sidebar.requestExamplesToggleIn(collectionName, 'New Request')).toBeVisible();
      await sidebar.requestExamplesToggleIn(collectionName, 'New Request').click();
    });

    await test.step('Verify both examples are visible', async () => {
      await expect(sidebar.exampleIn(collectionName, 'Success Response')).toBeVisible();
      await expect(sidebar.exampleIn(collectionName, 'Error Response')).toBeVisible();
    });
  });
});
