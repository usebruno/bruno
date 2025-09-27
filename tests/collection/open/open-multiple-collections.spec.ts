import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Open Multiple Collections', () => {
  test('Should open multiple collections using Open Collection(s) feature', async ({ page, electronApp, createTmpDir }) => {
    // Create two test collections with proper bruno.json files
    const collection1Dir = await createTmpDir('collection-1');
    const collection2Dir = await createTmpDir('collection-2');

    // Create bruno.json for first collection
    const fs = require('fs');
    const collection1Config = {
      version: '1',
      name: 'Test Collection 1',
      type: 'collection',
    };
    fs.writeFileSync(path.join(collection1Dir, 'bruno.json'), JSON.stringify(collection1Config, null, 2));

    // Create bruno.json for second collection
    const collection2Config = {
      version: '1',
      name: 'Test Collection 2',
      type: 'collection',
    };
    fs.writeFileSync(path.join(collection2Dir, 'bruno.json'), JSON.stringify(collection2Config, null, 2));

    // Mock the electron dialog to return multiple folder selections
    await electronApp.evaluate(({ dialog }, { collection1Dir, collection2Dir }) => {
      dialog.showOpenDialog = async () => {
        return {
          canceled: false,
          filePaths: [collection1Dir, collection2Dir],
        };
      };
    }, { collection1Dir, collection2Dir });

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Test Collection 1' })).not.toBeVisible();

    // Click on Open Collection(s) button
    await page.getByRole('button', { name: 'Open Collections' }).click();

    // Wait for both collections to appear in the sidebar
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Test Collection 1' })).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Test Collection 2' })).toBeVisible();

    // Verify both collections are present in the workspace
    const collection1Element = page.locator('#sidebar-collection-name').filter({ hasText: 'Test Collection 1' });
    const collection2Element = page.locator('#sidebar-collection-name').filter({ hasText: 'Test Collection 2' });

    await expect(collection1Element).toBeVisible();
    await expect(collection2Element).toBeVisible();

    // Verify we can interact with both collections (click to configure them)
    await collection1Element.click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    await collection2Element.click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Both collections should now be fully loaded and configured
    await expect(collection1Element).toBeVisible();
    await expect(collection2Element).toBeVisible();
  });
});
