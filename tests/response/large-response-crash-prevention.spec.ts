import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection } from '../utils/page/actions';

test.describe('Large Response Crash/High Memory Usage Prevention', () => {
  // Increase timeout to 1 minute for all tests in this describe block, default is 30 seconds.
  // Prevents tests from failing due to timeout while waiting for the response, especially on slower internet connections.
  test.setTimeout(1 * 60 * 1000); // 1 minute

  test.afterAll(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Show appropriate warning for responses over 10MB', async ({ page, createTmpDir }) => {
    const collectionName = 'size-warning-test';

    // Create collection
    await createCollection(page, collectionName, createTmpDir);

    // Create request
    await page.locator('#create-new-tab').getByRole('img').click();

    const createRequestModal = page.locator('.bruno-modal-card').filter({ hasText: 'New Request' });
    await createRequestModal.getByPlaceholder('Request Name').fill('size-check');
    await createRequestModal.locator('#new-request-url .CodeMirror').click();
    await createRequestModal.locator('textarea').fill('https://samples.json-format.com/employees/json/employees_50MB.json');
    await createRequestModal.getByRole('button', { name: 'Create' }).click();

    // Send request
    const sendButton = page.getByTestId('send-arrow-icon');
    await sendButton.click();

    // Verify warning appears
    await expect(page.getByText('Large Response Warning')).toBeVisible({ timeout: 60000 });

    // Verify warning content
    await expect(page.getByText('Handling responses over')).toBeVisible();
    await expect(page.getByText('could degrade performance')).toBeVisible();

    // Verify action button
    await expect(page.getByRole('button', { name: 'View' })).toBeVisible();
  });
});
