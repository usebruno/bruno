import { test, expect } from '../../../playwright';

/**
 * Close all collections
 * @param page - The page object
 * @returns void
 */
const closeAllCollections = async (page) => {
  await test.step('Close all collections', async () => {
    const numberOfCollections = await page.locator('.collection-name').count();

    for (let i = 0; i < numberOfCollections; i++) {
      await page.locator('.collection-name').first().locator('.collection-actions').click();
      await page.locator('.dropdown-item').getByText('Close').click();
      // Wait for the close collection modal to be visible
      await page.locator('.bruno-modal-header-title', { hasText: 'Close Collection' }).waitFor({ state: 'visible' });
      await page.locator('.bruno-modal-footer .submit').click();
      // Wait for the close collection modal to be hidden
      await page.locator('.bruno-modal-header-title', { hasText: 'Close Collection' }).waitFor({ state: 'hidden' });
    }

    // Wait until no collections are left open
    await expect(page.locator('.collection-name')).toHaveCount(0);
  });
};

/**
 * Open a collection from the sidebar and accept the JavaScript Sandbox modal
 * @param page - The page object
 * @param collectionName - The name of the collection to open
 * @param sandboxMode - The mode to accept the sandbox modal
 * @returns void
 */
const openCollectionAndAcceptSandbox = async (page, collectionName: string, sandboxMode: 'safe' | 'developer' = 'safe') => {
  await test.step(`Open collection "${collectionName}" and accept sandbox "${sandboxMode}" mode`, async () => {
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();

    const sandboxModal = page
      .locator('.bruno-modal-card')
      .filter({ has: page.locator('.bruno-modal-header-title', { hasText: 'JavaScript Sandbox' }) });

    const modeLabel = sandboxMode === 'safe' ? 'Safe Mode' : 'Developer Mode';
    await sandboxModal.getByLabel(modeLabel).check();
    await sandboxModal.locator('.bruno-modal-footer .submit').click();
  });
};

const createCollection = async (page, collectionName: string, createDir: (tag?: string | undefined) => Promise<string>) => {
  await page.locator('.dropdown-icon').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
  await page.getByLabel('Name').fill(collectionName);
  await page.getByLabel('Location').fill(await createDir(collectionName));
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
  await page.getByLabel('Safe Mode').check();
  await page.getByRole('button', { name: 'Save' }).click();
};

export { closeAllCollections, openCollectionAndAcceptSandbox, createCollection };
