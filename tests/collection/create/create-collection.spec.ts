import { test, expect } from '../../../playwright';
import { closeAllCollections, createRequest } from '../../utils/page';

test.describe('Create collection', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Create collection and add a simple HTTP request', async ({ page, createTmpDir }) => {
    const collectionName = 'test-collection';
    const requestName = 'ping';

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();
    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(collectionName);
    await page.getByLabel('Name').press('Tab');
    const locationInput = page.locator('.bruno-modal').getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir(collectionName));
    }
    await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();

    // Create a new request using the dialog/modal flow
    await createRequest(page, requestName, collectionName);

    // Set the URL
    await page.locator('#request-url .CodeMirror').click();
    await page.locator('#request-url').locator('textarea').fill('http://localhost:8081');
    await page.locator('#send-request').getByTitle('Save Request').click();

    // Send a request
    await page.locator('#request-url .CodeMirror').click();
    await page.locator('#request-url').locator('textarea').fill('/ping');
    await page.locator('#send-request').getByTitle('Save Request').click();
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // Verify the response
    await expect(page.getByRole('main')).toContainText('200 OK');
  });
});
