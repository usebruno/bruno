import { test } from '../../../playwright';

const closeAllCollections = async (page) => {
  const numberOfCollections = await page.locator('.collection-name').count();

  for (let i = 0; i < numberOfCollections; i++) {
    await page.locator('.collection-name').first().locator('.collection-actions').click();
    await page.locator('.dropdown-item').getByText('Close').click();
    await page.getByRole('button', { name: 'Close' }).click();
  }
};

// Open a collection from the sidebar and accept the JavaScript Sandbox modal
// sandboxMode: 'safe' | 'developer'
const openCollectionAndAcceptSandbox = async (page,
  collectionName: string,
  sandboxMode: 'safe' | 'developer' = 'safe') => {
  await test.step('Open collection and accept sandbox', async () => {
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();

    const sandboxModal = page
      .locator('.bruno-modal-card')
      .filter({ has: page.locator('.bruno-modal-header-title', { hasText: 'JavaScript Sandbox' }) });

    const modeLabel = sandboxMode === 'safe' ? 'Safe Mode' : 'Developer Mode';
    await sandboxModal.getByLabel(modeLabel).check();
    await sandboxModal.locator('.bruno-modal-footer .submit').click();
  });
};

export { closeAllCollections, openCollectionAndAcceptSandbox };
