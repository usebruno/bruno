import { test, expect } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';

const BRU_FILE_NAME = /^ws-test-request-with-subproto$/;

test.describe.serial('headers', () => {
  test('headers are returned if passed', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);
    const clearText = async (text: string) => {
      for (let i = text.length; i > 0; i--) {
        await page.keyboard.press('Backspace');
      }
    };
    const originalProtocol = 'soap';
    const wrongProtocol = 'wap';

    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_FILE_NAME).click();
    await page.getByRole('tab', { name: 'Headers1' }).click();

    await expect(page.locator('pre').filter({ hasText: originalProtocol })).toBeAttached();
    await locators.runner().click();

    const messages = await locators.messages();
    expect(await messages[0].locator('.text-ellipsis').innerText()).toMatch(/^(Connected to)/);

    await locators.connectionControls.disconnect().click();

    await page.locator('pre').filter({ hasText: originalProtocol }).click();
    await clearText(originalProtocol);
    await page.keyboard.insertText(wrongProtocol);

    await locators.runner().click();
    expect(await messages[0].locator('.text-ellipsis').innerText()).toMatch(/^(Bad Request)/);

    await page.locator('pre').filter({ hasText: wrongProtocol }).click();
    await clearText(wrongProtocol);
    await page.keyboard.insertText(originalProtocol);
    await locators.saveButton().click();
  });
});
