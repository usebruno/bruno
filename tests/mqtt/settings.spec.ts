import { expect, test } from '../../playwright';
import { buildMqttCommonLocators } from '../utils/page/locators';
import { selectRequestPaneTab } from '../utils/page';

const BRU_SETTINGS_REQ = 'mqtt-settings-test';
const BRU_BASIC_REQ = 'mqtt-basic';

test.describe.serial('mqtt settings tab', () => {
  test('settings tab displays protocol fields', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('open mqtt request', async () => {
      await page.locator('#sidebar-collection-name').click();
      await locators.sidebar.request('mqtt-settings-test').click();
    });

    await test.step('switch to settings tab', async () => {
      await selectRequestPaneTab(page, 'Settings');
    });

    await test.step('verify mqtt version is set to 3.1.1', async () => {
      const versionSelect = page.locator('select').filter({ has: page.locator('option[value="3.1.1"]') });
      await expect(versionSelect).toHaveValue('3.1.1');
    });

    await test.step('verify keep alive value', async () => {
      const keepAliveInput = page.locator('input[type="number"]').first();
      await expect(keepAliveInput).toHaveValue('30');
    });
  });

  test('ssl/tls section toggles correctly', async ({ pageWithUserData: page }) => {
    await test.step('verify ssl is disabled by default', async () => {
      const sslCheckbox = page.locator('label').filter({ hasText: 'Enable SSL/TLS' }).locator('input[type="checkbox"]');
      await expect(sslCheckbox).not.toBeChecked();
    });

    await test.step('enable ssl and verify cert fields appear', async () => {
      const sslCheckbox = page.locator('label').filter({ hasText: 'Enable SSL/TLS' }).locator('input[type="checkbox"]');
      await sslCheckbox.check();

      // Certificate fields should now be visible
      await expect(page.getByText('CA Certificate')).toBeVisible();
      await expect(page.getByText('Client Certificate')).toBeVisible();
      await expect(page.getByText('Client Key')).toBeVisible();
    });

    await test.step('verify validate server certificate checkbox exists', async () => {
      const validateCheckbox = page.locator('label').filter({ hasText: 'Validate server certificate' }).locator('input[type="checkbox"]');
      await expect(validateCheckbox).toBeVisible();
      await expect(validateCheckbox).toBeChecked();
    });

    await test.step('disable ssl and verify cert fields disappear', async () => {
      const sslCheckbox = page.locator('label').filter({ hasText: 'Enable SSL/TLS' }).locator('input[type="checkbox"]');
      await sslCheckbox.uncheck();

      await expect(page.getByText('CA Certificate')).not.toBeVisible();
      await expect(page.getByText('Client Certificate')).not.toBeVisible();
      await expect(page.getByText('Client Key')).not.toBeVisible();
    });
  });

  test('mqtt 5.0 properties section shows for v5', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('open basic request (v5.0)', async () => {
      await locators.sidebar.request('mqtt-basic').click();
    });

    await test.step('switch to settings tab', async () => {
      await selectRequestPaneTab(page, 'Settings');
    });

    await test.step('verify mqtt version is 5.0', async () => {
      const versionSelect = page.locator('select').filter({ has: page.locator('option[value="5.0"]') });
      await expect(versionSelect).toHaveValue('5.0');
    });

    await test.step('verify v5 properties section is visible', async () => {
      await expect(page.getByText('MQTT 5.0 Properties')).toBeVisible();
      await expect(page.getByText('Session Expiry Interval')).toBeVisible();
      await expect(page.getByText('Receive Maximum')).toBeVisible();
    });
  });

  test('mqtt 5.0 properties hidden for v3.1.1', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('open settings request (v3.1.1)', async () => {
      await locators.sidebar.request('mqtt-settings-test').click();
    });

    await test.step('switch to settings tab', async () => {
      await selectRequestPaneTab(page, 'Settings');
    });

    await test.step('verify v5 properties section is not visible', async () => {
      await expect(page.getByText('MQTT 5.0 Properties')).not.toBeVisible();
    });
  });
});
