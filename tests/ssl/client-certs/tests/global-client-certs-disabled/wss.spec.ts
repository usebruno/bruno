import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, resetWsResponse } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'global-client-certs-disabled';

// The global client certificate in Preferences carries `disabled: true`, so Bruno
// withholds it over WSS. The WebSocket upgrade fails the mTLS handshake — the connection
// never reaches CONNECTED and an error entry appears in the message list.
test.describe('wss with global client certificate (disabled)', () => {
  // tests in this file share one app instance — hand the next test a closed connection and an empty message list
  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetWsResponse(page);
  });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
      const locators = buildCommonLocators(page).websocket;

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'wss-request');

      await test.step('Connect and assert the handshake is rejected', async () => {
        await locators.connectionControls.connect().click();
        await expect(locators.errorMessage()).toBeVisible({ timeout: 30000 });
        await expect(locators.connectionControls.disconnect()).toHaveCount(0);
      });
    });
  }
});
