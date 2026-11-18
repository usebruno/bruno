import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollectionFromDialog,
  restoreOpenDialog,
  stashOpenDialog
} from '../../utils/page';

test.describe('Open Multiple Collections', () => {
  test.beforeAll(async ({ electronApp }) => {
    await stashOpenDialog(electronApp);
  });

  test.afterAll(async ({ electronApp }) => {
    await restoreOpenDialog(electronApp);
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
    // Neither path holds a collection: one is an empty folder, the other does not exist at all.
    const emptyDir = await createTmpDir('collection-1');
    const collectionCountBefore = await sidebar.collection().count();

    await openCollectionFromDialog(page, electronApp, [emptyDir, 'invalid-collection-path']);

    await expect(page.getByText('No Bruno collections found').first()).toBeVisible();
    await expect(sidebar.collection()).toHaveCount(collectionCountBefore);
  });
});
