import { test, expect } from '../../../../../playwright';
import { openCollectionAndAcceptSandbox } from '../../../../utils/page';
import { buildWebsocketCommonLocators } from '../../../../utils/page/locators';

const BRU_REQ_NAME = /^ws-ssl-request$/;

test.describe.serial('wss with custom ca cert', () => {
  test('websocket connects over ssl', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);

    await openCollectionAndAcceptSandbox(page, 'wss-custom-ca-certs-test', 'safe');

    // Click on the WSS request
    await page.getByTitle(BRU_REQ_NAME).click();

    // Connect to the WebSocket
    await locators.connectionControls.connect().click();

    // Wait for connection to establish
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: 5000
    });

    // Run the request to send the message
    await locators.runner().click();

    // Check if the response contains headers (proving connection worked)
    await expect(locators.messages().nth(2).locator('.text-ellipsis')).toHaveText(/\"headers\"/, {
      timeout: 5000
    });
  });
});
