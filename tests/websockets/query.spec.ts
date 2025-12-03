import { test, expect } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';

const BRU_REQ_NAME = /^ws-test-request-with-query$/;

test.describe.serial('query params', () => {
  test('query params are returned if passed', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Open the most recent collection
    await page.locator('#sidebar-collection-name').click();

    // Click on the required request
    await page.getByTitle(BRU_REQ_NAME).click();
    await locators.runner().click();

    // Check if the message has the query params
    await expect(locators.messages().nth(2).locator('.text-ellipsis')).toHaveText(/\"(testParam)\"\:\s+\"testValue\"/);
  });
});
