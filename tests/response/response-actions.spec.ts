import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequestWithUrl,
  sendRequest
} from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Response Pane Actions', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy response to clipboard', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-test';
    const locators = buildCommonLocators(page);

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName), { openWithSandboxMode: 'safe' });
      await createRequestWithUrl(page, 'copy-test', collectionName, 'https://httpbin.org/json');
    });

    await test.step('Send request and wait for response', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Copy response to clipboard', async () => {
      await expect(locators.response.copyButton()).toBeVisible();
      await locators.response.copyButton().click();
      await expect(page.getByText('Response copied to clipboard')).toBeVisible();
    });
  });
});
