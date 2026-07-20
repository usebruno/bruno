import { test, expect } from '../../../../../playwright';
import { openCollection } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const BRU_REQ_NAME = /^ws-ssl-request$/;

test.describe.serial('wss with custom ca cert', () => {
  test('websocket connects over ssl', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Define reusable locators
    const requestItem = page.getByTitle(BRU_REQ_NAME);

    await test.step('Open collection', async () => {
      await openCollection(page, 'wss-custom-ca-certs-test');
    });

    await test.step('Connect to WSS', async () => {
      await requestItem.click();
      await locators.websocket.connectionControls.connect().click();
      await expect(locators.websocket.connectionControls.disconnect()).toBeAttached();
    });

    await test.step('Send message and verify response', async () => {
      await locators.runner().click();
      const responseMessage = locators.websocket.messages().nth(2).locator('.text-ellipsis');
      await expect(responseMessage).toHaveText(/\"headers\"/);
    });
  });
});
