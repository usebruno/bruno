import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollectionFromDialog
} from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { chooseFolders } from '../../../pages/open-collection-modal/choose-folder';

test.describe('Open Multiple Collections', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('TC-777: Verify opening of multiple collections with successful launch', { tag: '@sanity' }, async ({
    page,
    electronApp,
    collectionFixturePath
  }) => {
    const { sidebar } = buildCommonLocators(page);
    const picked = ['collection-one', 'collection-two'].map((dir) =>
      path.join(collectionFixturePath!, 'multiple', dir)
    );

    await expect(sidebar.collection('Test Collection 1')).toHaveCount(0);

    await openCollectionFromDialog(page, electronApp, picked);

    await expect(sidebar.collection('Test Collection 1')).toBeVisible();
    await expect(sidebar.collection('Test Collection 2')).toBeVisible();

    await closeAllCollections(page);
  });

  test('Should handle invalid collection path and display error', async ({ page, electronApp, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    // No path holds a collection: two are empty folders, the third does not exist at all.
    const emptyDir = await createTmpDir('collection-1');
    const otherEmptyDir = await createTmpDir('collection-2');
    const collectionCountBefore = await sidebar.collection().count();

    await chooseFolders(page, electronApp, [emptyDir, otherEmptyDir, 'invalid-collection-path']);

    await test.step('The modal stays open with a note and no collection opens', async () => {
      await expect(openCollectionModal.note()).toContainText('None of those folders is a Bruno collection.');
      await expect(openCollectionModal.root()).toBeVisible();
      await expect(sidebar.collection()).toHaveCount(collectionCountBefore);
    });
  });
});
