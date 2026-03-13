import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest } from '../../utils/page';

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

    // Navigate to Workspace
    await page.locator('.home-button').click();

    // Navigate to workspace overview
    const overviewTab = page.locator('.request-tab').filter({ hasText: 'Overview' });
    await overviewTab.click();

    // Find the collection card and open its menu
    const collectionCard = page.locator('.collection-card').filter({ hasText: collectionName });
    await collectionCard.waitFor({ state: 'visible', timeout: 5000 });
    await collectionCard.locator('.collection-menu').click();

    // Click Delete from the dropdown
    await page.locator('.dropdown-item').filter({ hasText: 'Delete' }).click();

    // Wait for delete confirmation modal
    const deleteModal = page.locator('.bruno-modal').filter({ hasText: 'Delete Collection' });
    await deleteModal.waitFor({ state: 'visible', timeout: 5000 });

    // Type 'delete' to confirm
    await deleteModal.locator('#delete-confirm-input').fill('delete');

    // Click the Delete button
    await deleteModal.getByRole('button', { name: 'Delete', exact: true }).click();

    // Wait for modal to close and success toast
    await deleteModal.waitFor({ state: 'hidden', timeout: 10000 });

    // Verify collection is removed from workspace overview
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
