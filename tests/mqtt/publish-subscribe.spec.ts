import { expect, test } from '../../playwright';
import { buildMqttCommonLocators } from '../utils/page/locators';

const MAX_CONNECTION_TIME = 30000;
const MESSAGE_TIMEOUT = 15000;

test.describe.serial('mqtt publish and subscribe', () => {
  test('connect and verify subscription auto-subscribes', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('open mqtt request', async () => {
      await page.locator('#sidebar-collection-name').click();
      await locators.sidebar.request('mqtt-basic').click();
    });

    await test.step('connect to broker', async () => {
      await expect(locators.connectionControls.connect()).toBeVisible({ timeout: 5000 });
      await locators.connectionControls.connect().click();
      await expect(locators.connectionControls.disconnect()).toBeAttached({
        timeout: MAX_CONNECTION_TIME
      });
    });

    await test.step('verify subscription ack in messages', async () => {
      // The fixture has an enabled subscription, which auto-subscribes on connect
      const messages = locators.messages();
      await expect(messages.first()).toBeAttached({ timeout: MESSAGE_TIMEOUT });
    });
  });

  test('disconnect after pub/sub test', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await locators.connectionControls.disconnect().click();
    await expect(locators.connectionControls.connect()).toBeVisible({
      timeout: MAX_CONNECTION_TIME
    });
  });
});
