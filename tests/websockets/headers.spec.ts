import { test, expect } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';
import { waitForPredicate } from '../utils/wait';

const BRU_REQ_NAME = /^ws-test-request-with-headers$/;

test.describe.serial('headers', () => {
  test('headers are returned if passed', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Open the most recent collection
    await page.locator('#sidebar-collection-name').click();

    // Click on the required request
    await page.getByTitle(BRU_REQ_NAME).click();
    await locators.runner().click();

    await waitForPredicate(() => locators.messages().count().then((count) => count > 0));
    const messages = await locators.messages().all();

    // Check if the message has the authorisation header
    expect(await messages[2].locator('.text-ellipsis').innerText()).toMatch(/\"(authorization)\"\:\s+\"Dummy\"/);
  });
});
