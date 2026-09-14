import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest, deleteCollectionFromOverview } from '../../utils/page';

test.describe('Delete collection', () => {
  test('Delete collection from workspace overview removes files from disk', async ({ page, createTmpDir }) => {
    const collectionName = 'delete-test-collection';
    const tmpDir = await createTmpDir(collectionName);
    const collectionPath = path.join(tmpDir, collectionName);

    // Create a collection with a request
    await createCollection(page, collectionName, tmpDir);
    await createRequest(page, 'ping', collectionName, { url: 'http://localhost:8081/ping' });

    // Verify collection directory exists on disk
    expect(fs.existsSync(collectionPath)).toBe(true);

    // Capture any uncaught errors during deletion
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    // Navigate to Workspace and delete collection from overview
    await deleteCollectionFromOverview(page, collectionName);

    // Verify collection is removed from overview
    await expect(
      page.locator('.collection-card').filter({ hasText: collectionName })
    ).not.toBeVisible();

    // Verify collection is removed from sidebar
    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: collectionName })
    ).not.toBeVisible();

    // Verify collection directory is deleted from disk
    expect(fs.existsSync(collectionPath)).toBe(false);

    // Verify no uncaught JS errors occurred during deletion
    expect(pageErrors).toHaveLength(0);
  });
});
