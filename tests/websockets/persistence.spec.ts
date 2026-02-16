import { expect, Locator, test } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const BRU_REQ_NAME = /^base$/;
const BRU_PATH = join(__dirname, 'fixtures/collection/base.bru');

// TODO: reaper move to someplace common
const isRequestSaved = async (saveButton: Locator) => {
  // Saved state uses the className cursor-default; unsaved uses cursor-pointer.
  return await saveButton.locator('svg').evaluate((node) => (node as HTMLElement).classList.contains('cursor-default'));
};

test.describe.serial('persistence', () => {
  let originalUrl = '';
  let originalData = '';

  test.beforeAll(async () => {
    originalData = await readFile(BRU_PATH, 'utf8');
    const originalUrlMatch = originalData.match(`(url)\s*\:\s*(.+)`);
    if (!originalUrlMatch) {
      throw new Error('url not found in bru file for websocket');
    }
    // Trim to remove leading/trailing whitespace from the regex capture
    originalUrl = originalUrlMatch[0].replace(/url\:/, '').trim();
  });

  test.afterAll(async () => {
    // Restore original fixture since pageWithUserData does not isolate collection files
    await writeFile(BRU_PATH, originalData, 'utf8');
  });

  test('save new websocket url', async ({ pageWithUserData: page }) => {
    const replacementUrl = 'ws://localhost:8083';
    const locators = buildWebsocketCommonLocators(page);
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_REQ_NAME).click();

    // Select all text in the URL input and replace with new URL
    await page.locator('.input-container').filter({ hasText: originalUrl }).first().click();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText(replacementUrl);

    // Use auto-retrying assertion to check if the request is now unsaved
    await expect.poll(() => isRequestSaved(locators.saveButton())).toBe(false);

    await locators.saveButton().click();

    // Use auto-retrying assertion to verify save completed
    await expect.poll(() => isRequestSaved(locators.saveButton())).toBe(true);

    // check if the replacementUrl is now visually available
    await expect(page.locator('.input-container').filter({ hasText: replacementUrl }).first()).toBeAttached();
  });
});
