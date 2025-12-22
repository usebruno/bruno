import { test, expect } from '../../playwright';
import {
  clickResponseAction,
  closeAllCollections,
  createCollection,
  createRequest,
  sendRequest,
  switchResponseFormat,
  switchToEditorTab
} from '../utils/page/actions';

test.describe('Response Pane Actions', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy response to clipboard', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'copy-test', collectionName, { url: 'https://testbench-sanity.usebruno.com/ping' });
    });

    await test.step('Send request and wait for response', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Copy response to clipboard', async () => {
      await clickResponseAction(page, 'response-copy-btn');
      await expect(page.getByText('Response copied to clipboard')).toBeVisible();
    });
  });

  test('should copy Base64 when editor mode and Base64 format selected', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-base64-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'base64-copy-test', collectionName, {
        url: 'https://testbench-sanity.usebruno.com/ping'
      });
    });

    await test.step('Send request and wait for response', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Switch to Base64 format (editor mode - preview OFF)', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Base64');
    });

    await test.step('Copy response and verify clipboard contains Base64', async () => {
      await clickResponseAction(page, 'response-copy-btn');
      await expect(page.getByText('Response copied to clipboard')).toBeVisible();

      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      // "pong" in Base64 is "cG9uZw=="
      expect(clipboardText).toBe('cG9uZw==');
    });
  });
});
