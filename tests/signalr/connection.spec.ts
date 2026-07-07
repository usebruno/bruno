import { expect, test } from '../../playwright';
import { buildSignalRCommonLocators } from '../utils/page/locators';

const MAX_CONNECTION_TIME = 5000;
const BRU_REQ_NAME = /^signalr-test-request$/;

test.describe.serial('signalr connection', () => {
  test('signalr requests are visible', async ({ pageWithUserData: page }) => {
    const locators = buildSignalRCommonLocators(page);
    await locators.sidebarCollectionName().click();
    await expect(page.locator('span.item-name').filter({ hasText: BRU_REQ_NAME })).toBeVisible();
  });

  test('signalr connects to hub', async ({ pageWithUserData: page }) => {
    const locators = buildSignalRCommonLocators(page);
    await locators.requestByTitle(BRU_REQ_NAME).click();
    await locators.connectionControls.connect().click();
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
    await expect(locators.messages().filter({ hasText: 'Connected to' }).first()).toBeAttached();
    await locators.connectionControls.disconnect().click();
    await expect(locators.connectionControls.connect()).toBeVisible();
    await expect(locators.messages().filter({ hasText: 'Closed' }).first()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
  });

  test('signalr disconnects from hub', async ({ pageWithUserData: page }) => {
    const locators = buildSignalRCommonLocators(page);
    await locators.requestByTitle(BRU_REQ_NAME).click();
    await locators.connectionControls.connect().click();
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
    await expect(locators.messages().filter({ hasText: 'Closed' }).first()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
  });
});
