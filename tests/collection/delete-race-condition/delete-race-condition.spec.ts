import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { createCollection, closeAllCollections } from '../../utils/page';

test.describe('Collection Delete Race Condition', () => {
  const collectionName = 'Race Condition Test';
  let collectionDir: string;
  let fullCollectionPath: string;

  test.beforeEach(async ({ page, createTmpDir }) => {
    collectionDir = await createTmpDir('race-condition-test');
    await createCollection(page, collectionName, collectionDir);
    fullCollectionPath = path.join(collectionDir, collectionName);

    // Verify collection is visible in sidebar
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Should handle collection config file deletion without crashing', async ({ page }) => {
    const openCollectionYmlPath = path.join(fullCollectionPath, 'opencollection.yml');

    await fs.promises.unlink(openCollectionYmlPath);

    // Wait for watcher to process the deletion
    await page.waitForTimeout(1000);

    // The app should still be responsive even after the config file is deleted
    await expect(page.getByTestId('collections-header-add-menu')).toBeVisible();
    await page.getByTestId('collections-header-add-menu').click();

    // Verify dropdown appears (app is responsive)
    await expect(page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' })).toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');
  });

  test('Should handle collection folder deletion without crashing', async ({ page }) => {
    // Simulate deletion of entire collection folder from filesystem
    await fs.promises.rm(fullCollectionPath, { recursive: true, force: true });

    // Small delay to ensure watcher processes the deletion
    await page.waitForTimeout(1000);

    // The app should still be responsive even after the folder is deleted
    // Try to interact with the UI
    await expect(page.getByTestId('collections-header-add-menu')).toBeVisible();
    await page.getByTestId('collections-header-add-menu').click();

    // Verify dropdown appears (app is responsive)
    await expect(page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' })).toBeVisible();

    // Close dropdown by clicking elsewhere
    await page.keyboard.press('Escape');
  });
});
