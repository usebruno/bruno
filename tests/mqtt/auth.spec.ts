import { expect, test } from '../../playwright';
import { buildMqttCommonLocators } from '../utils/page/locators';
import { selectRequestPaneTab } from '../utils/page';

test.describe.serial('mqtt auth tab', () => {
  test('auth tab displays saved credentials', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);

    await test.step('open mqtt request with auth', async () => {
      await page.locator('#sidebar-collection-name').click();
      await locators.sidebar.request('mqtt-with-auth').click();
    });

    await test.step('switch to auth tab', async () => {
      await selectRequestPaneTab(page, 'Auth');
    });

    await test.step('verify client id is populated', async () => {
      await expect(locators.auth.clientIdInput()).toHaveValue('bruno-e2e-auth-test');
    });

    await test.step('verify username is populated', async () => {
      await expect(locators.auth.usernameInput()).toHaveValue('test-user');
    });

    await test.step('verify password is populated', async () => {
      await expect(locators.auth.passwordInput()).toHaveValue('test-pass');
    });
  });

  test('auth tab fields are editable', async ({ pageWithUserData: page }) => {
    const locators = buildMqttCommonLocators(page);
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await test.step('update client id', async () => {
      await locators.auth.clientIdInput().click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('new-client-id');
      await expect(locators.auth.clientIdInput()).toHaveValue('new-client-id');
    });

    await test.step('update username', async () => {
      await locators.auth.usernameInput().click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('new-username');
      await expect(locators.auth.usernameInput()).toHaveValue('new-username');
    });

    await test.step('update password', async () => {
      await locators.auth.passwordInput().click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('new-password');
      await expect(locators.auth.passwordInput()).toHaveValue('new-password');
    });
  });
});
