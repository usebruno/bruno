import { test, expect } from '../../../../../playwright';
import { openCollectionAndAcceptSandbox } from '../../../../utils/page';
import { buildWebsocketCommonLocators } from '../../../../utils/page/locators';

const BRU_REQ_NAME = /^ws-ssl-request$/;

test.describe.serial('wss with custom ca cert', () => {
  test('websocket connects over ssl', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Define reusable locators
    const requestItem = page.getByTitle(BRU_REQ_NAME);

    await test.step('Open collection', async () => {
      await openCollectionAndAcceptSandbox(page, 'wss-custom-ca-certs-test', 'safe');
    });

    await test.step('Connect to WSS', async () => {
      await requestItem.click();
      await locators.connectionControls.connect().click();
      await expect(locators.connectionControls.disconnect()).toBeAttached();
    });

    await test.step('Send message and verify response', async () => {
      await locators.runner().click();
      const responseMessage = locators.messages().nth(2).locator('.text-ellipsis');
      await expect(responseMessage).toHaveText(/\"headers\"/);
    });
  });
});
