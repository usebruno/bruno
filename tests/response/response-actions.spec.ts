import { test, expect } from '../../playwright';
import {
  clickResponseAction,
  closeAllCollections,
  createCollection,
  createRequest,
  sendRequest,
  selectRequestPaneTab,
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

  test('should copy filtered JSONPath result when response filter is applied', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-jsonpath-filter-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'jsonpath-filter-copy-test', collectionName, {
        url: 'https://testbench-sanity.usebruno.com/api/echo/json',
        method: 'POST'
      });
    });

    await test.step('Set request body to nested JSON', async () => {
      await selectRequestPaneTab(page, 'Body');
      await page.getByTestId('request-body-mode-selector').click();
      await page.locator('.dropdown-item').filter({ hasText: 'JSON' }).click();

      const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror').first();
      await bodyEditor.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
      await page.keyboard.type('{"store":{"book":[{"author":"A"},{"author":"B"}]}}');
    });

    await test.step('Send request and apply JSONPath filter in response', async () => {
      await sendRequest(page, 200);
      await switchResponseFormat(page, 'JSON');

      await page.locator('#request-filter-icon').click();
      await page.locator('#response-filter').fill('$.store.book..author');
      await expect(page.getByTestId('response-preview-container')).toContainText('"A"');
      await expect(page.getByTestId('response-preview-container')).toContainText('"B"');
    });

    await test.step('Copy response and verify clipboard contains filtered output', async () => {
      await clickResponseAction(page, 'response-copy-btn');
      await expect(page.getByText('Response copied to clipboard')).toBeVisible();

      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.replace(/\r\n/g, '\n')).toBe('[\n  "A",\n  "B"\n]');
    });
  });
});
