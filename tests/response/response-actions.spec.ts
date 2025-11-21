import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection } from '../utils/page/actions';

test.describe('Response Pane Actions', () => {
  test.afterAll(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should copy response to clipboard', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-test';

    await test.step('Create collection and request', async () => {
      // Create collection
      await createCollection(page, collectionName, await createTmpDir(collectionName), { openWithSandboxMode: 'safe' });

      // Create request
      const collection = page.locator('.collection-name').filter({ hasText: collectionName });
      await collection.locator('.collection-actions').hover();
      await collection.locator('.collection-actions .icon').click();
      await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();

      await page.getByPlaceholder('Request Name').fill('copy-test');
      await page.locator('#new-request-url .CodeMirror').click();
      // Using httpbin.org for a simple JSON response
      await page.locator('textarea').fill('https://httpbin.org/json');
      await page.getByRole('button', { name: 'Create' }).click();
    });

    await test.step('Send request and wait for response', async () => {
      // Send request
      const sendButton = page.getByTestId('send-arrow-icon');
      await sendButton.click();

      // Wait for response
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 30000 });
    });

    await test.step('should copy response to clipboard', async () => {
      // Find the copy button
      const copyButton = page.locator('button[title="Copy response to clipboard"]');
      await expect(copyButton).toBeVisible();

      // Click the copy button
      await copyButton.click();

      // Verify toast notification appears
      await expect(page.getByText('Response copied to clipboard')).toBeVisible();
    });
  });
});
