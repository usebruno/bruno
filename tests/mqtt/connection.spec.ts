import { expect, test } from '../../playwright';
import { buildMqttCommonLocators } from '../utils/page/locators';

const MAX_CONNECTION_TIME = 30000;
const BRU_REQ_NAME = /^mqtt-basic$/;

test.describe.serial('mqtt connection', () => {
  test('mqtt requests are visible in sidebar', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await expect(page.locator('span.item-name').filter({ hasText: BRU_REQ_NAME })).toBeVisible();
  });

  test('mqtt connects to broker', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('open mqtt request', async () => {
      await locators.sidebar.request('mqtt-basic').click();
    });

    await test.step('click connect', async () => {
      await expect(locators.connectionControls.connect()).toBeVisible({ timeout: 5000 });
      await locators.connectionControls.connect().click();
    });

    await test.step('verify connected state', async () => {
      await expect(locators.connectionControls.disconnect()).toBeAttached({
        timeout: MAX_CONNECTION_TIME
      });
    });
  });

  test('mqtt disconnects from broker', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('click disconnect', async () => {
      await locators.connectionControls.disconnect().click();
    });

    await test.step('verify disconnected state', async () => {
      await expect(locators.connectionControls.connect()).toBeVisible({
        timeout: MAX_CONNECTION_TIME
      });
    });
  });

  test('mqtt connection messages are recorded', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('verify connect and disconnect messages in response pane', async () => {
      const messages = locators.messages();
      await expect(messages.first()).toBeAttached();
      await expect(messages.count()).resolves.toBeGreaterThanOrEqual(1);
    });
  });

  test('mqtt reconnects after disconnect', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('reconnect', async () => {
      await locators.connectionControls.connect().click();
      await expect(locators.connectionControls.disconnect()).toBeAttached({
        timeout: MAX_CONNECTION_TIME
      });
    });

    await test.step('disconnect again', async () => {
      await locators.connectionControls.disconnect().click();
      await expect(locators.connectionControls.connect()).toBeVisible({
        timeout: MAX_CONNECTION_TIME
      });
    });
  });
});
