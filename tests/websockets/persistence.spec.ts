import { setTimeout } from 'timers/promises';
import { expect, Locator, test } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { waitForPredicate } from '../utils/wait';

const BRU_REQ_NAME = /^base$/;

// TODO: reaper move to someplace common
const isRequestSaved = async (saveButton: Locator) => {
  const savedColor = '#9f9f9f';
  return (await saveButton.evaluate((d) => d.querySelector('svg')?.getAttribute('stroke') ?? '#invalid')) === savedColor;
};

test.describe.serial('persistence', () => {
  let originalUrl = '';
  let originalContext = {
    path: join(__dirname, 'fixtures/collection/base.bru'),
    data: ''
  };

  test.beforeAll(async () => {
    // Store original request data to simplify test consistency
    originalContext.data = await readFile(originalContext.path, 'utf8');
    const originalUrlMatch = originalContext.data.match(`(url)\s*\:\s*(.+)`);
    if (!originalUrlMatch) {
      throw new Error('url not found in bru file for websocket');
    }
    originalUrl = originalUrlMatch[0].replace(/url\:/, '');
  });

  test.afterAll(async () => {
    // Write back the original request information
    await writeFile(originalContext.path, originalContext.data, 'utf8');
  });

  test('save new websocket url', async ({ pageWithUserData: page }) => {
    const replacementUrl = 'ws://localhost:8082';
    const locators = buildWebsocketCommonLocators(page);

    const clearText = async (text: string) => {
      for (let i = text.length; i > 0; i--) {
        await page.keyboard.press('Backspace');
      }
    };

    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_REQ_NAME).click();

    // remove the original url from the request
    await page.locator('.input-container').filter({ hasText: originalUrl }).first().click();
    await clearText(originalUrl);

    // replace it with an arbritrary url
    await page.keyboard.insertText(replacementUrl);

    // check if the request is now unsaved
    expect(await isRequestSaved(locators.saveButton())).toBe(false);

    await locators.saveButton().click();

    const result = await waitForPredicate(() => isRequestSaved(locators.saveButton()));
    expect(result).toBe(true);

    // check if the replacementUrl is now visually available
    expect(page.locator('.input-container').filter({ hasText: replacementUrl }).first()).toBeAttached();
  });
});
