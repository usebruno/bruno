import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Cross-Format Collection Drag and Drop', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('Cross-format drag and drop should convert request between bru and yml', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const requestName = 'cross-format-request';

    // Both collections should already be loaded via init-user-data
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'bru-collection' })).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'yml-collection' })).toBeVisible();

    // Expand the bru collection and locate the request
    await page.locator('#sidebar-collection-name').filter({ hasText: 'bru-collection' }).click();
    const bruCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'bru-collection' })
      .locator('..');
    const bruRequest = bruCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName }).first();
    await expect(bruRequest).toBeVisible();

    // Drag the .bru request into the yml collection
    const ymlCollection = page.locator('.collection-name').filter({ hasText: 'yml-collection' });
    await bruRequest.dragTo(ymlCollection);

    // Verify the request appears in the yml collection (increase timeout for file watcher processing)
    const ymlCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'yml-collection' })
      .locator('..');
    // The yml collection may need to be expanded after the drop
    const ymlCollectionItems = ymlCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName });
    // Wait for file watcher to process the new file, then expand collection if needed
    await expect(async () => {
      if (await ymlCollectionItems.count() === 0) {
        await page.locator('#sidebar-collection-name').filter({ hasText: 'yml-collection' }).click();
      }
      await expect(ymlCollectionItems).toBeVisible();
    }).toPass({ timeout: 15000 });

    // Verify the request is no longer in the bru collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'bru-collection' }).click();
    await expect(bruCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toHaveCount(0);

    // Verify the file was converted to .yml format on disk
    const ymlFile = path.join(collectionFixturePath!, 'yml-collection', `${requestName}.yml`);
    const bruFile = path.join(collectionFixturePath!, 'yml-collection', `${requestName}.bru`);
    expect(fs.existsSync(ymlFile)).toBe(true);
    expect(fs.existsSync(bruFile)).toBe(false);
  });
});
