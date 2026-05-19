import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openCollection,
  openRequest,
  selectRequestPaneTab
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const pasteShortcut = process.platform === 'darwin' ? 'Meta+v' : 'Control+v';

// Copy text to the system clipboard by creating a temporary textarea, selecting
// its value, and calling document.execCommand('copy'). Avoids clipboard permissions.
const setClipboard = async (page, text: string) => {
  await page.evaluate((val: string) => {
    const ta = document.createElement('textarea');
    ta.value = val;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }, text);
};

// Paste a cURL command into the URL bar and wait for the success toast.
const pasteCurl = async (page, locators, curl: string) => {
  await setClipboard(page, curl);
  await locators.request.urlInput().click();
  await page.keyboard.press(pasteShortcut);
  await expect(page.getByText('cURL command imported successfully').last()).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);
};

// Switch to the Body tab, verify the body mode selector matches expectedMode,
// then assert the editable table contains the given key/value rows.
const verifyEditableTable = async (page, locators, expectedMode: string, expectedKeys: string[], expectedValues: string[]) => {
  await selectRequestPaneTab(page, 'Body');
  await expect(locators.request.bodyModeSelector()).toContainText(expectedMode);

  const wrapper = page.locator('[data-testid="editable-table"]');
  const nameInputs = wrapper.locator('[data-testid="column-name"] input');
  await expect(nameInputs).toHaveCount(expectedKeys.length + 1); // +1 for empty add-row

  for (let i = 0; i < expectedKeys.length; i++) {
    await expect(nameInputs.nth(i)).toHaveValue(expectedKeys[i]);
    await expect(wrapper.locator('[data-testid="column-value"]').nth(i)).toContainText(expectedValues[i]);
  }
};

test.describe.serial('cURL command import via URL bar paste', () => {
  const collectionName = 'curl-paste-test';
  const requestName = 'curl-target';

  test.beforeAll(async ({ page, createTmpDir }) => {
    await createCollection(page, collectionName, await createTmpDir('curl-paste-collection'));
    await createRequest(page, requestName, collectionName, {
      url: 'https://initial.example.com',
      method: 'GET'
    });
    await openCollection(page, collectionName);
    await openRequest(page, collectionName, requestName, { persist: true });
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import form-urlencoded body from curl -d', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await pasteCurl(page, locators, `curl -X POST -d "a=b" https://example.com/api`);

    await expect(locators.request.urlLine()).toContainText('https://example.com/api');
    await expect(page.getByTestId('method-selector')).toContainText('POST');
    await verifyEditableTable(page, locators, 'Form URL Encoded', ['a'], ['b']);
  });

  test('should import multipart form body from curl -F and clear form-urlencoded', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await pasteCurl(page, locators, `curl -X POST -F "c=d" https://example.com/api`);
    await verifyEditableTable(page, locators, 'Multipart Form', ['c'], ['d']);
  });

  test('should re-import form-urlencoded and clear multipart form', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await pasteCurl(page, locators, `curl -X POST -d "e=f&g=h" https://example.com/api`);
    await verifyEditableTable(page, locators, 'Form URL Encoded', ['e', 'g'], ['f', 'h']);
  });

  test('should import JSON body when Content-Type header is present', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await pasteCurl(page, locators, `curl -X POST -H "Content-Type: application/json" -d '{"name":"test"}' https://example.com/api`);

    await selectRequestPaneTab(page, 'Body');
    await expect(locators.request.bodyModeSelector()).toContainText('JSON');

    const text = await locators.request.bodyEditor().locator('.CodeMirror').textContent();
    expect(text).toContain('"name"');
    expect(text).toContain('"test"');
  });
});
