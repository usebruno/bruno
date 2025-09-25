import { test, expect } from '../../playwright';
import { buildCommonLocators } from './lib/locators';

const BRU_FILE_NAME = /^ws-test-request-with-headers$/;

test.describe.serial('headers', () => {
  test('headers are returned if passed', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildCommonLocators(page);

    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_FILE_NAME).click();
    await locators.runner().click();

    const messages = await locators.messages();
    expect(await messages[2].locator('.text-ellipsis').innerText()).toMatch(/\"(authorization)\"\:\s+\"Dummy\"/);
  });
});
