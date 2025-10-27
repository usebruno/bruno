import { test, expect } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';

const BRU_REQ_NAME = /^ws-test-request-with-subproto$/;

test.describe.serial('subprotocol tests', () => {
  test('has multiple sub proto headers', async ({ pageWithUserData: page, restartApp }) => {
    const originalProtocols = ['soap', 'mqtt'];
    const locators = buildWebsocketCommonLocators(page);
    // Open the needed request and keep the headers tab in focus for modifications
    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_REQ_NAME).click();
    await page.locator('[role=tab].headers').click();

    // Check if the original / correct protocol is in place and then send a request
    for (let proto of originalProtocols) {
      await expect(page.locator('pre').filter({ hasText: proto })).toBeAttached();
    }
  });

  test('Only connect if a valid subprotocol is sent with the request', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);
    const clearText = async (text: string) => {
      for (let i = text.length; i > 0; i--) {
        await page.keyboard.press('Backspace');
      }
    };

    const originalProtocol = 'soap';
    const wrongProtocol = 'wap';

    // Open the needed request and keep the headers tab in focus for modifications
    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_REQ_NAME).click();
    await page.locator('[role=tab].headers').click();

    // Check if the original / correct protocol is in place and then send a request
    await expect(page.locator('pre').filter({ hasText: originalProtocol })).toBeAttached();
    await locators.runner().click();

    // Check the messages to confirm we ended up connecting
    await expect(locators.messages().first().locator('.text-ellipsis')).toHaveText(/^(Connected to)/);

    // Disconnect the request
    await locators.connectionControls.disconnect().click();

    // Make changes to the header and add in an invalid sub protocol
    await page.locator('pre').filter({ hasText: originalProtocol }).click();
    await clearText(originalProtocol);
    await page.keyboard.insertText(wrongProtocol);

    // clear before making another request
    await locators.toolbar.clearResponse().click();

    // Make another request and check the new set of messages to confirm that we did
    // get an error on connection
    await locators.runner().click();

    await expect(locators.messages().nth(0).locator('.text-ellipsis')).toHaveText(/^(Unexpected server response)/);

    // Reset state back to the original
    await page.locator('pre').filter({ hasText: wrongProtocol }).click();
    await clearText(wrongProtocol);
    await page.keyboard.insertText(originalProtocol);
    await locators.saveButton().click();
  });
});
