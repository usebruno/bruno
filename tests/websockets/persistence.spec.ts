import { expect, Locator, test } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const BRU_FILE_NAME = /^base$/;

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
    originalContext.data = await readFile(originalContext.path, 'utf8');
    const originalUrlMatch = originalContext.data.match(`(url)\s*\:\s*(.+)`);
    if (!originalUrlMatch) {
      throw new Error('url not found in bru file for websocket');
    }
    originalUrl = originalUrlMatch[0].replace(/url\:/, '');
  });

  test.afterAll(async () => {
    await writeFile(originalContext.path, originalContext.data, 'utf8');
  });

  test('save new websocket url', async ({ pageWithUserData: page }) => {
    const replacementUrl = 'ws://localhost:8082';
    const locators = buildWebsocketCommonLocators(page);
    const unsavedColor = '#d97706';
    const getSaveSvg = () => locators.saveButton().evaluate((d) => d.querySelector('svg'));

    const clearText = async (text: string) => {
      for (let i = text.length; i > 0; i--) {
        await page.keyboard.press('Backspace');
      }
    };

    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_FILE_NAME).click();

    await page.locator('.input-container').filter({ hasText: originalUrl }).first().click();
    await clearText(originalUrl);

    await page.keyboard.insertText(replacementUrl);

    await expect(await isRequestSaved(locators.saveButton())).toBe(false);

    await locators.saveButton().click();

    await expect(await isRequestSaved(locators.saveButton())).toBe(true);

    expect(page.locator('.input-container').filter({ hasText: 'ws://localhost:8082' }).first()).toBeAttached();
  });
});
