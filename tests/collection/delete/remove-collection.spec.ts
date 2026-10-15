import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, createCollection, removeCollection } from '../../utils/page';

test.describe('Remove collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-123: Verify removing a collection from the sidebar', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'remove-collection';
    const collectionLocation = await createTmpDir('remove-collection');
    const collectionPath = path.join(collectionLocation, collectionName);
    const { sidebar, toast } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
      expect(fs.existsSync(path.join(collectionPath, 'opencollection.yml'))).toBe(true);
    });

    await test.step('Remove the collection from the sidebar menu', async () => {
      await removeCollection(page, collectionName);
      await expect(toast.byMessage('Collection removed from workspace').first()).toBeVisible();
    });

    await test.step('Collection is no longer listed in the sidebar', async () => {
      await expect(sidebar.collection(collectionName)).toHaveCount(0);
    });

    await test.step('Collection files remain on disk', async () => {
      expect(fs.existsSync(path.join(collectionPath, 'opencollection.yml'))).toBe(true);
    });
  });
});
