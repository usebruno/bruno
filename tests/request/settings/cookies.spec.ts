import { test } from '../../../playwright';
import {
  expectCookieSetting,
  openRequestFromSettingsCollection,
  openRequestSettings,
  openRequestSettingsCollection,
  sendRequestAndExpectStatus,
  toggleCookieSetting
} from '../../utils/page';

test.describe('Per-request Cookie Settings Tests', () => {
  test('controls automatic cookie storage and sending independently', async ({
    pageWithUserData: page
  }) => {
    await openRequestSettingsCollection(page, 'settings-test');

    await test.step('Do not store response cookies when automatic storage is disabled', async () => {
      await openRequestSettings(page, 'cookie-login');
      await expectCookieSetting(page, 'store', false);
      await sendRequestAndExpectStatus(page, '200');

      await openRequestFromSettingsCollection(page, 'cookie-protected');
      await sendRequestAndExpectStatus(page, '401');
    });

    await test.step('Store response cookies when automatic storage is enabled', async () => {
      await openRequestSettings(page, 'cookie-login');
      await toggleCookieSetting(page, 'store');
      await expectCookieSetting(page, 'store', true);
      await sendRequestAndExpectStatus(page, '200');

      await openRequestFromSettingsCollection(page, 'cookie-protected');
      await sendRequestAndExpectStatus(page, '200');
    });

    await test.step('Do not send stored cookies when automatic sending is disabled', async () => {
      await openRequestSettings(page, 'cookie-protected');
      await expectCookieSetting(page, 'send', true);
      await toggleCookieSetting(page, 'send');
      await expectCookieSetting(page, 'send', false);
      await sendRequestAndExpectStatus(page, '401');
    });
  });
});
