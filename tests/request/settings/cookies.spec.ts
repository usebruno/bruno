import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  openRequestFromSettingsCollection,
  openRequestSettings,
  openRequestSettingsCollection,
  sendRequestFromSettings,
  toggleCookieSetting
} from '../../utils/page';

test.describe('Per-request Cookie Settings Tests', () => {
  test('controls automatic cookie storage and sending independently', async ({
    pageWithUserData: page
  }) => {
    const { requestSettings } = buildCommonLocators(page);
    await openRequestSettingsCollection(page, 'settings-test');

    await test.step('Do not store response cookies when automatic storage is disabled', async () => {
      await openRequestSettings(page, 'cookie-login');
      await expect(requestSettings.storeCookiesToggle()).not.toBeChecked();
      await sendRequestFromSettings(page);
      await expect(requestSettings.responseStatus()).toContainText('200', { timeout: 15000 });

      await openRequestFromSettingsCollection(page, 'cookie-protected');
      await sendRequestFromSettings(page);
      await expect(requestSettings.responseStatus()).toContainText('401', { timeout: 15000 });
    });

    await test.step('Store response cookies when automatic storage is enabled', async () => {
      await openRequestSettings(page, 'cookie-login');
      await toggleCookieSetting(page, 'store');
      await expect(requestSettings.storeCookiesToggle()).toBeChecked();
      await sendRequestFromSettings(page);
      await expect(requestSettings.responseStatus()).toContainText('200', { timeout: 15000 });

      await openRequestFromSettingsCollection(page, 'cookie-protected');
      await sendRequestFromSettings(page);
      await expect(requestSettings.responseStatus()).toContainText('200', { timeout: 15000 });
    });

    await test.step('Do not send stored cookies when automatic sending is disabled', async () => {
      await openRequestSettings(page, 'cookie-protected');
      await expect(requestSettings.sendCookiesToggle()).toBeChecked();
      await toggleCookieSetting(page, 'send');
      await expect(requestSettings.sendCookiesToggle()).not.toBeChecked();
      await sendRequestFromSettings(page);
      await expect(requestSettings.responseStatus()).toContainText('401', { timeout: 15000 });
    });
  });
});
