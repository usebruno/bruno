import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest, closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Collection: external filesystem deletion', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('removes the collection from the sidebar when its root folder is deleted on disk', async ({
    page,
    createTmpDir
  }) => {
    const colPath = await createTmpDir('external-deletion-col');
    const { sidebar } = buildCommonLocators(page);

    // Create a collection (with a request so the tree is fully mounted/watched) and confirm it's visible.
    await createCollection(page, 'DeleteMe', colPath);
    await createRequest(page, 'ReqAlpha', 'DeleteMe', { url: 'https://echo.usebruno.com', method: 'GET' });
    await expect(sidebar.collection('DeleteMe')).toHaveCount(1);

    // Delete the collection root directory externally.
    // createCollection writes the collection into a single sub-folder of colPath.
    const [collectionFolder] = fs.readdirSync(colPath);
    expect(collectionFolder, 'collection folder should exist on disk').toBeTruthy();
    await fs.promises.rm(path.join(colPath, collectionFolder), { recursive: true, force: true });

    // The collection disappears from the sidebar without a restart.
    await expect(sidebar.collection('DeleteMe')).toHaveCount(0);
  });
});
