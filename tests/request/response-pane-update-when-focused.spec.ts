import { test, expect } from '../../playwright';
import {
  createCollection,
  createRequest,
  sendRequest,
  openRequest,
  closeAllCollections,
  selectRequestPaneTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const runShortcut = process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter';
const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
const echoUrl = 'https://echo.usebruno.com';

test.describe.serial('Response pane updates when focused and request is re-sent', () => {
  const collectionName = 'response-pane-update-test';
  const requestName = 'Echo Request';

  test.beforeAll(async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('response-pane-collection');
    await createCollection(page, collectionName, collectionPath);
    await createRequest(page, requestName, collectionName, { url: echoUrl, method: 'POST' });
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Response pane shows new response after re-send with Cmd+Enter while focused in response', async ({
    page
  }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open request and set body to {"run": 1}', async () => {
      await openRequest(page, collectionName, requestName);

      await selectRequestPaneTab(page, 'Body');
      await locators.request.bodyModeSelector().click();
      await locators.dropdown.item('JSON').click();

      const bodyCodeMirror = locators.request.bodyEditor().locator('.CodeMirror');
      await bodyCodeMirror.click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('{"run": 1}');
    });

    await test.step('Send first request and verify response contains run: 1', async () => {
      await sendRequest(page, 200, 15000);
      const runEquals1 = /"run":\s*1/; // "run" with value 1, optional space after colon
      await expect(locators.response.previewContainer()).toContainText(runEquals1);
    });

    await test.step('Change body to {"run": 2}', async () => {
      await selectRequestPaneTab(page, 'Body');
      const bodyCodeMirror = locators.request.bodyEditor().locator('.CodeMirror');
      await bodyCodeMirror.click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('{"run": 2}');
    });

    await test.step('Click inside response pane (Raw/JSON editor) to give it focus', async () => {
      const responseEditor = locators.response.previewContainerCodeMirror();
      await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
      await responseEditor.click();
    });

    await test.step('Press Cmd+Enter / Ctrl+Enter to re-send request', async () => {
      await page.keyboard.press(runShortcut);
      await locators.response.statusCode().waitFor({ state: 'visible', timeout: 15000 });
      await expect(locators.response.statusCode()).toContainText('200');
    });

    await test.step('Response pane must show new response (run: 2)', async () => {
      const responseBody = locators.response.previewContainer();
      // Must show the new response body: single JSON object with "run": 2
      const runEquals2 = /"run":\s*2/;
      await expect(responseBody).toContainText(runEquals2, { timeout: 5000 });
    });
  });
});
