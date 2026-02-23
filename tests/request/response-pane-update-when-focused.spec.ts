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
      await page.locator('.body-mode-selector').click();
      await page.locator('.dropdown-item').filter({ hasText: 'JSON' }).click();
      await page.waitForTimeout(200);

      const bodyEditor = page.locator('.request-pane .CodeMirror').last();
      await bodyEditor.click();
      await page.locator('.request-pane textarea').last().fill('{"run": 1}');
      await page.waitForTimeout(300);
    });

    await test.step('Send first request and verify response contains run: 1', async () => {
      await sendRequest(page, 200, 15000);
      const responsePane = locators.response.pane();
      await expect(responsePane).toContainText('run');
      await expect(responsePane).toContainText('1');
    });

    await test.step('Change body to {"run": 2}', async () => {
      await selectRequestPaneTab(page, 'Body');
      const bodyEditor = page.locator('.request-pane .CodeMirror').last();
      await bodyEditor.click();
      await page.locator('.request-pane textarea').last().fill('{"run": 2}');
      await page.waitForTimeout(300);
    });

    await test.step('Click inside response pane (Raw/JSON editor) to give it focus', async () => {
      const responseEditor = page.locator('[data-testid="response-preview-container"] .CodeMirror').first();
      await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
      await responseEditor.click();
      await page.waitForTimeout(200);
    });

    await test.step('Press Cmd+Enter / Ctrl+Enter to re-send request', async () => {
      await page.keyboard.press(runShortcut);
      await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: 15000 });
    });

    await test.step('Response pane must show new response (run: 2)', async () => {
      const responsePane = locators.response.pane();
      await expect(responsePane).toContainText('run');
      await expect(responsePane).toContainText('2', { timeout: 5000 });
    });
  });
});
