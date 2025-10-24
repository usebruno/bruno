import { test, expect } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';

const BRU_REQ_NAME = /^ws-test-request-with-headers$/;

test.describe.serial('headers', () => {
  test('headers are returned if passed', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Open the most recent collection
    await page.locator('#sidebar-collection-name').click();

    // Click on the required request
    await page.getByTitle(BRU_REQ_NAME).click();
    await locators.runner().click();

    // Check if the message has the authorisation header
    await expect(locators.messages().nth(2).locator('.text-ellipsis')).toHaveText(/\"(authorization)\"\:\s+\"Dummy\"/);
    await expect(locators.messages().nth(2).locator('.text-ellipsis')).toHaveText(/\"(x-bruno-collection-var)\"\:\s+\"Variable Value\"/);
  });
});
